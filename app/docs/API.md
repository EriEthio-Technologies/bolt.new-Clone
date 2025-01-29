# API Documentation

## Overview
This document provides information about the API endpoints and their usage.

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

## Rate Limiting
- Default: 100 requests per 15 minutes
- Health check endpoints are not rate limited
- Rate limit info is returned in response headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Security Headers
All responses include the following security headers:
- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security
- Referrer-Policy

## Endpoints

### Authentication
```
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

### Documents
```
GET /api/documents
POST /api/documents/validate
POST /api/documents/process
GET /api/documents/{id}
```

### Health Check
```
GET /health
```

## Error Responses
All error responses follow this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

## Rate Limit Error
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "details": {
      "resetTime": "ISO date string"
    }
  }
}
```

## Monitoring
All endpoints are monitored for:
- Response time
- Error rates
- Request volume
- Status codes distribution

For detailed metrics, consult the monitoring dashboard.