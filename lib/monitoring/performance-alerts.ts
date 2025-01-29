import { Service } from 'typedi';
import { MetricsService } from '~/services/MetricsService';

@Service()
export class PerformanceAlerts {
  private static readonly MEMORY_THRESHOLD = 0.85; // 85% memory usage
  private static readonly CPU_THRESHOLD = 0.80; // 80% CPU usage
  private static readonly LATENCY_THRESHOLD = 1000; // 1 second

  async checkPerformanceMetrics(): Promise<void> {
    const metrics = await MetricsService.getMetrics();
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed / memoryUsage.heapTotal > this.MEMORY_THRESHOLD) {
      this.triggerAlert('HIGH_MEMORY_USAGE', {
        current: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal
      });
    }

    // Check CPU usage
    const cpuUsage = process.cpuUsage();
    const totalCPU = cpuUsage.user + cpuUsage.system;
    if (totalCPU > this.CPU_THRESHOLD) {
      this.triggerAlert('HIGH_CPU_USAGE', {
        usage: totalCPU
      });
    }

    // Check response times
    const latencyMetrics = await MetricsService.getLatencyMetrics();
    if (latencyMetrics.p95 > this.LATENCY_THRESHOLD) {
      this.triggerAlert('HIGH_LATENCY', {
        p95: latencyMetrics.p95,
        threshold: this.LATENCY_THRESHOLD
      });
    }
  }

  private triggerAlert(type: string, data: Record<string, any>): void {
    // Send alert to monitoring system
    console.error(`Performance Alert: ${type}`, data);
  }
}