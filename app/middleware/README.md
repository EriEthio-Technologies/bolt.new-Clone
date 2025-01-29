# Middleware Documentation

## Rate Limiting

The rate limiting middleware (`RateLimit.ts`) provides protection against brute force attacks and DoS attempts by limiting the number of requests from a single IP address.

### Features:
- Configurable time window and request limits
- Monitoring integration for alerts
- Error handling with AppError
- Health check endpoint exclusions
- Standard rate limit headers
- Redis storage support (optional)

### Configuration:
Rate limiting settings can be adjusted in `config/security.ts`:
```typescript
rateLimiting: {
  enabled: true,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
}
```

### Monitoring:
The middleware emits the following alerts:
- `rateLimitExceeded`: When a client exceeds their rate limit
- `rateLimitError`: When an error occurs in the rate limiting system

### Usage:
```typescript
import rateLimiter from './middleware/RateLimit';
app.use(rateLimiter);
```