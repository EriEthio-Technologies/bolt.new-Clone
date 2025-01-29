import { BaseMonitoringService } from './BaseMonitoringService';
import { AlertLevel, MonitoringConfig, PerformanceMetrics } from '../../types/monitoring';

export class PerformanceMonitoringService extends BaseMonitoringService {
  private static instance: PerformanceMonitoringService;
  
  private static config: MonitoringConfig = {
    serviceName: 'performance-monitoring',
    alertThresholds: {
      cpuUsage: 80,
      memoryUsage: 85,
      responseTime: 1000,
      errorRate: 5
    },
    checkIntervalMs: 30000, // 30 seconds
  };

  private constructor() {
    super(PerformanceMonitoringService.config);
  }

  public static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  public async monitorPerformance(): Promise<void> {
    await Promise.all([
      this.checkCPUUsage(),
      this.checkMemoryUsage(),
      this.checkResponseTimes(),
      this.checkErrorRates()
    ]);
  }

  private async checkCPUUsage(): Promise<void> {
    const cpuUsage = await this.metrics.getMetricValue('system.cpu.usage');
    if (cpuUsage >= this.config.alertThresholds.cpuUsage) {
      await this.raiseAlert({
        level: AlertLevel.HIGH,
        message: `High CPU usage detected: ${cpuUsage}%`,
        source: 'performance-monitoring',
        timestamp: new Date()
      });
    }
  }

  private async checkMemoryUsage(): Promise<void> {
    const memoryUsage = await this.metrics.getMetricValue('system.memory.usage');
    if (memoryUsage >= this.config.alertThresholds.memoryUsage) {
      await this.raiseAlert({
        level: AlertLevel.HIGH,
        message: `High memory usage detected: ${memoryUsage}%`,
        source: 'performance-monitoring',
        timestamp: new Date()
      });
    }
  }

  private async checkResponseTimes(): Promise<void> {
    const avgResponseTime = await this.metrics.getMetricValue('http.server.response_time');
    if (avgResponseTime >= this.config.alertThresholds.responseTime) {
      await this.raiseAlert({
        level: AlertLevel.MEDIUM,
        message: `High average response time: ${avgResponseTime}ms`,
        source: 'performance-monitoring',
        timestamp: new Date()
      });
    }
  }

  private async checkErrorRates(): Promise<void> {
    const errorRate = await this.metrics.getMetricValue('http.server.error_rate');
    if (errorRate >= this.config.alertThresholds.errorRate) {
      await this.raiseAlert({
        level: AlertLevel.HIGH,
        message: `High error rate detected: ${errorRate}%`,
        source: 'performance-monitoring',
        timestamp: new Date()
      });
    }
  }
}