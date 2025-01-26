import { CausalMonitor } from '../CausalMonitor';
import { Monitoring } from '@google-cloud/monitoring';
import type { CausalAnalysis, CausalChain } from '~/types/causal';

jest.mock('@google-cloud/monitoring');

describe('CausalMonitor', () => {
  let monitor: CausalMonitor;
  let mockMonitoring: jest.Mocked<Monitoring>;

  const mockChain: CausalChain = {
    id: 'test-chain-1',
    nodes: [
      {
        id: 'node1',
        type: 'event',
        description: 'Initial event',
        confidence: 0.9,
        timestamp: new Date()
      },
      {
        id: 'node2',
        type: 'action',
        description: 'Response action',
        confidence: 0.8,
        timestamp: new Date()
      }
    ],
    links: [
      {
        id: 'link1',
        source: 'node1',
        target: 'node2',
        type: 'causes',
        strength: 0.8,
        confidence: 0.85
      }
    ],
    confidence: 0.85,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
      source: 'test'
    }
  };

  const mockAnalysis: CausalAnalysis = {
    chain: mockChain,
    insights: {
      keyFactors: ['factor1', 'factor2'],
      criticalPaths: [
        { path: ['node1', 'node2'], impact: 0.8 }
      ],
      uncertainties: [
        { node: 'node2', reason: 'Limited data', impact: 0.3 }
      ]
    },
    recommendations: [
      {
        action: 'Implement monitoring',
        impact: 0.8,
        confidence: 0.9,
        rationale: 'Improves system visibility'
      }
    ]
  };

  beforeEach(() => {
    mockMonitoring = {
      projectPath: jest.fn().mockReturnValue('projects/test-project'),
      createTimeSeries: jest.fn().mockResolvedValue(undefined)
    } as any;

    (Monitoring as jest.Mock).mockImplementation(() => mockMonitoring);
    monitor = new CausalMonitor();
  });

  describe('trackCausalAnalysis', () => {
    it('should track all analysis metrics successfully', async () => {
      await monitor.trackCausalAnalysis(mockAnalysis);

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledTimes(1);
      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];

      // Verify chain size metric
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/causal/chain_size',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 2 // number of nodes
              }
            })
          ]
        })
      );

      // Verify recommendations metric
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/causal/recommendation_count',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 1
              }
            })
          ]
        })
      );
    });

    it('should handle tracking errors gracefully', async () => {
      mockMonitoring.createTimeSeries.mockRejectedValueOnce(
        new Error('API Error')
      );

      await expect(monitor.trackCausalAnalysis(mockAnalysis))
        .rejects
        .toThrow('Causal monitoring failed');
    });
  });

  describe('trackChainMetrics', () => {
    it('should calculate and track chain metrics correctly', async () => {
      await monitor.trackChainMetrics(mockChain);

      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];
      
      // Verify node count
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/causal/chain_node_count',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 2
              }
            })
          ]
        })
      );

      // Verify link types
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/causal/chain_causes_count',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 1
              }
            })
          ]
        })
      );
    });

    it('should calculate average confidence correctly', async () => {
      await monitor.trackChainMetrics(mockChain);

      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];
      const avgConfMetric = call.timeSeries.find((ts: any) => 
        ts.metric.type === 'custom.googleapis.com/causal/chain_average_confidence'
      );

      expect(avgConfMetric.points[0].value.doubleValue)
        .toBeCloseTo(0.85, 2);
    });
  });

  describe('integration', () => {
    it('should handle concurrent monitoring requests', async () => {
      const operations = [
        monitor.trackCausalAnalysis(mockAnalysis),
        monitor.trackChainMetrics(mockChain)
      ];

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });

    it('should maintain metric consistency across calls', async () => {
      await monitor.trackCausalAnalysis(mockAnalysis);
      await monitor.trackCausalAnalysis(mockAnalysis);

      const calls = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls;
      expect(calls[0][0].timeSeries).toEqual(calls[1][0].timeSeries);
    });
  });
}); 