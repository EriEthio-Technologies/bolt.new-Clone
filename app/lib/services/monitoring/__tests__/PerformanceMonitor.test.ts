import { PerformanceMonitor } from '../PerformanceMonitor';
import { Monitoring } from '@google-cloud/monitoring';
import type { PerformanceAnalysisResult } from '~/types/performance';

jest.mock('@google-cloud/monitoring');

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let mockMonitoring: jest.Mocked<Monitoring>;

  const mockResult: PerformanceAnalysisResult = {
    resourceMetrics: {
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
    },
    loadTestResults: {
      requests: {
        total: 10000,
        average: 333.33,
        p95: 25,
        p99: 50
      },
      throughput: {
        average: 5000,
        peak: 7500,
        total: 150000
      },
      errors: 5,
      timeouts: 2,
      duration: 30
    },
    runtimeMetrics: {
      timing: {
        startup: 100,
        firstByte: 50,
        fullyLoaded: 500
      },
      marks: [],
      measures: []
    },
    memoryProfile: {
      snapshot: 'test.heapsnapshot',
      summary: {
        totalSize: 1000000,
        totalObjects: 5000,
        gcRoots: 100
      },
      leaks: [],
      distribution: []
    },
    timestamp: new Date()
  };

  beforeEach(() => {
    mockMonitoring = {
      projectPath: jest.fn().mockReturnValue('test-project-path'),
      createTimeSeries: jest.fn().mockResolvedValue(undefined)
    } as any;

    (Monitoring as jest.Mock).mockImplementation(() => mockMonitoring);
    monitor = new PerformanceMonitor();
  });

  describe('trackPerformanceMetrics', () => {
    it('should track all performance metrics successfully', async () => {
      await monitor.trackPerformanceMetrics(mockResult);

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledTimes(4);

      // Verify resource metrics
      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          timeSeries: expect.arrayContaining([
            expect.objectContaining({
              metric: {
                type: 'custom.googleapis.com/performance/cpu/usage',
                labels: expect.any(Object)
              }
            })
          ])
        })
      );

      // Verify load test metrics
      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          timeSeries: expect.arrayContaining([
            expect.objectContaining({
              metric: {
                type: 'custom.googleapis.com/performance/load_test/requests_per_second',
                labels: expect.any(Object)
              }
            })
          ])
        })
      );

      // Verify runtime metrics
      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          timeSeries: expect.arrayContaining([
            expect.objectContaining({
              metric: {
                type: 'custom.googleapis.com/performance/runtime/startup_time',
                labels: expect.any(Object)
              }
            })
          ])
        })
      );
    });

    it('should handle missing memory profile gracefully', async () => {
      const resultWithoutProfile = {
        ...mockResult,
        memoryProfile: null
      };

      await monitor.trackPerformanceMetrics(resultWithoutProfile);
      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledTimes(3);
    });

    it('should handle monitoring failures gracefully', async () => {
      mockMonitoring.createTimeSeries.mockRejectedValue(
        new Error('Monitoring failed')
      );

      await expect(monitor.trackPerformanceMetrics(mockResult))
        .rejects
        .toThrow('Performance monitoring failed');
    });

    it('should validate and sanitize metric values', async () => {
      const resultWithInvalidValues = {
        ...mockResult,
        resourceMetrics: {
          ...mockResult.resourceMetrics,
          cpu: {
            ...mockResult.resourceMetrics.cpu,
            usage: NaN
          }
        }
      };

      await monitor.trackPerformanceMetrics(resultWithInvalidValues);

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          timeSeries: expect.arrayContaining([
            expect.objectContaining({
              value: {
                doubleValue: 0
              }
            })
          ])
        })
      );
    });
  });

  describe('integration', () => {
    it('should create correct time series data structure', async () => {
      await monitor.trackPerformanceMetrics(mockResult);

      const createTimeSeriesCall = mockMonitoring.createTimeSeries.mock.calls[0][0];
      
      expect(createTimeSeriesCall).toMatchObject({
        name: expect.any(String),
        timeSeries: expect.arrayContaining([
          expect.objectContaining({
            metric: {
              type: expect.stringMatching(/^custom\.googleapis\.com\/performance\//),
              labels: {
                environment: expect.any(String)
              }
            },
            resource: {
              type: 'global',
              labels: {
                project_id: expect.any(String)
              }
            },
            points: [
              expect.objectContaining({
                interval: {
                  endTime: expect.any(Object)
                },
                value: {
                  doubleValue: expect.any(Number)
                }
              })
            ]
          })
        ])
      });
    });
  });
}); 