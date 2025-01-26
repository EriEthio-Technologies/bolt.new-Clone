import { CommonSenseMonitor } from '../CommonSenseMonitor';
import { Monitoring } from '@google-cloud/monitoring';
import type { CommonSenseInference, ConceptNode } from '~/types/commonsense';

jest.mock('@google-cloud/monitoring');

describe('CommonSenseMonitor', () => {
  let monitor: CommonSenseMonitor;
  let mockMonitoring: jest.Mocked<Monitoring>;

  const mockConcepts: ConceptNode[] = [
    {
      id: 'concept1',
      name: 'bird',
      type: 'entity',
      properties: { canFly: true },
      confidence: 0.9,
      metadata: {
        source: 'core-knowledge',
        timestamp: new Date(),
        version: '1.0.0'
      }
    },
    {
      id: 'concept2',
      name: 'fly',
      type: 'action',
      properties: { requiresWings: true },
      confidence: 0.85,
      metadata: {
        source: 'core-knowledge',
        timestamp: new Date(),
        version: '1.0.0'
      }
    }
  ];

  const mockInference: CommonSenseInference = {
    conclusion: 'Birds can fly because they have wings',
    confidence: 0.9,
    explanation: ['Wings enable flight capability'],
    supportingFacts: [
      {
        concept: 'bird',
        relation: 'hasProperty',
        confidence: 0.95
      }
    ],
    assumptions: ['Normal atmospheric conditions'],
    alternatives: [
      {
        conclusion: 'Birds can glide using air currents',
        confidence: 0.8,
        reasoning: 'Alternative flight mechanism'
      }
    ],
    metadata: {
      processingTime: 150,
      timestamp: new Date(),
      reasoningDepth: 2
    }
  };

  beforeEach(() => {
    mockMonitoring = {
      projectPath: jest.fn().mockReturnValue('projects/test-project'),
      createTimeSeries: jest.fn().mockResolvedValue(undefined)
    } as any;

    (Monitoring as jest.Mock).mockImplementation(() => mockMonitoring);
    monitor = new CommonSenseMonitor();
  });

  describe('trackInference', () => {
    it('should track inference metrics correctly', async () => {
      await monitor.trackInference(mockInference);

      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];
      
      // Verify confidence metric
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/commonsense/inference_confidence',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 0.9
              }
            })
          ]
        })
      );

      // Verify supporting facts count
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/commonsense/supporting_facts_count',
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

      await expect(monitor.trackInference(mockInference))
        .rejects
        .toThrow('Common sense monitoring failed');
    });
  });

  describe('trackConceptMetrics', () => {
    it('should calculate and track concept metrics correctly', async () => {
      await monitor.trackConceptMetrics(mockConcepts);

      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];
      
      // Verify total count
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/commonsense/concept_total_count',
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

      // Verify average confidence
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/commonsense/concept_average_confidence',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 0.875 // (0.9 + 0.85) / 2
              }
            })
          ]
        })
      );
    });

    it('should handle empty concept array', async () => {
      await expect(monitor.trackConceptMetrics([]))
        .rejects
        .toThrow();
    });
  });

  describe('integration', () => {
    it('should handle concurrent monitoring requests', async () => {
      const operations = [
        monitor.trackInference(mockInference),
        monitor.trackConceptMetrics(mockConcepts)
      ];

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });

    it('should maintain metric consistency across calls', async () => {
      await monitor.trackInference(mockInference);
      await monitor.trackInference(mockInference);

      const calls = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls;
      expect(calls[0][0].timeSeries).toEqual(calls[1][0].timeSeries);
    });
  });
}); 