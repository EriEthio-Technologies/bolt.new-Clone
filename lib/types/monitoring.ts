export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: Date;
  tags: Record<string, string>;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  networkIn: number;
  networkOut: number;
  timestamp: Date;
}

export interface MonitoringConfig {
  maxMetricsLength: number;
  batchSize: number;
  batchInterval: number;
  retentionPeriod: number;
}

export interface ProfilePoint {
  name: string;
  startTime: number;
  endTime?: number;
  children: ProfilePoint[];
}

export interface CacheConfig {
  maxAge?: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  public?: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface RateLimitState {
  count: number;
  resetTime: number;
}