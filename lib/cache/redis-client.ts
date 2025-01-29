import Redis from 'ioredis';
import { CircuitBreaker } from 'opossum';

export class RedisClient {
  private static instance: RedisClient;
  private readonly pool: Redis[];
  private readonly maxPoolSize = 10;
  private currentIndex = 0;
  
  private readonly breaker: CircuitBreaker;

  private constructor() {
    this.pool = Array.from({ length: this.maxPoolSize }, () => 
      new Redis({
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        enableOfflineQueue: true,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      })
    );

    this.breaker = new CircuitBreaker(this.executeWithRetry.bind(this), {
      timeout: 3000, // 3 seconds
      errorThresholdPercentage: 50,
      resetTimeout: 30000 // 30 seconds
    });

    this.breaker.on('open', () => {
      console.error('Redis circuit breaker opened');
    });
  }

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  private getConnection(): Redis {
    this.currentIndex = (this.currentIndex + 1) % this.maxPoolSize;
    return this.pool[this.currentIndex];
  }

  async zincrby(key: string, increment: number, member: string): Promise<number> {
    return this.breaker.fire(async (client: Redis) => {
      return client.zincrby(key, increment, member);
    });
  }

  async zremrangebyrank(key: string, start: number, stop: number): Promise<number> {
    return this.breaker.fire(async (client: Redis) => {
      return client.zremrangebyrank(key, start, stop);
    });
  }

  private async executeWithRetry<T>(operation: (client: Redis) => Promise<T>): Promise<T> {
    const client = this.getConnection();
    try {
      return await operation(client);
    } catch (error) {
      if (error.message.includes('READONLY')) {
        // Handle replica failover
        await new Promise(resolve => setTimeout(resolve, 100));
        return await operation(client);
      }
      throw error;
    }
  }

  async pipeline(operations: Array<(client: Redis) => any>): Promise<any[]> {
    return this.breaker.fire(async (client: Redis) => {
      const pipeline = client.pipeline();
      operations.forEach(op => op(pipeline));
      return await pipeline.exec();
    });
  }

  async get(key: string): Promise<string | null> {
    return this.breaker.fire(async (client: Redis) => {
      return await client.get(key);
    });
  }

  async set(key: string, value: string, options?: { ex?: number }): Promise<void> {
    await this.breaker.fire(async (client: Redis) => {
      if (options?.ex) {
        await client.set(key, value, 'EX', options.ex);
      } else {
        await client.set(key, value);
      }
    });
  }

  async mget(keys: string[]): Promise<Array<string | null>> {
    return this.breaker.fire(async (client: Redis) => {
      return await client.mget(keys);
    });
  }

  async del(key: string): Promise<void> {
    await this.breaker.fire(async (client: Redis) => {
      await client.del(key);
    });
  }

  async flushall(): Promise<void> {
    await this.breaker.fire(async (client: Redis) => {
      await client.flushall();
    });
  }

  async quit(): Promise<void> {
    await Promise.all(this.pool.map(client => client.quit()));
  }

  async mset(keyValues: Record<string, string>): Promise<void> {
    await this.breaker.fire(async (client: Redis) => {
      await client.mset(keyValues);
    });
  }
}