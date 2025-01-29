import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MemoryManager, MemoryConfig } from '../MemoryManager';

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;
  let config: MemoryConfig;

  beforeEach(() => {
    // Mock process.memoryUsage
    const mockMemoryUsage = {
      heapUsed: 500 * 1024 * 1024, // 500MB
      heapTotal: 1024 * 1024 * 1024, // 1GB
      external: 100 * 1024 * 1024,
      rss: 1.5 * 1024 * 1024 * 1024,
      arrayBuffers: 50 * 1024 * 1024
    };
    jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);

    config = {
      maxHeapUsagePercent: 90,
      gcThresholdPercent: 70,
      monitoringIntervalMs: 1000
    };

    memoryManager = MemoryManager.getInstance(config);
  });

  afterEach(() => {
    memoryManager.stopMonitoring();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should always return the same instance', () => {
      const instance1 = MemoryManager.getInstance(config);
      const instance2 = MemoryManager.getInstance(config);
      expect(instance1).toBe(instance2);
    });
  });

  describe('startMonitoring', () => {
    it('should start monitoring when called', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      memoryManager.startMonitoring();
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        config.monitoringIntervalMs
      );
    });

    it('should not start multiple monitoring intervals', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      memoryManager.startMonitoring();
      memoryManager.startMonitoring();
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring when called', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      memoryManager.startMonitoring();
      memoryManager.stopMonitoring();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('memory monitoring', () => {
    it('should emit critical-memory event when above maxHeapUsagePercent', (done) => {
      // Mock high memory usage
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 950 * 1024 * 1024, // 95% of heap
        heapTotal: 1024 * 1024 * 1024,
        external: 100 * 1024 * 1024,
        rss: 1.5 * 1024 * 1024 * 1024,
        arrayBuffers: 50 * 1024 * 1024
      });

      memoryManager.on('critical-memory', (stats) => {
        expect(stats.percent).toBeGreaterThanOrEqual(config.maxHeapUsagePercent);
        done();
      });

      memoryManager.startMonitoring();
    });

    it('should emit gc-recommended event when above gcThresholdPercent', (done) => {
      // Mock moderate memory usage
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 750 * 1024 * 1024, // 75% of heap
        heapTotal: 1024 * 1024 * 1024,
        external: 100 * 1024 * 1024,
        rss: 1.5 * 1024 * 1024 * 1024,
        arrayBuffers: 50 * 1024 * 1024
      });

      memoryManager.on('gc-recommended', (stats) => {
        expect(stats.percent).toBeGreaterThanOrEqual(config.gcThresholdPercent);
        expect(stats.percent).toBeLessThan(config.maxHeapUsagePercent);
        done();
      });

      memoryManager.startMonitoring();
    });

    it('should trigger garbage collection when above gcThresholdPercent', () => {
      // Mock global.gc
      (global as any).gc = jest.fn();

      // Mock high memory usage
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 750 * 1024 * 1024,
        heapTotal: 1024 * 1024 * 1024,
        external: 100 * 1024 * 1024,
        rss: 1.5 * 1024 * 1024 * 1024,
        arrayBuffers: 50 * 1024 * 1024
      });

      memoryManager.startMonitoring();
      expect((global as any).gc).toHaveBeenCalled();
    });
  });

  describe('getMemoryStats', () => {
    it('should return current memory statistics', () => {
      const stats = memoryManager.getMemoryStats() as any;
      expect(stats).toHaveProperty('heapUsed');
      expect(stats).toHaveProperty('heapTotal');
      expect(stats).toHaveProperty('external');
      expect(stats).toHaveProperty('rss');
      expect(stats).toHaveProperty('arrayBuffers');
      expect(stats).toHaveProperty('heapUsedPercent');
      
      // Verify heap usage percentage calculation
      const expectedPercent = (stats.heapUsed / stats.heapTotal) * 100;
      expect(stats.heapUsedPercent).toBe(expectedPercent);
    });
  });
});