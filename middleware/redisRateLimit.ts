import { Redis } from 'ioredis';
import { validateEnv } from '~/config/env.server';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

export class RedisRateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'rl:',
      ...config,
    };
    
    const { REDIS_URL } = validateEnv();
    this.redis = getRedisClient();
  }

  private getKey(identifier: string): string {
    return `${this.config.keyPrefix}${identifier}`;
  }

  async increment(identifier: string): Promise<{ isAllowed: boolean; remaining: number }> {
    const key = this.getKey(identifier);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const multi = this.redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now, `${now}`);
    multi.zcard(key);
    multi.expire(key, Math.ceil(this.config.windowMs / 1000));

    const [, , count] = await multi.exec();
    const currentCount = count?.[1] as number;
    
    return {
      isAllowed: currentCount <= this.config.max,
      remaining: Math.max(0, this.config.max - currentCount)
    };
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}