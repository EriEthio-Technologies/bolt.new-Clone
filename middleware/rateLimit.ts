import { validateEnv } from '~/config/env.server';
import { getRateLimitState, setRateLimitState } from './rateLimitCache';
import { RateLimitError } from '~/errors/RateLimitError';
import type { MetricsService } from '~/services/MetricsService';

const env = validateEnv();

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

class RateLimiter {
  constructor(
    private config: RateLimitConfig,
    private type: 'authenticated' | 'unauthenticated',
    private context: { env: { RATE_LIMIT_STORE: KVNamespace } }
  ) {}

  private getKey(request: Request): string {
    if (this.type === 'authenticated') {
      return `rate_limit:auth:${request.headers.get('x-api-key')}`;
    }
    return `rate_limit:unauth:${request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '0.0.0.0'}`;
  }

  async checkRateLimit(request: Request): Promise<void> {
    const key = this.getKey(request);
    const now = Date.now();

    // Get state from cache or KV store
    const state: RateLimitState = await getRateLimitState(key, this.context.env.RATE_LIMIT_STORE) || {
      count: 0,
      resetTime: now + this.config.windowMs
    };

    // Reset if window has passed
    if (now > state.resetTime) {
      state.count = 0;
      state.resetTime = now + this.config.windowMs;
    }

    if (state.count >= this.config.max) {
      const { MetricsService } = require('~/services/MetricsService') as { MetricsService: MetricsService };
      MetricsService.recordRateLimit(new URL(request.url).pathname, this.type);
      throw new RateLimitError(`API rate limit exceeded for ${this.type} requests`);
    }

    // Increment counter and store with optimized caching
    state.count++;
    await setRateLimitState(
      key,
      state,
      this.context.env.RATE_LIMIT_STORE,
      Math.ceil(this.config.windowMs / 1000)
    );

    // Set rate limit headers
    const headers = new Headers();
    headers.set('RateLimit-Limit', this.config.max.toString());
    headers.set('RateLimit-Remaining', (this.config.max - state.count).toString());
    headers.set('RateLimit-Reset', Math.ceil(state.resetTime / 1000).toString());
    
    Object.entries(headers).forEach(([key, value]) => {
      request.headers.set(key, value);
    });
  }
}

const authenticatedLimiter = (context: { env: { RATE_LIMIT_STORE: KVNamespace } }) => new RateLimiter(
  {
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000, // 1 hour default
    max: env.AUTH_RATE_LIMIT_MAX_REQUESTS || 1000 // 1000 requests per hour
  },
  'authenticated',
  context
);

const unauthenticatedLimiter = (context: { env: { RATE_LIMIT_STORE: KVNamespace } }) => new RateLimiter(
  {
    windowMs: env.UNAUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes default
    max: env.UNAUTH_RATE_LIMIT_MAX_REQUESTS || 50 // 50 requests per 15 minutes
  },
  'unauthenticated',
  context
);

// Middleware function compatible with Cloudflare Workers
export async function rateLimitMiddleware(request: Request, context?: { env: { RATE_LIMIT_STORE: KVNamespace } }): Promise<void> {
  if (!context?.env?.RATE_LIMIT_STORE) {
    console.warn('Rate limiting disabled: KV store not configured');
    return;
  }

  // Skip rate limiting for health checks and local requests
  const url = new URL(request.url);
  if (url.pathname === '/health' || request.headers.get('cf-connecting-ip') === '127.0.0.1') {
    return;
  }

  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    await authenticatedLimiter(context).checkRateLimit(request);
  } else {
    await unauthenticatedLimiter(context).checkRateLimit(request);
  }
}