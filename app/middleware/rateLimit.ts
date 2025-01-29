import { rateLimit } from 'express-rate-limit';
import { validateEnv } from '~/config/env.server';
import { RateLimitError } from '~/errors/RateLimitError';

const env = validateEnv();

export const rateLimitMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes default
  max: env.RATE_LIMIT_MAX_REQUESTS || 100, // 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  message: 'Too many requests, please try again later',
  handler: (req, res, next) => {
    // Record rate limit hit in metrics
    const { MetricsService } = require('~/services/MetricsService');
    MetricsService.recordRateLimit(req.path);
    next(new RateLimitError('Rate limit exceeded'));
  },
  skip: (req) => {
    // Skip rate limiting for health checks and internal requests
    return req.path === '/health' || req.ip === '127.0.0.1';
  },
  keyGenerator: (req) => {
    // Use IP and optional API key for rate limiting
    return req.headers['x-api-key'] || req.ip;
  },
  // Advanced options
  skipSuccessfulRequests: false, // Count successful requests against limit
  skipFailedRequests: false,     // Count failed requests against limit
  requestWasSuccessful: (req, res) => res.statusCode < 400, // Define what constitutes a successful request
  
  // Use trusted headers for rate limiting behind proxy
  keyGenerator: (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp = Array.isArray(forwardedFor) 
      ? forwardedFor[0] 
      : (forwardedFor?.split(',')[0] || req.ip);
    return `${clientIp}:${req.headers['x-api-key'] || ''}`;
  },
  skip: (req) => {
    // Skip rate limiting for certain routes if needed
    return req.path.startsWith('/public');
  }
}); 