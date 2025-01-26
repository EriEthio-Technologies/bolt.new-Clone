export interface ContextPersistenceConfig {
  remoteBackup: boolean;
  compressionEnabled: boolean;
  retentionDays: number;
  tags?: string[];
}

export interface ContextVersion {
  version: string;
  timestamp: Date;
  config: ContextPersistenceConfig;
}

export interface PersistenceMetadata {
  versions: Array<{
    version: string;
    timestamp: Date;
    hash: string;
    config: ContextPersistenceConfig;
  }>;
  lastUpdated: Date;
  config: ContextPersistenceConfig;
} 