import { Service } from 'typedi';
import { DebugService } from '../debug/DebugService';
import type { PerformanceMetric } from '~/lib/types/monitoring';

@Service()
export abstract class BaseMonitoringService {
  constructor(protected readonly debug: DebugService) {}

  protected abstract readonly serviceName: string;

  protected async trackMetricInternal(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    try {
      this.debug.log('info', this.serviceName, 'Tracking metric', metric);
      await this.processMetric({
        ...metric,
        timestamp: new Date()
      });
    } catch (error) {
      this.debug.log('error', this.serviceName, 'Failed to track metric', { error });
      throw error;
    }
  }

  protected abstract processMetric(metric: PerformanceMetric): Promise<void>;

  protected getTimeRange(durationMs: number): { startTime: Date; endTime: Date } {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - durationMs);
    return { startTime, endTime };
  }

  protected validateMetric(metric: Partial<PerformanceMetric>): void {
    if (!metric.name) throw new Error('Metric name is required');
    if (typeof metric.value !== 'number') throw new Error('Metric value must be a number');
    if (!metric.unit) throw new Error('Metric unit is required');
  }
}