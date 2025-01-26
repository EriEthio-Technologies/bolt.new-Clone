export interface DatabaseConfig {
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
    maxRetriesPerRequest: number;
    retryStrategy: (times: number) => number;
  };
  neo4j: {
    projectId: string;
    instanceId: string;
  };
}

export interface ConnectionStats {
  postgres: {
    totalConnections: number;
    idleConnections: number;
    waitingConnections: number;
  };
  redis: {
    connectedClients: number;
    maxMemory: string;
    usedMemory: number;
  };
} 