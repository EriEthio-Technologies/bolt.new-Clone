import { Service } from 'typedi';
import { Monitoring } from '@google-cloud/monitoring';
import { validateEnv } from '~/config/env.server';
import type { PerformanceAnalysisResult } from '~/types/performance';

@Service()
export class PerformanceMonitor {
  private readonly monitoring: Monitoring;
  private readonly projectPath: string;
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
    this.monitoring = new Monitoring();
    this.projectPath = this.monitoring.projectPath(this.env.GCP_PROJECT_ID);
  }

  async trackPerformanceMetrics(result: PerformanceAnalysisResult): Promise<void> {
    try {
      await Promise.all([
        this.trackResourceMetrics(result),
        this.trackLoadTestMetrics(result),
        this.trackRuntimeMetrics(result),
        result.memoryProfile ? this.trackMemoryMetrics(result) : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Failed to track performance metrics:', error);
      throw new Error('Performance monitoring failed');
    }
  }

  private async trackResourceMetrics(result: PerformanceAnalysisResult): Promise<void> {
    const { cpu, memory, eventLoop, gc } = result.resourceMetrics;
    
    const timeSeriesData = [
      {
        metric: 'custom.googleapis.com/performance/cpu/usage',
        value: cpu.usage
      },
      {
        metric: 'custom.googleapis.com/performance/cpu/utilization',
        value: cpu.utilization
      },
      {
        metric: 'custom.googleapis.com/performance/memory/heap_used',
        value: memory.heapUsed
      },
      {
        metric: 'custom.googleapis.com/performance/event_loop/latency',
        value: eventLoop.latency
      },
      {
        metric: 'custom.googleapis.com/performance/gc/total_pause',
        value: gc.totalPause
      }
    ];

    await this.createTimeSeriesData(timeSeriesData);
  }

  private async trackLoadTestMetrics(result: PerformanceAnalysisResult): Promise<void> {
    const { requests, throughput } = result.loadTestResults;
    
    const timeSeriesData = [
      {
        metric: 'custom.googleapis.com/performance/load_test/requests_per_second',
        value: requests.average
      },
      {
        metric: 'custom.googleapis.com/performance/load_test/latency_p95',
        value: requests.p95
      },
      {
        metric: 'custom.googleapis.com/performance/load_test/throughput',
        value: throughput.average
      }
    ];

    await this.createTimeSeriesData(timeSeriesData);
  }

  private async trackRuntimeMetrics(result: PerformanceAnalysisResult): Promise<void> {
    const { timing } = result.runtimeMetrics;
    
    const timeSeriesData = [
      {
        metric: 'custom.googleapis.com/performance/runtime/startup_time',
        value: timing.startup
      },
      {
        metric: 'custom.googleapis.com/performance/runtime/ttfb',
        value: timing.firstByte
      },
      {
        metric: 'custom.googleapis.com/performance/runtime/fully_loaded',
        value: timing.fullyLoaded
      }
    ];

    await this.createTimeSeriesData(timeSeriesData);
  }

  private async trackMemoryMetrics(result: PerformanceAnalysisResult): Promise<void> {
    if (!result.memoryProfile) return;

    const { summary } = result.memoryProfile;
    
    const timeSeriesData = [
      {
        metric: 'custom.googleapis.com/performance/memory/total_size',
        value: summary.totalSize
      },
      {
        metric: 'custom.googleapis.com/performance/memory/total_objects',
        value: summary.totalObjects
      },
      {
        metric: 'custom.googleapis.com/performance/memory/gc_roots',
        value: summary.gcRoots
      }
    ];

    await this.createTimeSeriesData(timeSeriesData);
  }

  private async createTimeSeriesData(
    metricsData: Array<{ metric: string; value: number }>
  ): Promise<void> {
    try {
      const timeSeries = metricsData.map(({ metric, value }) => ({
        metric: {
          type: metric,
          labels: {
            environment: this.env.NODE_ENV
          }
        },
        resource: {
          type: 'global',
          labels: {
            project_id: this.env.GCP_PROJECT_ID
          }
        },
        points: [{
          interval: {
            endTime: {
              seconds: Math.floor(Date.now() / 1000)
            }
          },
          value: {
            doubleValue: Number.isFinite(value) ? value : 0
          }
        }]
      }));

      await this.monitoring.createTimeSeries({
        name: this.projectPath,
        timeSeries
      });
    } catch (error) {
      console.error('Failed to create time series:', error);
      throw new Error(`Failed to create time series: ${error.message}`);
    }
  }
} 