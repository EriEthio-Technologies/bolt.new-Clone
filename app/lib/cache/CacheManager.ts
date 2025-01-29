import { MonitoringService } from '../../services/monitoring.server';
import { AppError } from '../../utils/errorHandler';
import { RedisClient } from '../redis/RedisClient';
import LRUCache from 'lru-cache';

export class CacheManager {
  private static instance: CacheManager;
  private readonly monitoring: MonitoringService;
  private readonly redis: RedisClient;
  private readonly memoryCache: LRUCache<string, any>;

  private constructor() {
    this.monitoring = MonitoringService.getInstance();
    this.redis = RedisClient.getInstance();
    this.memoryCache = new LRUCache({
      max: 500, // Maximum number of items
      maxAge: 1000 * 60 * 60, // Items live for 1 hour
    });
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  public async get(key: string): Promise<any | null> {
    try {
      // Try memory cache first
      const memoryResult = this.memoryCache.get(key);
      if (memoryResult) {
        this.monitoring.emitAlert('cacheHit', { type: 'memory', key });
        return memoryResult;
      }

      // Try Redis cache
      const redisResult = await this.redis.get(key);
      if (redisResult) {
        // Cache in memory for next time
        this.memoryCache.set(key, redisResult);
        this.monitoring.emitAlert('cacheHit', { type: 'redis', key });
        return redisResult;
      }

      this.monitoring.emitAlert('cacheMiss', { key });
      return null;
    } catch (error) {
      this.handleError('Cache retrieval failed', error);
      return null;
    }
  }

  public async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      // Set in both caches
      this.memoryCache.set(key, value, ttl);
      await this.redis.set(key, value, ttl);
      
      this.monitoring.emitAlert('cacheSet', { key, ttl });
    } catch (error) {
      this.handleError('Cache set operation failed', error);
    }
  }

  public async invalidate(key: string): Promise<void> {
    try {
      this.memoryCache.del(key);
      await this.redis.del(key);
      
      this.monitoring.emitAlert('cacheInvalidate', { key });
    } catch (error) {
      this.handleError('Cache invalidation failed', error);
    }
  }

  public async clear(): Promise<void> {
    try {
      this.memoryCache.reset();
      await this.redis.flushAll();
      
      this.monitoring.emitAlert('cacheClear', { timestamp: new Date().toISOString() });
    } catch (error) {
      this.handleError('Cache clear operation failed', error);
    }
  }

  private handleError(message: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.monitoring.emitAlert('cacheError', { message, error: errorMessage });
    throw new AppError(500, `${message}: ${errorMessage}`);
  }
}

export default CacheManager.getInstance();