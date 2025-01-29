import { Service } from 'typedi';
import { MetricsBatchProcessor } from './PerformanceMonitoringService.batch';
import { UIMonitor } from './UIMonitor';
import { DebugService } from '../debug/DebugService';
import { MemoryOptimizer } from '~/lib/optimization/MemoryOptimizer';
import { BatchProcessingError, ResourceCollectionError } from '~/lib/monitoring/errors';

import { PerformanceMetric, ResourceUsage, MonitoringConfig } from '~/lib/types/monitoring';

@Service()
export class PerformanceMonitoringService extends BaseMonitoringService implements MonitoringService {
  protected readonly serviceName = 'PerformanceMonitoringService';
  
  private static readonly DEFAULT_CONFIG: MonitoringOptions = {
    maxMetricsLength: 10000,
    metricsRetentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    enableResourceMonitoring: true,
    resourceMetricsInterval: 60000, // 1 minute
  };

  private readonly MAX_METRICS_LENGTH: number;
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_INTERVAL = 5000; // 5 seconds
  protected readonly serviceName = 'PerformanceMonitoringService';

  private static readonly DEFAULT_CONFIG: MonitoringOptions = {
    maxMetricsLength: 10000,
    metricsRetentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    enableResourceMonitoring: true,
    resourceMetricsInterval: 60000, // 1 minute
  };

  private resourceUsage: ResourceUsage[] = [];
  private metrics: PerformanceMetric[] = [];
  private metricsBatch: PerformanceMetric[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  private readonly memoryOptimizer: MemoryOptimizer;
  
  constructor(
    private readonly batchProcessor: MetricsBatchProcessor,
    private readonly debug: DebugService,
    private readonly uiMonitor: UIMonitor
  ) {
    this.memoryOptimizer = new MemoryOptimizer(this);
    this.startResourceMonitoring();
    this.initializeBatchProcessing();
  }
  private readonly config: MonitoringOptions;
  private resourceUsage: ResourceUsage[] = [];
  private metrics: PerformanceMetric[] = [];
  private metricsBatch: PerformanceMetric[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private cleanup: (() => void)[] = [];

  constructor(
    private readonly batchProcessor: MetricsBatchProcessor,
    debug: DebugService,
    private readonly uiMonitor: UIMonitor,
    config?: Partial<MonitoringOptions>
  ) {
    super(debug);
    this.config = { ...PerformanceMonitoringService.DEFAULT_CONFIG, ...config };
    this.memoryOptimizer = new MemoryOptimizer(this);
    this.startResourceMonitoring();
    this.initializeBatchProcessing();

    // Register cleanup handlers
    this.cleanup.push(() => {
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
        this.batchTimeout = null;
      }
      this.memoryOptimizer.cleanup();
    });
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
      this.pruneMetrics();

      await this.trackMetric({
        name: 'system.cpu.usage',
        value: usage.cpu,
        unit: 'percent',
        tags: { source: 'system' }
      });
    } catch (error) {
      throw new ResourceCollectionError('Failed to collect resource metrics', { error });
    }
  }

  private initializeBatchProcessing(): void {
    this.processBatch = this.processBatch.bind(this);
  }

  private pruneMetrics(): void {
    this.metrics = pruneOldMetrics(this.metrics, this.config.metricsRetentionPeriod);
  }

  private async processBatch(): Promise<void> {
    if (this.metricsBatch.length === 0) return;

    const batchToProcess = [...this.metricsBatch];
    this.metricsBatch = [];
    
    try {
      await this.batchProcessor.processBatch(batchToProcess);
    } catch (error) {
      throw new BatchProcessingError('Failed to process metrics batch', { error });
      // On failure, retain the metrics that weren't processed
      this.metricsBatch.push(...batchToProcess);
    }
  }

  protected async processMetric(metric: PerformanceMetric): Promise<void> {
    const startTime = Date.now();

    try {
      const fullMetric: PerformanceMetric = {
        ...metric,
        timestamp: new Date()
      };

      this.metrics.push(fullMetric);
      this.metricsBatch.push(fullMetric);

      if (this.metricsBatch.length >= this.BATCH_SIZE) {
        if (this.batchTimeout) {
          clearTimeout(this.batchTimeout);
          this.batchTimeout = null;
        }
        await this.processBatch();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(this.processBatch, this.BATCH_INTERVAL);
      }

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

  async getMetrics(params: MetricsQuery): Promise<PerformanceMetric[]> {
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