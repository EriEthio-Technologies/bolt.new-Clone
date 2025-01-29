import { MetricsService } from '~/services/MetricsService';
import { CacheError, CacheSerializationError, CacheOperationError } from './errors';
import { trackCacheOperation, trackCacheSize } from '~/lib/cache/monitoring';
import { RedisClient } from '~/lib/cache/redis-client';
import { compress, decompress, shouldCompress } from '~/lib/cache/compression';

export interface CacheConfig {
  compressionThreshold?: number;
  defaultTTL?: number;
  maxMemoryItems?: number;
  warmupEnabled?: boolean;
}

export class CacheService {
  private static readonly DEFAULT_CONFIG: Required<CacheConfig> = {
    compressionThreshold: 1024, // 1KB
    defaultTTL: 3600, // 1 hour
    maxMemoryItems: 10000,
    warmupEnabled: true
  };
  private readonly config: Required<CacheConfig>;
  private cleanup: (() => void)[] = [];
  
  private readonly redisClient: RedisClient;

  constructor(
    private readonly memoryCache: LRUCache<string, any>,
    config?: CacheConfig
  ) {
    this.config = { ...CacheService.DEFAULT_CONFIG, ...config };
    this.redisClient = RedisClient.getInstance();
    
    if (this.config.warmupEnabled) {
      this.warmCache();
    }
    
    // Start monitoring cache size
    const sizeMonitorInterval = setInterval(() => {
      trackCacheSize(this.memoryCache.size, this.getRedisSize());
    }, 60000);
    
    this.cleanup.push(() => clearInterval(sizeMonitorInterval));
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const startTime = Date.now();
    try {
      if (!key) {
        throw new CacheOperationError('Cache key is required');
      }

      const serialized = this.serialize(value);
      await this.redisClient.set(key, serialized, { 
        ex: ttl || this.config.defaultTTL 
      });
      this.memoryCache.set(key, value);
      trackCacheOperation('set', true, Date.now() - startTime);
    } catch (error) {
      trackCacheOperation('set', false, Date.now() - startTime);
      throw new CacheOperationError('Failed to set cache value', { error });
    }
  }

  async delete(key: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.redisClient.del(key);
      this.memoryCache.delete(key);
      trackCacheOperation('delete', true, Date.now() - startTime);
    } catch (error) {
      trackCacheOperation('delete', false, Date.now() - startTime);
      throw new CacheOperationError('Failed to delete cache value', { error });
    }
  }

  async clear(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.redisClient.flushall();
      this.memoryCache.clear();
      trackCacheOperation('clear', true, Date.now() - startTime);
    } catch (error) {
      trackCacheOperation('clear', false, Date.now() - startTime);
      throw new CacheOperationError('Failed to clear cache', { error });
    }
  }

  private async incrementKeyAccess(key: string): Promise<void> {
    try {
      const pipeline = this.redisClient.pipeline();
      pipeline.zincrby('frequently-accessed-keys', 1, key);
      pipeline.zremrangebyrank('frequently-accessed-keys', 0, -1001); // Keep top 1000
      await pipeline.exec();
    } catch (error) {
      // Log but don't fail - this is not critical
      console.warn('Failed to track key access:', error);
    }
  }

  private async warmCache(): Promise<void> {
    const startTime = Date.now();
    try {
      const frequentKeys = await this.redisClient.get('frequently-accessed-keys');
      await Promise.all(
        frequentKeys.map(async (key) => {
          const value = await this.redisClient.get(key);
          if (value) {
            this.memoryCache.set(key, this.deserialize(value));
          }
        })
      );
    } catch (error) {
      MetricsService.recordRequest('CACHE', 'warmup', 500, Date.now() - startTime);
      console.error('Cache warming failed:', error);
    }
  }

  private serialize(value: any): string {
    const stringified = JSON.stringify(value);
    if (shouldCompress(stringified, this.config.compressionThreshold)) {
      return `compressed:${compress(stringified)}`;
    }
    return stringified;
  }

  private deserialize(value: string): any {
    const startTime = Date.now();
    try {
      if (value.startsWith('compressed:')) {
        const compressed = value.slice('compressed:'.length);
        const result = JSON.parse(decompress(compressed));
        trackCacheOperation('deserialize', true, Date.now() - startTime);
        return result;
      }
      const result = JSON.parse(value);
      trackCacheOperation('deserialize', true, Date.now() - startTime);
      return result;
    } catch (error) {
      trackCacheOperation('deserialize', false, Date.now() - startTime);
      throw new CacheSerializationError('Failed to deserialize cache value', { error });
    }
  }

  private async getRedisSize(): Promise<number> {
    try {
      const info = await this.redisClient.info();
      return parseInt(info.keyspace?.[0]?.keys || '0', 10);
    } catch {
      return 0;
    }
  }

  public cleanup(): void {
    this.cleanup.forEach(cleanup => cleanup());
    this.cleanup = [];
    this.memoryCache.clear();
    
    // Cleanup redis client and connections
    if (this.redisClient) {
      // Note: RedisClient handles its own cleanup internally
      this.redisClient.quit();
    }
  }

  async getCachedResponse(key: string): Promise<CachedData | null> {
    const startTime = Date.now();
    try {
      if (!key) {
        throw new CacheOperationError('Cache key is required');
      }
      
      // Try memory cache first  
      const memoryCached = this.memoryCache.get(key);
      if (memoryCached) {
      await this.incrementKeyAccess(key);
      trackCacheOperation('get.memory', true, Date.now() - startTime);
      return memoryCached;
    }

    // Fall back to Redis
      const redisCached = await this.redisClient.get(key);
      if (redisCached) {
      try {
        const value = this.deserialize(redisCached);
        this.memoryCache.set(key, value);
        await this.incrementKeyAccess(key);
        trackCacheOperation('get.redis', true, Date.now() - startTime);
        return value;
      } catch (error) {
        trackCacheOperation('get.redis', false, Date.now() - startTime);
        throw new CacheOperationError('Failed to process Redis cache value', { error });
      }
    }

    trackCacheOperation('get.miss', true, Date.now() - startTime);
      return null;
    } catch (error) {
      if (error instanceof CacheError) {
        throw error;
      }
      trackCacheOperation('get', false, Date.now() - startTime);
      throw new CacheOperationError('Cache operation failed', { error });
    }
    // Implement multi-level caching
  }
} 