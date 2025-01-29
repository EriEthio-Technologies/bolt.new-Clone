import type { PerformanceMetric } from '~/lib/types/monitoring';

export interface BatchProcessorOptions {
  maxBatchSize: number;
  batchInterval: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface MonitoringOptions {
  maxMetricsLength: number;
  metricsRetentionPeriod: number;
  enableResourceMonitoring: boolean;
  resourceMetricsInterval: number;
}

export interface MetricsQuery {
  name?: string;
  startTime: Date;
  endTime: Date;
  tags?: Record<string, string>;
}

export interface MetricsBatch {
  metrics: PerformanceMetric[];
  createdAt: Date;
  processedAt?: Date;
  error?: Error;
}