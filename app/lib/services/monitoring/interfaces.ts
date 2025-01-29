export interface ServiceCleanup {
  cleanup(): void;
}

export interface MetricsProcessor {
  processMetric(metric: PerformanceMetric): Promise<void>;
  cleanup(): void;
}

export interface MonitoringService extends ServiceCleanup {
  trackMetric(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void>;
  getMetrics(query: MetricsQuery): Promise<PerformanceMetric[]>;
}