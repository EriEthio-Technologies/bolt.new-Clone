import { Service } from 'typedi';
import { UIMonitor } from './UIMonitor';
import { DebugService } from '../debug/DebugService';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: Date;
  tags: Record<string, string>;
}

interface ResourceUsage {
  cpu: number;
  memory: number;
  networkIn: number;
  networkOut: number;
  timestamp: Date;
}

@Service()
export class PerformanceMonitoringService {
  private uiMonitor: UIMonitor;
  private debug: DebugService;
  private metrics: PerformanceMetric[] = [];
  private resourceUsage: ResourceUsage[] = [];

  constructor() {
    this.uiMonitor = new UIMonitor();
    this.debug = new DebugService();
    this.startResourceMonitoring();
  }

  private startResourceMonitoring(): void {
    setInterval(() => {
      this.collectResourceMetrics();
    }, 60000); // Collect every minute
  }

  private async collectResourceMetrics(): Promise<void> {
    try {
      // In a real implementation, these would come from actual system metrics
      const usage: ResourceUsage = {
        cpu: Math.random() * 100,
        memory: Math.random() * 16384,
        networkIn: Math.random() * 1000,
        networkOut: Math.random() * 1000,
        timestamp: new Date()
      };

      this.resourceUsage.push(usage);

      // Trim history to last 24 hours
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.resourceUsage = this.resourceUsage.filter(u => u.timestamp > dayAgo);

      await this.trackMetric({
        name: 'system.cpu.usage',
        value: usage.cpu,
        unit: 'percent',
        tags: { source: 'system' }
      });
    } catch (error) {
      this.debug.log('error', 'PerformanceMonitoringService', 'Failed to collect resource metrics', { error });
    }
  }

  async trackMetric(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'PerformanceMonitoringService', 'Tracking metric', metric);

      const fullMetric: PerformanceMetric = {
        ...metric,
        timestamp: new Date()
      };

      this.metrics.push(fullMetric);

      // Here we would send metrics to our monitoring service (e.g., Cloud Monitoring)

      await this.uiMonitor.trackLoadingState({
        component: 'PerformanceMonitoringService',
        duration: Date.now() - startTime,
        variant: 'trackMetric',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'PerformanceMonitoringService', 'Failed to track metric', { error });
      throw error;
    }
  }

  async getMetrics(params: {
    name?: string;
    startTime: Date;
    endTime: Date;
    tags?: Record<string, string>;
  }): Promise<PerformanceMetric[]> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'PerformanceMonitoringService', 'Getting metrics', params);

      let filteredMetrics = this.metrics.filter(m => 
        m.timestamp >= params.startTime && 
        m.timestamp <= params.endTime
      );

      if (params.name) {
        filteredMetrics = filteredMetrics.filter(m => m.name === params.name);
      }

      if (params.tags) {
        filteredMetrics = filteredMetrics.filter(m => 
          Object.entries(params.tags!).every(([key, value]) => m.tags[key] === value)
        );
      }

      await this.uiMonitor.trackLoadingState({
        component: 'PerformanceMonitoringService',
        duration: Date.now() - startTime,
        variant: 'getMetrics',
        hasOverlay: false
      });

      return filteredMetrics;
    } catch (error) {
      this.debug.log('error', 'PerformanceMonitoringService', 'Failed to get metrics', { error });
      throw error;
    }
  }

  async getResourceUsage(params: {
    startTime: Date;
    endTime: Date;
  }): Promise<ResourceUsage[]> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'PerformanceMonitoringService', 'Getting resource usage', params);

      const usage = this.resourceUsage.filter(u =>
        u.timestamp >= params.startTime &&
        u.timestamp <= params.endTime
      );

      await this.uiMonitor.trackLoadingState({
        component: 'PerformanceMonitoringService',
        duration: Date.now() - startTime,
        variant: 'getResourceUsage',
        hasOverlay: false
      });

      return usage;
    } catch (error) {
      this.debug.log('error', 'PerformanceMonitoringService', 'Failed to get resource usage', { error });
      throw error;
    }
  }
} 