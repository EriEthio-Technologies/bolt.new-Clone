import { AbductiveMonitor } from '../AbductiveMonitor';
import { Monitoring } from '@google-cloud/monitoring';
import type { AbductiveAnalysis, Hypothesis } from '~/types/abductive';

jest.mock('@google-cloud/monitoring');

describe('AbductiveMonitor', () => {
  let monitor: AbductiveMonitor;
  let mockMonitoring: jest.Mocked<Monitoring>;

  const mockHypotheses: Hypothesis[] = [
    {
      id: 'hyp1',
      description: 'Database overload',
      explanation: 'High connection count causing timeouts',
      confidence: 0.85,
      supportingEvidence: ['Connection spike', 'Timeout errors'],
      contradictingEvidence: [],
      assumptions: ['Normal traffic patterns'],
      implications: ['Service degradation'],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'performance-analysis',
        version: '1.0.0'
      }
    },
    {
      id: 'hyp2',
      description: 'Network latency',
      explanation: 'Increased network round-trip time',
      confidence: 0.75,
      supportingEvidence: ['Latency metrics'],
      contradictingEvidence: ['Local tests normal'],
      assumptions: ['Infrastructure stable'],
      implications: ['User experience impact'],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'network-analysis',
        version: '1.0.0'
      }
    }
  ];

  const mockAnalysis: AbductiveAnalysis = {
    observations: [
      {
        id: 'obs1',
        description: 'High latency detected',
        timestamp: new Date(),
        confidence: 0.9
      }
    ],
    hypotheses: mockHypotheses,
    rankedHypotheses: [
      {
        hypothesisId: 'hyp1',
        score: 0.85,
        reasoning: ['Strong evidence support']
      }
    ],
    insights: {
      keyFactors: ['Database load', 'Network performance'],
      uncertainties: [
        {
          factor: 'External dependencies',
          impact: 0.7,
          mitigation: 'Monitor third-party services'
        }
      ],
      gaps: [
        {
          description: 'Missing performance baseline',
          criticality: 0.6,
          suggestedAction: 'Establish baseline metrics'
        }
      ]
    },
    recommendations: [
      {
        action: 'Scale database connections',
        confidence: 0.8,
        impact: 0.9,
        rationale: 'Reduce timeout frequency'
      }
    ],
    metadata: {
      timestamp: new Date(),
      processingTime: 150,
      version: '1.0.0',
      confidence: 0.85
    }
  };

  beforeEach(() => {
    mockMonitoring = {
      projectPath: jest.fn().mockReturnValue('projects/test-project'),
      createTimeSeries: jest.fn().mockResolvedValue(undefined)
    } as any;

    (Monitoring as jest.Mock).mockImplementation(() => mockMonitoring);
    monitor = new AbductiveMonitor();
  });

  describe('trackAbductiveAnalysis', () => {
    it('should track all analysis metrics successfully', async () => {
      await monitor.trackAbductiveAnalysis(mockAnalysis);

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledTimes(1);
      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];

      // Verify observation count
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/abductive/observation_count',
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

      // Verify confidence metric
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/abductive/confidence',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 0.85
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

      await expect(monitor.trackAbductiveAnalysis(mockAnalysis))
        .rejects
        .toThrow('Abductive monitoring failed');
    });
  });

  describe('trackHypothesisMetrics', () => {
    it('should calculate and track hypothesis metrics correctly', async () => {
      await monitor.trackHypothesisMetrics(mockHypotheses);

      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];
      
      // Verify average confidence
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/abductive/hypothesis_average_confidence',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 0.8 // (0.85 + 0.75) / 2
              }
            })
          ]
        })
      );

      // Verify evidence ratio
      const evidenceRatioMetric = call.timeSeries.find((ts: any) => 
        ts.metric.type === 'custom.googleapis.com/abductive/hypothesis_evidence_ratio'
      );
      expect(evidenceRatioMetric).toBeDefined();
      expect(evidenceRatioMetric.points[0].value.doubleValue).toBeGreaterThan(0);
    });

    it('should handle empty hypothesis array', async () => {
      await expect(monitor.trackHypothesisMetrics([]))
        .rejects
        .toThrow();
    });
  });

  describe('integration', () => {
    it('should handle concurrent monitoring requests', async () => {
      const operations = [
        monitor.trackAbductiveAnalysis(mockAnalysis),
        monitor.trackHypothesisMetrics(mockHypotheses)
      ];

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });

    it('should maintain metric consistency across calls', async () => {
      await monitor.trackAbductiveAnalysis(mockAnalysis);
      await monitor.trackAbductiveAnalysis(mockAnalysis);

      const calls = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls;
      expect(calls[0][0].timeSeries).toEqual(calls[1][0].timeSeries);
    });
  });
}); 