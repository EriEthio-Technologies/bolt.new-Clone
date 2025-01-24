import { vi } from 'vitest'

// Mock environment variables
process.env.GCP_PROJECT_ID = 'test-project'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.APP_VERSION = '1.0.0'

// Mock Redis
vi.mock('ioredis', () => {
    return {
        Redis: vi.fn().mockImplementation(() => ({
            set: vi.fn().mockResolvedValue('OK'),
            get: vi.fn().mockResolvedValue(null),
            del: vi.fn().mockResolvedValue(1),
            quit: vi.fn().mockResolvedValue(true),
        })),
    }
})

// Mock Rate Limiter
vi.mock('limiter', () => {
    return {
        RateLimiter: vi.fn().mockImplementation(() => ({
            removeTokens: vi.fn().mockResolvedValue(1),
        })),
    }
}) 