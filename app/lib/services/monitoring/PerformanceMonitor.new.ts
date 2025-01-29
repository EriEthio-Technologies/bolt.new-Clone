import { Service } from 'typedi';
import { DebugService } from '../debug/DebugService';
import { MonitoringError } from '~/lib/monitoring/errors';
import type { PerformanceMetric } from '~/lib/types/monitoring';
import { BaseMonitoringService } from './BaseMonitoringService';
import { MonitoringService } from './interfaces';
import { validateEnv } from '~/config/env.server';

interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkUsage: number;
  timestamp: Date;
}

interface LoadTestMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  concurrentUsers: number;
}

interface RuntimeMetrics {
  executionTime: number;
  gcPauses: number;
  threadCount: number;
  deadlocks: number;
}

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

interface PerformanceAnalysisResult {
  resourceMetrics: ResourceMetrics;
  loadTestMetrics: LoadTestMetrics;
  runtimeMetrics: RuntimeMetrics;
  memoryMetrics: MemoryMetrics;
}

@Service()
export class PerformanceMonitor extends BaseMonitoringService implements MonitoringService {
  protected readonly serviceName = 'PerformanceMonitor';
  private cleanup: (() => void)[] = [];
  private readonly env = validateEnv();

  constructor(
    debug: DebugService,
    private readonly monitoring: MonitoringService
  ) {
    super(debug);
  }

  async trackMetric(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    return this.trackMetricInternal(metric);
  }

  protected async processMetric(metric: PerformanceMetric): Promise<void> {
    await this.monitoring.trackMetric(metric);
  }

  async trackPerformanceMetrics(result: PerformanceAnalysisResult): Promise<void> {
    try {
      await Promise.all([
        this.trackResourceMetrics(result),
        this.trackLoadTestMetrics(result),
        this.trackRuntimeMetrics(result),
        this.trackMemoryMetrics(result)
      ]);
    } catch (error) {
      this.debug.log('error', this.serviceName, 'Failed to track performance metrics', { error });
      throw new MonitoringError('Failed to track performance metrics', { error });
    }
  }

  private async trackResourceMetrics(result: PerformanceAnalysisResult): Promise<void> {
    const metrics = result.resourceMetrics;
    
    await Promise.all([
      this.trackMetric({
        name: 'resource.cpu.usage',
        value: metrics.cpuUsage,
        unit: 'percent',
        tags: { type: 'resource' }
      }),
      this.trackMetric({
        name: 'resource.memory.usage',
        value: metrics.memoryUsage,
        unit: 'bytes',
        tags: { type: 'resource' }
      }),
      this.trackMetric({
        name: 'resource.network.usage',
        value: metrics.networkUsage,
        unit: 'bytes',
        tags: { type: 'resource' }
      })
    ]);
  }

  private async trackLoadTestMetrics(result: PerformanceAnalysisResult): Promise<void> {
    const metrics = result.loadTestMetrics;
    
    await Promise.all([
      this.trackMetric({
        name: 'loadtest.response_time',
        value: metrics.responseTime,
        unit: 'ms',
        tags: { type: 'loadtest' }
      }),
      this.trackMetric({
        name: 'loadtest.throughput',
        value: metrics.throughput,
        unit: 'count',
        tags: { type: 'loadtest' }
      }),
      this.trackMetric({
        name: 'loadtest.error_rate',
        value: metrics.errorRate,
        unit: 'percent',
        tags: { type: 'loadtest' }
      }),
      this.trackMetric({
        name: 'loadtest.concurrent_users',
        value: metrics.concurrentUsers,
        unit: 'count',
        tags: { type: 'loadtest' }
      })
    ]);
  }

  private async trackRuntimeMetrics(result: PerformanceAnalysisResult): Promise<void> {
    const metrics = result.runtimeMetrics;
    
    await Promise.all([
      this.trackMetric({
        name: 'runtime.execution_time',
        value: metrics.executionTime,
        unit: 'ms',
        tags: { type: 'runtime' }
      }),
      this.trackMetric({
        name: 'runtime.gc_pauses',
        value: metrics.gcPauses,
        unit: 'count',
        tags: { type: 'runtime' }
      }),
      this.trackMetric({
        name: 'runtime.thread_count',
        value: metrics.threadCount,
        unit: 'count',
        tags: { type: 'runtime' }
      }),
      this.trackMetric({
        name: 'runtime.deadlocks',
        value: metrics.deadlocks,
        unit: 'count',
        tags: { type: 'runtime' }
      })
    ]);
  }

  private async trackMemoryMetrics(result: PerformanceAnalysisResult): Promise<void> {
    const metrics = result.memoryMetrics;
    
    await Promise.all([
      this.trackMetric({
        name: 'memory.heap.used',
        value: metrics.heapUsed,
        unit: 'bytes',
        tags: { type: 'memory' }
      }),
      this.trackMetric({
        name: 'memory.heap.total',
        value: metrics.heapTotal,
        unit: 'bytes',
        tags: { type: 'memory' }
      }),
      this.trackMetric({
        name: 'memory.external',
        value: metrics.external,
        unit: 'bytes',
        tags: { type: 'memory' }
      }),
      this.trackMetric({
        name: 'memory.array_buffers',
        value: metrics.arrayBuffers,
        unit: 'bytes',
        tags: { type: 'memory' }
      })
    ]);
  }

  public async getMetrics(query: MetricsQuery): Promise<PerformanceMetric[]> {
    return this.monitoring.getMetrics(query);
  }

  public cleanup(): void {
    this.cleanup.forEach(cleanup => cleanup());
    this.cleanup = [];
  }
}