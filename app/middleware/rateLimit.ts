import { rateLimit } from 'express-rate-limit';
import { validateEnv } from '~/config/env.server';
import { RateLimitError } from '~/errors/RateLimitError';

const env = validateEnv();

export const rateLimitMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new RateLimitError('Too many requests');
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For header when behind proxy
    return req.ip || req.headers['x-forwarded-for'] as string;
  },
  skip: (req) => {
    // Skip rate limiting for certain routes if needed
    return req.path.startsWith('/public');
  }
}); 