import { Service } from 'typedi';
import type { PerformanceMetric } from './PerformanceMonitoringService';

@Service()
export class MetricsBatchProcessor {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  async processBatch(metrics: PerformanceMetric[]): Promise<void> {
    if (!metrics.length) return;

    for (let attempt = 1; attempt <= MetricsBatchProcessor.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        // Group metrics by name for more efficient processing
        const groupedMetrics = this.groupMetricsByName(metrics);
        
        // Process each group in parallel
        await Promise.all(
          Object.entries(groupedMetrics).map(([name, metricsGroup]) =>
            this.sendMetricsBatch(name, metricsGroup)
          )
        );
        
        return;
      } catch (error) {
        if (attempt === MetricsBatchProcessor.MAX_RETRY_ATTEMPTS) {
          throw error;
        }
        await this.delay(MetricsBatchProcessor.RETRY_DELAY * attempt);
      }
    }
  }

  private groupMetricsByName(metrics: PerformanceMetric[]): Record<string, PerformanceMetric[]> {
    return metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);
  }

  private async sendMetricsBatch(name: string, metrics: PerformanceMetric[]): Promise<void> {
    // Here we would send the batch to our monitoring service
    // Implementation depends on the specific monitoring service being used
    console.log(`Sending batch of ${metrics.length} metrics for ${name}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}