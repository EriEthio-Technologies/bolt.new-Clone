import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser } from '../helpers/user';

test.describe('Rate Limiting', () => {
  let apiKey: string;

  test.beforeAll(async () => {
    const user = await createTestUser();
    apiKey = user.apiKey;
  });

  test.afterAll(async () => {
    await deleteTestUser();
  });

  test('should enforce rate limits for unauthenticated requests', async ({ request }) => {
    const maxRequests = 100;
    const responses = await Promise.all(
      Array(maxRequests + 1).fill(0).map(() =>
        request.get('/api/test', {
          headers: {
            'x-forwarded-for': '192.168.1.1'
          }
        })
      )
    );

    const successfulRequests = responses.filter(r => r.ok()).length;
    const rateLimitedRequests = responses.filter(r => r.status() === 429).length;

    expect(successfulRequests).toBe(maxRequests);
    expect(rateLimitedRequests).toBe(1);
  });

  test('should enforce different limits for authenticated requests', async ({ request }) => {
    const maxRequests = 1000;
    const responses = await Promise.all(
      Array(maxRequests + 1).fill(0).map(() =>
        request.get('/api/test', {
          headers: {
            'x-api-key': apiKey
          }
        })
      )
    );

    const successfulRequests = responses.filter(r => r.ok()).length;
    expect(successfulRequests).toBe(maxRequests);
  });

  test('should bypass rate limits for whitelisted IPs', async ({ request }) => {
    const whitelistedIP = '10.0.0.1';
    process.env.RATE_LIMIT_WHITELIST = whitelistedIP;

    const responses = await Promise.all(
      Array(150).fill(0).map(() =>
        request.get('/api/test', {
          headers: {
            'x-forwarded-for': whitelistedIP
          }
        })
      )
    );

    const successfulRequests = responses.filter(r => r.ok()).length;
    expect(successfulRequests).toBe(150);
  });

  test('should bypass rate limits for admin users', async ({ request }) => {
    const adminToken = 'admin-jwt-token'; // Create actual admin JWT token
    
    const responses = await Promise.all(
      Array(150).fill(0).map(() =>
        request.get('/api/test', {
          headers: {
            'authorization': `Bearer ${adminToken}`
          }
        })
      )
    );

    const successfulRequests = responses.filter(r => r.ok()).length;
    expect(successfulRequests).toBe(150);
  });
});