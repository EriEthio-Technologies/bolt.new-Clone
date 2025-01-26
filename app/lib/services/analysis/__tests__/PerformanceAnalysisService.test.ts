import { PerformanceAnalysisService } from '../PerformanceAnalysisService';
import { PerformanceMonitor } from '../../monitoring/PerformanceMonitor';
import { exec } from 'child_process';
import type { PerformanceAnalysisResult } from '~/types/performance';

jest.mock('child_process');
jest.mock('../../monitoring/PerformanceMonitor');
jest.mock('perf_hooks', () => ({
  performance: {
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn().mockReturnValue([{ duration: 100 }])
  },
  PerformanceObserver: jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    disconnect: jest.fn()
  }))
}));

describe('PerformanceAnalysisService', () => {
  let service: PerformanceAnalysisService;
  let mockMonitor: jest.Mocked<PerformanceMonitor>;
  const mockExec = exec as jest.Mock;

  beforeEach(() => {
    mockMonitor = {
      trackPerformanceMetrics: jest.fn().mockResolvedValue(undefined)
    } as any;

    service = new PerformanceAnalysisService(mockMonitor);
    jest.clearAllMocks();
  });

  describe('analyzePerformance', () => {
    const mockPath = 'src/test.js';
    const mockClinicOutput = {
      cpu: {
        usage: 45.5,
        loadAverage: [2.5, 2.1, 1.9],
        utilization: 0.65
      },
      memory: {
        heapUsed: 150000000,
        heapTotal: 200000000,
        external: 50000000,
        rss: 300000000
      },
      eventLoop: {
        latency: 1.5,
        utilization: 0.75
      },
      gc: {
        totalCollections: 10,
        totalPause: 150,
        averagePause: 15
      }
    };

    const mockAutocannonOutput = {
      requests: {
        total: 10000,
        average: 333.33,
        latency: {
          p95: 25,
          p99: 50
        }
      },
      throughput: {
        average: 5000,
        peak: 7500,
        total: 150000
      },
      errors: 5,
      timeouts: 2,
      duration: 30
    };

    beforeEach(() => {
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('clinic doctor')) {
          callback(null, { stdout: JSON.stringify(mockClinicOutput) });
        } else if (command.includes('autocannon')) {
          callback(null, { stdout: JSON.stringify(mockAutocannonOutput) });
        } else if (command.includes('--analyze-snapshot')) {
          callback(null, {
            stdout: JSON.stringify({
              totalSize: 1000000,
              totalObjects: 5000,
              gcRoots: 100,
              leaks: [],
              distribution: []
            })
          });
        }
        return { stdout: '{}' };
      });
    });

    it('should analyze performance and return comprehensive results', async () => {
      const result = await service.analyzePerformance(mockPath);

      expect(result).toMatchObject({
        resourceMetrics: expect.objectContaining({
          cpu: expect.any(Object),
          memory: expect.any(Object),
          eventLoop: expect.any(Object),
          gc: expect.any(Object)
        }),
        loadTestResults: expect.objectContaining({
          requests: expect.any(Object),
          throughput: expect.any(Object)
        }),
        runtimeMetrics: expect.objectContaining({
          timing: expect.any(Object),
          marks: expect.any(Array),
          measures: expect.any(Array)
        })
      });

      expect(mockMonitor.trackPerformanceMetrics).toHaveBeenCalledWith(result);
    });

    it('should handle resource metrics collection failure gracefully', async () => {
      mockExec.mockImplementation((command) => {
        if (command.includes('clinic doctor')) {
          throw new Error('Clinic failed');
        }
        return { stdout: '{}' };
      });

      await expect(service.analyzePerformance(mockPath))
        .rejects
        .toThrow('Performance analysis failed');
    });

    it('should handle load test failure gracefully', async () => {
      mockExec.mockImplementation((command) => {
        if (command.includes('autocannon')) {
          throw new Error('Load test failed');
        }
        return { stdout: '{}' };
      });

      await expect(service.analyzePerformance(mockPath))
        .rejects
        .toThrow('Performance analysis failed');
    });

    it('should generate memory profile when requested', async () => {
      const result = await service.analyzePerformance(mockPath, {
        heapSnapshot: true
      });

      expect(result.memoryProfile).toBeDefined();
      expect(result.memoryProfile).toMatchObject({
        summary: expect.objectContaining({
          totalSize: expect.any(Number),
          totalObjects: expect.any(Number)
        })
      });
    });

    it('should collect runtime metrics correctly', async () => {
      const result = await service.analyzePerformance(mockPath);

      expect(result.runtimeMetrics.timing.startup).toBe(100);
      expect(result.runtimeMetrics.marks).toBeDefined();
      expect(result.runtimeMetrics.measures).toBeDefined();
    });

    it('should validate input parameters', async () => {
      await expect(service.analyzePerformance(''))
        .rejects
        .toThrow();

      await expect(service.analyzePerformance(mockPath, {
        duration: -1
      })).rejects.toThrow();
    });

    it('should handle monitoring failures gracefully', async () => {
      mockMonitor.trackPerformanceMetrics.mockRejectedValue(
        new Error('Monitoring failed')
      );

      const result = await service.analyzePerformance(mockPath);
      expect(result).toBeDefined();
    });
  });

  describe('integration tests', () => {
    it('should integrate with monitoring system', async () => {
      const result = await service.analyzePerformance('src/test.js');
      
      expect(mockMonitor.trackPerformanceMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceMetrics: expect.any(Object),
          loadTestResults: expect.any(Object),
          runtimeMetrics: expect.any(Object)
        })
      );
    });

    it('should handle concurrent performance analysis requests', async () => {
      const promises = Array(3).fill(null).map(() => 
        service.analyzePerformance('src/test.js')
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toMatchObject({
          resourceMetrics: expect.any(Object),
          loadTestResults: expect.any(Object)
        });
      });
    });
  });
}); 