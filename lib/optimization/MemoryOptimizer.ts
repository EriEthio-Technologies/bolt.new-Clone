import { Service } from 'typedi';
import { PerformanceMonitoringService } from '~/services/monitoring/PerformanceMonitoringService';

@Service()
export class MemoryOptimizer {
  private static readonly GC_THRESHOLD = 0.85; // 85% heap usage
  private static readonly CHECK_INTERVAL = 60000; // 1 minute
  private timer: NodeJS.Timer | null = null;

  constructor(private readonly monitoring: PerformanceMonitoringService) {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.timer = setInterval(() => {
      this.checkMemoryUsage();
    }, MemoryOptimizer.CHECK_INTERVAL);

    // Don't prevent process from exiting
    this.timer.unref();
  }

  private async checkMemoryUsage(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    const heapTotal = memoryUsage.heapTotal;
    const heapUsage = heapUsed / heapTotal;

    // Track memory metrics
    await this.monitoring.trackMetric({
      name: 'memory.heap.usage',
      value: heapUsage * 100,
      unit: 'percent',
      tags: { type: 'heap' }
    });

    // Force garbage collection if usage is high
    if (heapUsage > MemoryOptimizer.GC_THRESHOLD) {
      this.forceGarbageCollection();
    }

    // Track memory leaks
    this.checkForMemoryLeaks();
  }

  private forceGarbageCollection(): void {
    if (global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = before - after;

      this.monitoring.trackMetric({
        name: 'memory.gc.freed',
        value: freed,
        unit: 'bytes',
        tags: { type: 'forced' }
      });
    }
  }

  private checkForMemoryLeaks(): void {
    const usage = process.memoryUsage();
    
    // Check if external memory is growing abnormally
    if (usage.external > 100 * 1024 * 1024) { // 100MB
      console.warn('High external memory usage detected');
    }

    // Check if heap is fragmented
    const fragmentation = 1 - (usage.heapUsed / usage.heapTotal);
    if (fragmentation > 0.5) { // 50% fragmentation
      console.warn('High heap fragmentation detected');
    }
  }

  public cleanup(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}