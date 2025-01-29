import type { CacheConfig } from './index';

export const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  compressionThreshold: 1024, // 1KB
  defaultTTL: 3600, // 1 hour
  maxMemoryItems: 10000,
  warmupEnabled: true
};

export const REDIS_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 3000,
  maxPoolSize: 10
};