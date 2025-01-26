import { Service } from 'typedi';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { Neo4j } from '@google-cloud/neo4j';
import { validateEnv } from '~/config/env.server';
import { ProcessingError } from '~/errors/ProcessingError';
import type { DatabaseConfig, ConnectionStats } from '~/types/database';

@Service()
export class DatabaseService {
  private readonly postgres: Pool;
  private readonly redis: Redis;
  private readonly neo4j: Neo4j;
  private readonly config: DatabaseConfig;

  constructor() {
    this.config = this.loadConfig();
    this.postgres = this.initializePostgres();
    this.redis = this.initializeRedis();
    this.neo4j = this.initializeNeo4j();
  }

  private loadConfig(): DatabaseConfig {
    const env = validateEnv();
    return {
      postgres: {
        host: env.POSTGRES_HOST,
        port: parseInt(env.POSTGRES_PORT),
        database: env.POSTGRES_DB,
        user: env.POSTGRES_USER,
        password: env.POSTGRES_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
      },
      redis: {
        host: env.REDIS_HOST,
        port: parseInt(env.REDIS_PORT),
        password: env.REDIS_PASSWORD,
        db: 0,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 50, 2000)
      },
      neo4j: {
        projectId: env.GCP_PROJECT_ID,
        instanceId: env.NEO4J_INSTANCE_ID
      }
    };
  }

  private initializePostgres(): Pool {
    const pool = new Pool(this.config.postgres);

    pool.on('error', (err) => {
      console.error('Unexpected Postgres error:', err);
    });

    return pool;
  }

  private initializeRedis(): Redis {
    const redis = new Redis(this.config.redis);

    redis.on('error', (err) => {
      console.error('Redis error:', err);
    });

    return redis;
  }

  private initializeNeo4j(): Neo4j {
    return new Neo4j(this.config.neo4j);
  }

  async getPostgresConnection() {
    try {
      const client = await this.postgres.connect();
      return client;
    } catch (error) {
      throw new ProcessingError('Failed to get Postgres connection', error);
    }
  }

  getRedisConnection(): Redis {
    return this.redis;
  }

  getNeo4jConnection(): Neo4j {
    return this.neo4j;
  }

  async getConnectionStats(): Promise<ConnectionStats> {
    try {
      const [pgStats, redisStats] = await Promise.all([
        this.postgres.query('SELECT count(*) FROM pg_stat_activity'),
        this.redis.info('clients')
      ]);

      return {
        postgres: {
          totalConnections: parseInt(pgStats.rows[0].count),
          idleConnections: this.postgres.idleCount,
          waitingConnections: this.postgres.waitingCount
        },
        redis: {
          connectedClients: parseInt(redisStats.split('\r\n')[1].split(':')[1]),
          maxMemory: await this.redis.config('GET', 'maxmemory'),
          usedMemory: await this.redis.info('memory').then(info => 
            parseInt(info.split('\r\n').find(line => 
              line.startsWith('used_memory:')
            )!.split(':')[1])
          )
        }
      };
    } catch (error) {
      throw new ProcessingError('Failed to get connection stats', error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await Promise.all([
        this.postgres.query('SELECT 1'),
        this.redis.ping(),
        this.neo4j.run('RETURN 1')
      ]);
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    await Promise.all([
      this.postgres.end(),
      this.redis.quit()
    ]);
  }
} 