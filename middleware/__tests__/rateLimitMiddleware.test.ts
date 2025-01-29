import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { rateLimitMiddleware } from '../rateLimit';
import { RedisRateLimiter } from '../redisRateLimit';
import { RateLimitError } from '../errors/RateLimitError';

vi.mock('../redisRateLimit');

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should skip rate limiting for health checks', async () => {
    const request = new Request('https://api.example.com/health');
    await expect(rateLimitMiddleware(request)).resolves.toBeUndefined();
  });

  test('should skip rate limiting for localhost', async () => {
    const request = new Request('https://api.example.com/test', {
      headers: { host: 'localhost:3000' }
    });
    await expect(rateLimitMiddleware(request)).resolves.toBeUndefined();
  });

  test('should apply rate limiting for normal requests', async () => {
    const request = new Request('https://api.example.com/test');
    await expect(rateLimitMiddleware(request)).resolves.toBeUndefined();
  });

  test('should throw RateLimitError when limit exceeded', async () => {
    const request = new Request('https://api.example.com/test');
    vi.mocked(RedisRateLimiter.prototype.increment).mockResolvedValueOnce({
      isAllowed: false,
      remaining: 0
    });
    
    await expect(rateLimitMiddleware(request)).rejects.toThrow(RateLimitError);
  });
});