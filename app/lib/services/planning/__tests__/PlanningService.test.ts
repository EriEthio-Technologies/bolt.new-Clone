import { PlanningService } from '../PlanningService';
import { CommonSenseReasoningService } from '../../reasoning/CommonSenseReasoningService';
import { CausalReasoningService } from '../../reasoning/CausalReasoningService';
import type { PlanningQuery, ExecutionPlan } from '~/types/planning';

jest.mock('../../reasoning/CommonSenseReasoningService');
jest.mock('../../reasoning/CausalReasoningService');

describe('PlanningService', () => {
  let service: PlanningService;
  let mockCommonSenseReasoning: jest.Mocked<CommonSenseReasoningService>;
  let mockCausalReasoning: jest.Mocked<CausalReasoningService>;

  const mockQuery: PlanningQuery = {
    goal: {
      objective: 'Deploy new microservice architecture',
      successCriteria: [
        'All services running',
        'Zero downtime migration',
        'Monitoring configured'
      ],
      constraints: {
        timeframe: 7200000, // 2 hours in milliseconds
        resourceLimits: {
          developers: 5,
          servers: 10
        },
        qualityThresholds: {
          coverage: 0.9,
          performance: 0.95
        }
      }
    },
    context: {
      resources: [
        {
          type: 'developer',
          availability: 0.8,
          constraints: {
            maxHoursPerDay: 8
          }
        },
        {
          type: 'server',
          availability: 1.0,
          constraints: {
            maxConcurrentDeployments: 2
          }
        }
      ],
      constraints: {
        maxDuration: 10800000, // 3 hours in milliseconds
        maxSteps: 20,
        requiredConfidence: 0.8,
        priorityFactors: ['reliability', 'performance']
      }
    },
    preferences: {
      optimizeFor: ['reliability', 'speed'],
      riskTolerance: 0.3,
      preferredApproaches: ['blue-green-deployment', 'canary-release']
    }
  };

  beforeEach(() => {
    mockCommonSenseReasoning = {
      reason: jest.fn().mockResolvedValue({
        conclusion: 'Valid objective',
        confidence: 0.9,
        explanation: ['Clear deployment goal'],
        supportingFacts: []
      })
    } as any;

    mockCausalReasoning = {
      analyzeCausality: jest.fn().mockResolvedValue({
        chain: {
          nodes: [],
          links: [],
          confidence: 0.85
        },
        insights: {
          uncertainties: [
            {
              factor: 'Network latency',
              impact: 0.3,
              mitigation: 'Use CDN'
            }
          ]
        }
      })
    } as any;

    service = new PlanningService(
      mockCommonSenseReasoning,
      mockCausalReasoning
    );
  });

  describe('generatePlan', () => {
    it('should generate a complete execution plan', async () => {
      const result = await service.generatePlan(mockQuery);

      expect(result).toMatchObject({
        id: expect.any(String),
        goal: expect.any(Object),
        steps: expect.any(Array),
        estimatedCompletion: expect.any(Number),
        confidence: expect.any(Number),
        risks: expect.any(Array),
        alternatives: expect.any(Array),
        metadata: expect.objectContaining({
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          version: expect.any(String),
          generationParams: expect.any(Object)
        })
      });
    });

    it('should validate goals using common sense reasoning', async () => {
      await service.generatePlan(mockQuery);

      expect(mockCommonSenseReasoning.reason).toHaveBeenCalledWith(
        expect.objectContaining({
          statement: mockQuery.goal.objective,
          requireExplanation: true
        })
      );
    });

    it('should assess risks using causal reasoning', async () => {
      await service.generatePlan(mockQuery);

      expect(mockCausalReasoning.analyzeCausality).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'Plan execution failure',
          constraints: expect.any(Object)
        })
      );
    });

    it('should respect context constraints', async () => {
      const result = await service.generatePlan(mockQuery);

      expect(result.estimatedCompletion).toBeLessThanOrEqual(
        mockQuery.context.constraints.maxDuration!
      );
      expect(result.steps.length).toBeLessThanOrEqual(
        mockQuery.context.constraints.maxSteps!
      );
      expect(result.confidence).toBeGreaterThanOrEqual(
        mockQuery.context.constraints.requiredConfidence!
      );
    });

    it('should optimize based on preferences', async () => {
      const result = await service.generatePlan(mockQuery);

      // Check if reliability-focused steps are prioritized
      const reliabilitySteps = result.steps.filter(step =>
        step.description.toLowerCase().includes('reliability') ||
        step.description.toLowerCase().includes('testing')
      );
      expect(reliabilitySteps.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle goal validation failures', async () => {
      mockCommonSenseReasoning.reason.mockResolvedValueOnce({
        conclusion: 'Invalid',
        confidence: 0.5,
        explanation: ['Unclear objective'],
        supportingFacts: []
      });

      await expect(service.generatePlan(mockQuery))
        .rejects
        .toThrow('Goal validation failed');
    });

    it('should handle resource availability errors', async () => {
      const queryWithUnavailableResources: PlanningQuery = {
        ...mockQuery,
        context: {
          ...mockQuery.context,
          resources: [
            {
              type: 'developer',
              availability: 0,
              constraints: {}
            }
          ]
        }
      };

      const result = await service.generatePlan(queryWithUnavailableResources);
      expect(result.confidence).toBeLessThan(
        mockQuery.context.constraints.requiredConfidence!
      );
    });
  });

  describe('integration', () => {
    it('should handle concurrent plan generation', async () => {
      const queries = Array(3).fill(mockQuery);
      const results = await Promise.all(
        queries.map(q => service.generatePlan(q))
      );

      results.forEach(result => {
        expect(result.metadata.processingTime).toBeGreaterThan(0);
      });
    });

    it('should maintain consistency across plans', async () => {
      const [plan1, plan2] = await Promise.all([
        service.generatePlan(mockQuery),
        service.generatePlan(mockQuery)
      ]);

      expect(plan1.steps.length).toBe(plan2.steps.length);
      expect(plan1.confidence).toBeCloseTo(plan2.confidence, 2);
    });
  });
}); 