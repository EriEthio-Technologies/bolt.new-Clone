import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '../rateLimit';
import { RedisRateLimiter } from '../redisRateLimit';

vi.mock('../redisRateLimit');

describe('RateLimiter', () => {
  const config = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  };

  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(config, 'unauthenticated');
  });

  test('should properly limit requests based on IP', async () => {
    const mockRequest = new Request('http://example.com', {
      headers: {
        'cf-connecting-ip': '192.168.1.1'
      }
    });

    // First request should be allowed
    await rateLimiter.checkRateLimit(mockRequest);
    
    // Simulate max requests reached
    vi.mocked(RedisRateLimiter.prototype.increment).mockResolvedValueOnce({
      isAllowed: false,
      remaining: 0
    });

    // Next request should throw
    await expect(rateLimiter.checkRateLimit(mockRequest)).rejects.toThrow();
  });

  test('should handle authenticated requests differently', async () => {
    const rateLimiter = new RateLimiter(config, 'authenticated');
    const mockRequest = new Request('http://example.com', {
      headers: {
        'x-api-key': 'test-api-key'
      }
    });

    await rateLimiter.checkRateLimit(mockRequest);
    expect(RedisRateLimiter.prototype.increment).toHaveBeenCalledWith('test-api-key');
  });
});