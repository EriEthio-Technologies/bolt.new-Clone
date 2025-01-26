import { DependencyMonitor } from '../DependencyMonitor';
import { Monitoring } from '@google-cloud/monitoring';
import type { DependencyAnalysis } from '~/types/dependencies';

jest.mock('@google-cloud/monitoring');

describe('DependencyMonitor', () => {
  let monitor: DependencyMonitor;
  let mockMonitoring: jest.Mocked<Monitoring>;

  const mockAnalysis: DependencyAnalysis = {
    graph: {
      nodes: [
        {
          id: 'test.ts',
          type: 'service',
          imports: 2,
          exports: 1,
          size: 1000,
          complexity: 5,
          stability: 0.75
        }
      ],
      edges: [
        {
          source: 'test.ts',
          target: 'dep.ts',
          type: 'import',
          weight: 1
        }
      ]
    },
    circularDependencies: [
      {
        files: ['a.ts', 'b.ts', 'c.ts'],
        length: 3,
        impact: 0.5
      }
    ],
    metrics: {
      totalFiles: 10,
      totalDependencies: 15,
      averageDependencies: 1.5,
      maxDependencies: 3,
      dependencyCohesion: 0.8,
      dependencyStability: 0.7,
      clusters: 2,
      circularDependencies: 1
    },
    clusters: [
      {
        name: 'cluster1',
        files: ['a.ts', 'b.ts'],
        cohesion: 0.9
      }
    ],
    timestamp: new Date()
  };

  beforeEach(() => {
    mockMonitoring = {
      projectPath: jest.fn().mockReturnValue('projects/test-project'),
      createTimeSeries: jest.fn().mockResolvedValue(undefined)
    } as any;

    (Monitoring as jest.Mock).mockImplementation(() => mockMonitoring);
    monitor = new DependencyMonitor();
  });

  describe('trackDependencyMetrics', () => {
    it('should track all dependency metrics successfully', async () => {
      await monitor.trackDependencyMetrics(mockAnalysis);

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledTimes(4);
      const calls = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls;
      
      // Verify basic metrics
      expect(calls[0][0].timeSeries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            metric: {
              type: 'custom.googleapis.com/dependencies/total_files',
              labels: expect.any(Object)
            }
          })
        ])
      );

      // Verify circular dependency metrics
      expect(calls[1][0].timeSeries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            metric: {
              type: 'custom.googleapis.com/dependencies/circular_count',
              labels: expect.any(Object)
            }
          })
        ])
      );
    });

    it('should handle monitoring errors gracefully', async () => {
      mockMonitoring.createTimeSeries.mockRejectedValueOnce(new Error('API Error'));

      await expect(monitor.trackDependencyMetrics(mockAnalysis))
        .rejects
        .toThrow('Dependency monitoring failed');
    });

    it('should calculate graph metrics correctly', async () => {
      await monitor.trackDependencyMetrics(mockAnalysis);

      const graphMetrics = (mockMonitoring.createTimeSeries as jest.Mock)
        .mock.calls
        .find(call => 
          call[0].timeSeries.some((ts: any) => 
            ts.metric.type.includes('graph_density')
          )
        );

      expect(graphMetrics).toBeDefined();
      expect(graphMetrics[0].timeSeries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            value: {
              doubleValue: expect.any(Number)
            }
          })
        ])
      );
    });
  });

  describe('error handling', () => {
    it('should handle invalid metric values', async () => {
      const invalidAnalysis = {
        ...mockAnalysis,
        metrics: {
          ...mockAnalysis.metrics,
          dependencyCohesion: NaN
        }
      };

      await monitor.trackDependencyMetrics(invalidAnalysis);

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalled();
      const calls = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls;
      
      // Verify NaN is converted to 0
      expect(calls[0][0].timeSeries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            value: {
              doubleValue: 0
            }
          })
        ])
      );
    });
  });

  describe('integration', () => {
    it('should batch metrics efficiently', async () => {
      const largeAnalysis = {
        ...mockAnalysis,
        graph: {
          nodes: Array.from({ length: 1000 }, (_, i) => ({
            id: `file${i}.ts`,
            type: 'service',
            imports: 1,
            exports: 1,
            size: 1000,
            complexity: 1,
            stability: 0.5
          })),
          edges: []
        }
      };

      const start = Date.now();
      await monitor.trackDependencyMetrics(largeAnalysis);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}); 