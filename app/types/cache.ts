export interface CacheConfig {
  defaultTTL: number;
  maxKeys: number;
  compressionThreshold: number;
}

export interface CacheStats {
  keyCount: number;
  usedMemory: number;
  hitRate: number;
} 