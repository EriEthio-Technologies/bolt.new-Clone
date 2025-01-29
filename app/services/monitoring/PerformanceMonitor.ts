import { monitoringConfig } from '../../config/monitoring';
import { AppError } from '../../utils/errorHandler';
import { EventEmitter } from 'events';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private eventEmitter: EventEmitter;
  private metrics: Map<string, number>;
  private readonly config: typeof monitoringConfig;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.metrics = new Map();
    this.config = monitoringConfig;
    this.initialize();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initialize(): void {
    // Set up metric collection intervals
    setInterval(() => this.collectMemoryMetrics(), 30000);
    setInterval(() => this.collectCPUMetrics(), 30000);
  }

  private collectMemoryMetrics(): void {
    try {
      const used = process.memoryUsage();
      this.recordMetric('heapUsed', used.heapUsed);
      this.recordMetric('heapTotal', used.heapTotal);
      this.checkThresholds('memory');
    } catch (error) {
      this.handleError('Memory metric collection failed', error);
    }
  }

  private collectCPUMetrics(): void {
    try {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const userCPUUsage = endUsage.user / 1000000; // Convert to milliseconds
        const systemCPUUsage = endUsage.system / 1000000;
        
        this.recordMetric('userCPUUsage', userCPUUsage);
        this.recordMetric('systemCPUUsage', systemCPUUsage);
        this.checkThresholds('cpu');
      }, 100);
    } catch (error) {
      this.handleError('CPU metric collection failed', error);
    }
  }

  private recordMetric(name: string, value: number): void {
    this.metrics.set(name, value);
    
    if (this.config.metrics.cloudWatch.enabled) {
      this.sendToCloudWatch(name, value);
    }

    if (this.config.metrics.prometheus.enabled) {
      // Future implementation
      console.log('Prometheus metrics recording not yet implemented');
    }
  }

  private checkThresholds(metricType: string): void {
    const thresholds = this.config.alerts.thresholds;

    if (metricType === 'memory') {
      const heapUsed = this.metrics.get('heapUsed') || 0;
      const heapTotal = this.metrics.get('heapTotal') || 1;
      const memoryUsage = heapUsed / heapTotal;

      if (memoryUsage > thresholds.memoryUsage) {
        this.emitAlert('highMemoryUsage', {
          usage: memoryUsage,
          threshold: thresholds.memoryUsage,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  private sendToCloudWatch(metricName: string, value: number): void {
    // Implementation will be handled by the main monitoring service
    console.log(`[CloudWatch] ${metricName}: ${value}`);
  }

  private handleError(message: string, error: unknown): void {
    if (error instanceof Error) {
      throw new AppError(500, `${message}: ${error.message}`);
    }
    throw new AppError(500, message);
  }

  public onAlert(callback: (alert: any) => void): void {
    this.eventEmitter.on('alert', callback);
  }

  private emitAlert(type: string, data: any): void {
    this.eventEmitter.emit('alert', {
      type,
      data,
      timestamp: new Date().toISOString()
    });
  }
}

export default PerformanceMonitor.getInstance();