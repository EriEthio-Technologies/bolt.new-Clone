import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { createScopedLogger } from '~/utils/logger';
import { AppError } from '~/utils/ErrorHandler';

const logger = createScopedLogger('RateLimit');

const RATE_LIMIT_WINDOW = 60; // 1 minute
const MAX_REQUESTS = 100; // Maximum requests per window

class RateLimiter {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async isRateLimited(ip: string): Promise<boolean> {
    const key = `rate_limit:${ip}`;
    
    try {
      const requests = await this.redis.incr(key);
      
      if (requests === 1) {
        await this.redis.expire(key, RATE_LIMIT_WINDOW);
      }
      
      return requests > MAX_REQUESTS;
    } catch (error) {
      logger.error('Rate limit check failed:', error);
      return false; // Fail open if Redis is unavailable
    }
  }
}

const rateLimiter = new RateLimiter();

export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  try {
    const isLimited = await rateLimiter.isRateLimited(ip);
    
    if (isLimited) {
      throw new AppError(429, 'Too many requests. Please try again later.');
    }
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('Rate limit middleware error:', error);
      next(new AppError(500, 'Internal server error'));
    }
  }
};