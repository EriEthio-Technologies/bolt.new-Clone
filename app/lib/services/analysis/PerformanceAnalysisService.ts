import { Service } from 'typedi';
import { exec } from 'child_process';
import { promisify } from 'util';
import { validateEnv } from '~/config/env.server';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import type { 
  PerformanceAnalysisResult,
  ResourceMetrics,
  LoadTestResult,
  RuntimeMetrics,
  MemoryProfile 
} from '~/types/performance';

const execAsync = promisify(exec);

@Service()
export class PerformanceAnalysisService {
  private readonly env: ReturnType<typeof validateEnv>;
  private readonly monitor: PerformanceMonitor;

  constructor(monitor: PerformanceMonitor) {
    this.env = validateEnv();
    this.monitor = monitor;
  }

  async analyzePerformance(
    path: string,
    options: { 
      duration?: number;
      concurrent?: number;
      heapSnapshot?: boolean;
      cpuProfile?: boolean;
    } = {}
  ): Promise<PerformanceAnalysisResult> {
    try {
      const [
        resourceMetrics,
        loadTestResults,
        runtimeMetrics,
        memoryProfile
      ] = await Promise.all([
        this.collectResourceMetrics(path),
        this.runLoadTest(path, options),
        this.collectRuntimeMetrics(path),
        options.heapSnapshot ? this.generateMemoryProfile(path) : null
      ]);

      const result = {
        resourceMetrics,
        loadTestResults,
        runtimeMetrics,
        memoryProfile,
        timestamp: new Date()
      };

      // Track metrics in monitoring
      await this.monitor.trackPerformanceMetrics(result);

      return result;
    } catch (error) {
      console.error('Performance analysis failed:', error);
      throw new Error(`Performance analysis failed: ${error.message}`);
    }
  }

  private async collectResourceMetrics(path: string): Promise<ResourceMetrics> {
    try {
      // Use clinic.js for detailed resource metrics
      const { stdout } = await execAsync(
        `clinic doctor --collect-only -- node ${path}`
      );

      const metrics = JSON.parse(stdout);

      return {
        cpu: {
          usage: metrics.cpu.usage,
          loadAverage: metrics.cpu.loadAverage,
          utilization: metrics.cpu.utilization
        },
        memory: {
          heapUsed: metrics.memory.heapUsed,
          heapTotal: metrics.memory.heapTotal,
          external: metrics.memory.external,
          rss: metrics.memory.rss
        },
        eventLoop: {
          latency: metrics.eventLoop.latency,
          utilization: metrics.eventLoop.utilization
        },
        gc: {
          totalCollections: metrics.gc.totalCollections,
          totalPause: metrics.gc.totalPause,
          averagePause: metrics.gc.averagePause
        }
      };
    } catch (error) {
      console.error('Resource metrics collection failed:', error);
      throw error;
    }
  }

  private async runLoadTest(
    path: string,
    options: { duration?: number; concurrent?: number }
  ): Promise<LoadTestResult> {
    try {
      const duration = options.duration || 30;
      const concurrent = options.concurrent || 10;

      // Use autocannon for load testing
      const { stdout } = await execAsync(
        `autocannon -d ${duration} -c ${concurrent} ${path}`
      );

      const results = JSON.parse(stdout);

      return {
        requests: {
          total: results.requests.total,
          average: results.requests.average,
          p95: results.latency.p95,
          p99: results.latency.p99
        },
        throughput: {
          average: results.throughput.average,
          peak: results.throughput.peak,
          total: results.throughput.total
        },
        errors: results.errors,
        timeouts: results.timeouts,
        duration: results.duration
      };
    } catch (error) {
      console.error('Load test failed:', error);
      throw error;
    }
  }

  private async collectRuntimeMetrics(path: string): Promise<RuntimeMetrics> {
    try {
      // Use Node.js performance hooks
      const { performance, PerformanceObserver } = await import('perf_hooks');
      
      const metrics: RuntimeMetrics = {
        timing: {
          startup: 0,
          firstByte: 0,
          fullyLoaded: 0
        },
        marks: [],
        measures: []
      };

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'mark') {
            metrics.marks.push({
              name: entry.name,
              timestamp: entry.startTime
            });
          } else if (entry.entryType === 'measure') {
            metrics.measures.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        });
      });

      observer.observe({ entryTypes: ['mark', 'measure'] });

      // Measure startup time
      performance.mark('startup-start');
      await import(path);
      performance.mark('startup-end');
      performance.measure('startup', 'startup-start', 'startup-end');

      metrics.timing.startup = performance.getEntriesByName('startup')[0].duration;

      observer.disconnect();
      return metrics;
    } catch (error) {
      console.error('Runtime metrics collection failed:', error);
      throw error;
    }
  }

  private async generateMemoryProfile(path: string): Promise<MemoryProfile> {
    try {
      // Use heapdump for memory profiling
      const heapdump = await import('heapdump');
      const snapshotPath = `${path}.heapsnapshot`;

      await new Promise((resolve) => {
        heapdump.writeSnapshot(snapshotPath, (err, filename) => {
          if (err) throw err;
          resolve(filename);
        });
      });

      const { stdout } = await execAsync(
        `node --inspect-brk ${path} --analyze-snapshot ${snapshotPath}`
      );

      const analysis = JSON.parse(stdout);

      return {
        snapshot: snapshotPath,
        summary: {
          totalSize: analysis.totalSize,
          totalObjects: analysis.totalObjects,
          gcRoots: analysis.gcRoots
        },
        leaks: analysis.leaks.map(leak => ({
          type: leak.type,
          size: leak.size,
          retainedSize: leak.retainedSize,
          path: leak.path
        })),
        distribution: analysis.distribution.map(dist => ({
          type: dist.type,
          count: dist.count,
          size: dist.size
        }))
      };
    } catch (error) {
      console.error('Memory profiling failed:', error);
      throw error;
    }
  }
} 