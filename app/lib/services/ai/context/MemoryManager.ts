import { Service } from 'typedi';
import { Redis } from 'ioredis';
import { validateEnv } from '~/config/env.server';
import type { 
  Memory, 
  MemoryType, 
  MemorySearchParams,
  MemoryStats 
} from '~/types/memory';
import { ProcessingError } from '~/errors/ProcessingError';

@Service()
export class MemoryManager {
  private redis: Redis;
  private readonly memoryTTL = 24 * 60 * 60; // 24 hours
  private readonly maxMemoriesPerType = 1000;

  constructor() {
    const env = validateEnv();
    this.redis = new Redis(env.REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });
  }

  async storeMemory(memory: Memory): Promise<void> {
    try {
      const key = this.getMemoryKey(memory.type, memory.id);
      const score = memory.importance * Date.now();

      // Store memory in sorted set
      await this.redis
        .multi()
        .zadd(`memories:${memory.type}`, score, memory.id)
        .hset(key, this.serializeMemory(memory))
        .expire(key, this.memoryTTL)
        .exec();

      // Prune old memories if needed
      await this.pruneMemories(memory.type);
    } catch (error) {
      throw new ProcessingError('Failed to store memory', error);
    }
  }

  async retrieveMemories(params: MemorySearchParams): Promise<Memory[]> {
    try {
      const { types, query, limit = 10, minImportance = 0 } = params;
      const memories: Memory[] = [];

      for (const type of types) {
        // Get memory IDs from sorted set
        const ids = await this.redis.zrevrange(`memories:${type}`, 0, -1);
        
        for (const id of ids) {
          const memory = await this.getMemory(type, id);
          
          if (memory && memory.importance >= minImportance) {
            if (query && !this.matchesQuery(memory, query)) continue;
            memories.push(memory);
            if (memories.length >= limit) break;
          }
        }
      }

      return this.rankMemories(memories, params);
    } catch (error) {
      throw new ProcessingError('Failed to retrieve memories', error);
    }
  }

  async updateMemoryImportance(
    type: MemoryType,
    id: string,
    importance: number
  ): Promise<void> {
    try {
      const key = this.getMemoryKey(type, id);
      const memory = await this.getMemory(type, id);

      if (memory) {
        memory.importance = importance;
        memory.lastAccessed = new Date();

        await this.storeMemory(memory);
      }
    } catch (error) {
      throw new ProcessingError('Failed to update memory importance', error);
    }
  }

  async getMemoryStats(): Promise<MemoryStats> {
    try {
      const stats: MemoryStats = {
        totalMemories: 0,
        memoryTypes: {},
        averageImportance: 0
      };

      const types = await this.redis.keys('memories:*');
      let totalImportance = 0;

      for (const type of types) {
        const memoryType = type.split(':')[1] as MemoryType;
        const count = await this.redis.zcard(type);
        stats.totalMemories += count;
        stats.memoryTypes[memoryType] = count;

        // Calculate average importance
        const memories = await this.retrieveMemories({
          types: [memoryType],
          limit: count
        });
        totalImportance += memories.reduce((sum, m) => sum + m.importance, 0);
      }

      stats.averageImportance = totalImportance / stats.totalMemories;
      return stats;
    } catch (error) {
      throw new ProcessingError('Failed to get memory stats', error);
    }
  }

  private async pruneMemories(type: MemoryType): Promise<void> {
    const count = await this.redis.zcard(`memories:${type}`);
    
    if (count > this.maxMemoriesPerType) {
      const toRemove = count - this.maxMemoriesPerType;
      
      // Get oldest memories
      const oldMemoryIds = await this.redis.zrange(
        `memories:${type}`,
        0,
        toRemove - 1
      );

      // Remove memories
      await this.redis
        .multi()
        .zrem(`memories:${type}`, ...oldMemoryIds)
        .del(...oldMemoryIds.map(id => this.getMemoryKey(type, id)))
        .exec();
    }
  }

  private async getMemory(type: MemoryType, id: string): Promise<Memory | null> {
    const key = this.getMemoryKey(type, id);
    const data = await this.redis.hgetall(key);
    return data ? this.deserializeMemory(data) : null;
  }

  private getMemoryKey(type: MemoryType, id: string): string {
    return `memory:${type}:${id}`;
  }

  private serializeMemory(memory: Memory): Record<string, string> {
    return {
      id: memory.id,
      type: memory.type,
      content: JSON.stringify(memory.content),
      importance: memory.importance.toString(),
      created: memory.created.toISOString(),
      lastAccessed: memory.lastAccessed.toISOString(),
      metadata: JSON.stringify(memory.metadata)
    };
  }

  private deserializeMemory(data: Record<string, string>): Memory {
    return {
      id: data.id,
      type: data.type as MemoryType,
      content: JSON.parse(data.content),
      importance: parseFloat(data.importance),
      created: new Date(data.created),
      lastAccessed: new Date(data.lastAccessed),
      metadata: JSON.parse(data.metadata)
    };
  }

  private matchesQuery(memory: Memory, query: string): boolean {
    const searchText = JSON.stringify(memory.content).toLowerCase();
    return searchText.includes(query.toLowerCase());
  }

  private rankMemories(memories: Memory[], params: MemorySearchParams): Memory[] {
    return memories.sort((a, b) => {
      // Combine importance and recency
      const aScore = a.importance * (1 / (Date.now() - a.lastAccessed.getTime()));
      const bScore = b.importance * (1 / (Date.now() - b.lastAccessed.getTime()));
      return bScore - aScore;
    });
  }
} 