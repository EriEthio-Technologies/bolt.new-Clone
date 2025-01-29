import { EventEmitter } from 'events';

export interface MemoryConfig {
  maxHeapUsagePercent: number;
  gcThresholdPercent: number;
  monitoringIntervalMs: number;
}

export class MemoryManager extends EventEmitter {
  private static instance: MemoryManager;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor(private config: MemoryConfig) {
    super();
  }

  public static getInstance(config: MemoryConfig): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager(config);
    }
    return MemoryManager.instance;
  }

  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.monitoringIntervalMs);
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.isMonitoring = false;
  }

  private checkMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    if (heapUsedPercent >= this.config.maxHeapUsagePercent) {
      this.emit('critical-memory', {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        percent: heapUsedPercent
      });
    } else if (heapUsedPercent >= this.config.gcThresholdPercent) {
      this.emit('gc-recommended', {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        percent: heapUsedPercent
      });
      
      if (global.gc) {
        global.gc();
      }
    }
  }

  public getMemoryStats(): object {
    const memoryUsage = process.memoryUsage();
    return {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      arrayBuffers: memoryUsage.arrayBuffers,
      heapUsedPercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    };
  }
}