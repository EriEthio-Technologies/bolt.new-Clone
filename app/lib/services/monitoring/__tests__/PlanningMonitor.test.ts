import { PlanningMonitor } from '../PlanningMonitor';
import { Monitoring } from '@google-cloud/monitoring';
import type { ExecutionPlan, PlanningStep } from '~/types/planning';

jest.mock('@google-cloud/monitoring');

describe('PlanningMonitor', () => {
  let monitor: PlanningMonitor;
  let mockMonitoring: jest.Mocked<Monitoring>;

  const mockSteps: PlanningStep[] = [
    {
      id: 'step1',
      description: 'Initialize deployment environment',
      prerequisites: ['Infrastructure ready'],
      outcomes: ['Environment configured'],
      estimatedDuration: 1200,
      confidence: 0.9,
      alternatives: [
        {
          description: 'Use existing environment',
          tradeoffs: [
            {
              aspect: 'speed',
              impact: 0.8,
              explanation: 'Faster setup'
            }
          ]
        }
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0'
      }
    },
    {
      id: 'step2',
      description: 'Deploy core services',
      prerequisites: ['Environment configured'],
      outcomes: ['Core services running'],
      estimatedDuration: 2400,
      confidence: 0.85,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0'
      }
    }
  ];

  const mockPlan: ExecutionPlan = {
    id: 'plan1',
    goal: {
      objective: 'Deploy microservices',
      successCriteria: ['All services running']
    },
    steps: mockSteps,
    estimatedCompletion: 3600,
    confidence: 0.88,
    risks: [
      {
        description: 'Network latency',
        probability: 0.3,
        impact: 0.5,
        mitigation: 'Use CDN'
      }
    ],
    alternatives: [
      {
        steps: [],
        tradeoffs: [
          {
            factor: 'reliability',
            difference: 0.1,
            explanation: 'More stable approach'
          }
        ]
      }
    ],
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
      generationParams: {
        processingTime: 250
      }
    }
  };

  beforeEach(() => {
    mockMonitoring = {
      projectPath: jest.fn().mockReturnValue('projects/test-project'),
      createTimeSeries: jest.fn().mockResolvedValue(undefined)
    } as any;

    (Monitoring as jest.Mock).mockImplementation(() => mockMonitoring);
    monitor = new PlanningMonitor();
  });

  describe('trackPlanGeneration', () => {
    it('should track plan metrics correctly', async () => {
      await monitor.trackPlanGeneration(mockPlan);

      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];
      
      // Verify steps count
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/planning/steps_count',
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

      // Verify confidence
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/planning/confidence',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 0.88
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

      await expect(monitor.trackPlanGeneration(mockPlan))
        .rejects
        .toThrow('Planning monitoring failed');
    });
  });

  describe('trackStepMetrics', () => {
    it('should calculate and track step metrics correctly', async () => {
      await monitor.trackStepMetrics(mockSteps);

      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];
      
      // Verify average duration
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/planning/step_average_duration',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 1800 // (1200 + 2400) / 2
              }
            })
          ]
        })
      );

      // Verify average confidence
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/planning/step_average_confidence',
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

    it('should handle empty steps array', async () => {
      await expect(monitor.trackStepMetrics([]))
        .rejects
        .toThrow();
    });
  });

  describe('integration', () => {
    it('should handle concurrent monitoring requests', async () => {
      const operations = [
        monitor.trackPlanGeneration(mockPlan),
        monitor.trackStepMetrics(mockSteps)
      ];

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });

    it('should maintain metric consistency across calls', async () => {
      await monitor.trackPlanGeneration(mockPlan);
      await monitor.trackPlanGeneration(mockPlan);

      const calls = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls;
      expect(calls[0][0].timeSeries).toEqual(calls[1][0].timeSeries);
    });
  });
}); 