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
  private redisLimiter: RedisRateLimiter;
  
  constructor(
    private config: RateLimitConfig,
    private type: 'authenticated' | 'unauthenticated'
  ) {
    this.redisLimiter = new RedisRateLimiter({
      windowMs: config.windowMs,
      max: config.max,
      keyPrefix: `rate_limit:${type}:`
    });
  }

  private getIdentifier(request: Request): string {
    if (this.type === 'authenticated') {
      return request.headers.get('x-api-key') || 'anonymous';
    }
    return request.headers.get('cf-connecting-ip') || 
           request.headers.get('x-forwarded-for') || 
           '0.0.0.0';
  }

  private async shouldBypassRateLimit(request: Request): Promise<boolean> {
    // Bypass for internal services
    if (request.headers.get('x-internal-service') === process.env.INTERNAL_SERVICE_KEY) {
      return true;
    }
    
    // Bypass for admin roles
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = await verify(token, process.env.JWT_SECRET!);
        if (decoded.role === 'admin') {
          return true;
        }
      } catch (e) {
        // Invalid token, continue with rate limiting
      }
    }
    
    // Bypass for whitelisted IPs
    const clientIP = request.headers.get('cf-connecting-ip') || 
                    request.headers.get('x-forwarded-for') || 
                    '0.0.0.0';
    const whitelistedIPs = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
    if (whitelistedIPs.includes(clientIP)) {
      return true;
    }
    
    return false;
  }

  async checkRateLimit(request: Request): Promise<void> {
    // Check for rate limit bypass
    if (await this.shouldBypassRateLimit(request)) {
      return;
    }

    const identifier = this.getIdentifier(request);
    const result = await this.redisLimiter.increment(identifier);
    
    if (!result.isAllowed) {
      const resetTime = Date.now() + this.config.windowMs;
      const headers = new Headers({
        'X-RateLimit-Limit': this.config.max.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        'Retry-After': Math.ceil(this.config.windowMs / 1000).toString()
      });
      
      throw new RateLimitError('Rate limit exceeded', headers);
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
export async function rateLimitMiddleware(request: Request): Promise<void> {
  // Skip rate limiting for health checks and local requests
  if (request.url.includes('/health') || request.headers.get('host')?.includes('localhost')) {
    return;
  }

  try {
    const limiter = new RateLimiter(
      {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
      },
      request.headers.get('x-api-key') ? 'authenticated' : 'unauthenticated'
    );
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