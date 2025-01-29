import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedisRateLimiter } from '../redisRateLimit';
import { Redis } from 'ioredis';

vi.mock('ioredis');

describe('RedisRateLimiter', () => {
  let limiter: RedisRateLimiter;
  
  beforeEach(() => {
    vi.clearAllMocks();
    limiter = new RedisRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 100
    });
  });

  test('increment should track requests within time window', async () => {
    const identifier = 'test-user';
    const result = await limiter.increment(identifier);
    
    expect(result.isAllowed).toBe(true);
    expect(result.remaining).toBe(99);
  });

  test('increment should block requests when limit exceeded', async () => {
    const identifier = 'test-user';
    
    // Simulate hitting the limit
    for (let i = 0; i < 100; i++) {
      await limiter.increment(identifier);
    }
    
    const result = await limiter.increment(identifier);
    expect(result.isAllowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});