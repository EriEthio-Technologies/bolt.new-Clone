# Rate Limiting Implementation

This directory contains the rate limiting implementation using Redis as the backing store for distributed rate limiting.

## Components

- `rateLimit.ts` - Main rate limiting middleware and RateLimiter class
- `redisRateLimit.ts` - Redis-based rate limiting implementation
- `errors/RateLimitError.ts` - Custom error for rate limit exceeded
- `utils/rateLimitHelpers.ts` - Utility functions for Redis connection management

## Usage

The rate limiting middleware can be applied to any route:

```typescript
import { rateLimitMiddleware } from './middleware/rateLimit';

// Apply rate limiting
app.use(rateLimitMiddleware);
```

## Configuration

Rate limits are configured based on authentication status:
- Authenticated requests (with API key): 100 requests per 15 minutes
- Unauthenticated requests: 100 requests per 15 minutes per IP

## Headers

The following headers are included in responses:
- `X-RateLimit-Limit`: The maximum number of requests allowed per window
- `X-RateLimit-Remaining`: The number of requests remaining in the current window
- `X-RateLimit-Reset`: The time when the rate limit window resets (Unix timestamp)
- `Retry-After`: The number of seconds until requests may resume (only on 429 responses)

## Error Handling

When rate limit is exceeded, the middleware throws a `RateLimitError` with a 429 status code.