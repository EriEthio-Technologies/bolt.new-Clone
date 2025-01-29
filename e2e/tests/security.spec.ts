import { test, expect } from '@playwright/test';

test.describe('Security Measures', () => {
  test('should enforce CORS policy', async ({ request }) => {
    const response = await request.get('/api/test', {
      headers: {
        'Origin': 'http://malicious-site.com'
      }
    });
    
    expect(response.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('should require authentication for protected endpoints', async ({ request }) => {
    const response = await request.get('/api/protected');
    expect(response.status()).toBe(401);
  });

  test('should validate JWT tokens', async ({ request }) => {
    const invalidToken = 'invalid-jwt-token';
    const response = await request.get('/api/protected', {
      headers: {
        'Authorization': `Bearer ${invalidToken}`
      }
    });
    expect(response.status()).toBe(401);
  });

  test('should enforce rate limits', async ({ request }) => {
    const responses = await Promise.all(
      Array(150).fill(0).map(() => request.get('/api/test'))
    );
    
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });

  test('should validate content security policy', async ({ request }) => {
    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
  });

  test('should set secure cookie attributes', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        username: 'test@example.com',
        password: 'password123'
      }
    });
    
    const cookies = response.headers()['set-cookie'];
    expect(cookies).toContain('Secure');
    expect(cookies).toContain('HttpOnly');
    expect(cookies).toContain('SameSite=Strict');
  });
});