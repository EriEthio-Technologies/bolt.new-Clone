import { Service } from 'typedi';
import { Redis } from 'ioredis';
import { DatabaseService } from '../database/DatabaseService';
import { ProcessingError } from '~/errors/ProcessingError';
import type { CacheConfig, CacheStats } from '~/types/cache';

@Service()
export class CacheService {
  private redis: Redis;
  private readonly config: CacheConfig = {
    defaultTTL: 3600, // 1 hour
    maxKeys: 10000,
    compressionThreshold: 1024 // 1KB
  };

  constructor(private readonly dbService: DatabaseService) {
    this.redis = dbService.getRedisConnection();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      return this.deserialize<T>(data);
    } catch (error) {
      throw new ProcessingError('Cache retrieval failed', error);
    }
  }

  async set(
    key: string,
    value: any,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<void> {
    try {
      const serialized = this.serialize(value);
      const ttl = options.ttl || this.config.defaultTTL;

      await this.redis
        .multi()
        .set(key, serialized, 'EX', ttl)
        .sadd(`cache:keys`, key)
        .exec();

      if (options.tags?.length) {
        await Promise.all(
          options.tags.map(tag =>
            this.redis.sadd(`cache:tags:${tag}`, key)
          )
        );
      }
    } catch (error) {
      throw new ProcessingError('Cache storage failed', error);
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.redis
        .multi()
        .del(key)
        .srem('cache:keys', key)
        .exec();
    } catch (error) {
      throw new ProcessingError('Cache invalidation failed', error);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = await this.redis.smembers(`cache:tags:${tag}`);
      if (keys.length === 0) return;

      await this.redis
        .multi()
        .del(...keys)
        .del(`cache:tags:${tag}`)
        .srem('cache:keys', ...keys)
        .exec();
    } catch (error) {
      throw new ProcessingError('Tag-based invalidation failed', error);
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const [keyCount, memory, hitRate] = await Promise.all([
        this.redis.scard('cache:keys'),
        this.redis.info('memory'),
        this.calculateHitRate()
      ]);

      const usedMemory = parseInt(
        memory.split('\r\n')
          .find(line => line.startsWith('used_memory:'))!
          .split(':')[1]
      );

      return {
        keyCount,
        usedMemory,
        hitRate
      };
    } catch (error) {
      throw new ProcessingError('Failed to get cache stats', error);
    }
  }

  private serialize(value: any): string {
    const serialized = JSON.stringify(value);
    
    if (serialized.length > this.config.compressionThreshold) {
      // Implement compression if needed
      return serialized;
    }
    
    return serialized;
  }

  private deserialize<T>(data: string): T {
    // Implement decompression if needed
    return JSON.parse(data);
  }

  private async calculateHitRate(): Promise<number> {
    const info = await this.redis.info('stats');
    const hits = parseInt(
      info.split('\r\n')
        .find(line => line.startsWith('keyspace_hits:'))!
        .split(':')[1]
    );
    const misses = parseInt(
      info.split('\r\n')
        .find(line => line.startsWith('keyspace_misses:'))!
        .split(':')[1]
    );

    return hits / (hits + misses);
  }
} 