import { CommonSenseReasoningService } from '../CommonSenseReasoningService';
import { EmotionalContextProcessor } from '../EmotionalContextProcessor';
import { CausalReasoningService } from '../CausalReasoningService';
import { AbductiveReasoningService } from '../AbductiveReasoningService';
import type { CommonSenseQuery, ConceptNode } from '~/types/commonsense';

jest.mock('../EmotionalContextProcessor');
jest.mock('../CausalReasoningService');
jest.mock('../AbductiveReasoningService');

describe('CommonSenseReasoningService', () => {
  let service: CommonSenseReasoningService;
  let mockEmotionalProcessor: jest.Mocked<EmotionalContextProcessor>;
  let mockCausalReasoning: jest.Mocked<CausalReasoningService>;
  let mockAbductiveReasoning: jest.Mocked<AbductiveReasoningService>;

  const mockQuery: CommonSenseQuery = {
    statement: 'Birds can fly because they have wings',
    requireExplanation: true,
    context: {
      domain: 'biology',
      constraints: {
        minConfidence: 0.8,
        maxDepth: 3
      }
    }
  };

  const mockConcepts: ConceptNode[] = [
    {
      id: 'bird-1',
      name: 'bird',
      type: 'entity',
      properties: {
        hasWings: true,
        canFly: true
      },
      confidence: 0.9,
      metadata: {
        source: 'core-knowledge',
        timestamp: new Date(),
        version: '1.0.0'
      }
    },
    {
      id: 'wing-1',
      name: 'wing',
      type: 'entity',
      properties: {
        enablesFlight: true
      },
      confidence: 0.95,
      metadata: {
        source: 'core-knowledge',
        timestamp: new Date(),
        version: '1.0.0'
      }
    }
  ];

  beforeEach(() => {
    mockEmotionalProcessor = {
      processEmotionalContext: jest.fn().mockResolvedValue({
        state: {
          primary: 'neutral',
          confidence: 0.8
        }
      })
    } as any;

    mockCausalReasoning = {
      analyzeCausality: jest.fn().mockResolvedValue({
        chain: {
          nodes: [],
          links: [],
          confidence: 0.85
        }
      })
    } as any;

    mockAbductiveReasoning = {
      analyzeAbductively: jest.fn().mockResolvedValue({
        hypotheses: [],
        confidence: 0.8
      })
    } as any;

    service = new CommonSenseReasoningService(
      mockEmotionalProcessor,
      mockCausalReasoning,
      mockAbductiveReasoning
    );
  });

  describe('reason', () => {
    it('should generate complete common sense inference', async () => {
      const result = await service.reason(mockQuery);

      expect(result).toMatchObject({
        conclusion: expect.any(String),
        confidence: expect.any(Number),
        explanation: expect.any(Array),
        supportingFacts: expect.any(Array),
        assumptions: expect.any(Array),
        alternatives: expect.any(Array),
        metadata: expect.objectContaining({
          processingTime: expect.any(Number),
          timestamp: expect.any(Date),
          reasoningDepth: expect.any(Number)
        })
      });
    });

    it('should respect context constraints', async () => {
      const result = await service.reason({
        ...mockQuery,
        context: {
          ...mockQuery.context,
          constraints: {
            minConfidence: 0.9,
            maxDepth: 2
          }
        }
      });

      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.metadata.reasoningDepth).toBeLessThanOrEqual(2);
    });

    it('should provide explanations when requested', async () => {
      const result = await service.reason({
        ...mockQuery,
        requireExplanation: true
      });

      expect(result.explanation.length).toBeGreaterThan(0);
      result.explanation.forEach(exp => {
        expect(exp).toBeTruthy();
      });
    });
  });

  describe('knowledge integration', () => {
    it('should integrate emotional context', async () => {
      await service.reason(mockQuery);

      expect(mockEmotionalProcessor.processEmotionalContext)
        .toHaveBeenCalled();
    });

    it('should utilize causal reasoning', async () => {
      await service.reason(mockQuery);

      expect(mockCausalReasoning.analyzeCausality)
        .toHaveBeenCalled();
    });

    it('should incorporate abductive reasoning', async () => {
      await service.reason(mockQuery);

      expect(mockAbductiveReasoning.analyzeAbductively)
        .toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle concept extraction failures', async () => {
      const invalidQuery = {
        ...mockQuery,
        statement: ''
      };

      await expect(service.reason(invalidQuery))
        .rejects
        .toThrow('Common sense reasoning failed');
    });

    it('should handle inference validation failures', async () => {
      mockCausalReasoning.analyzeCausality
        .mockRejectedValueOnce(new Error('Validation failed'));

      const result = await service.reason(mockQuery);
      expect(result.confidence).toBeLessThan(1);
    });
  });

  describe('integration', () => {
    it('should handle concurrent reasoning requests', async () => {
      const queries = Array(3).fill(mockQuery);
      const results = await Promise.all(
        queries.map(q => service.reason(q))
      );

      results.forEach(result => {
        expect(result.metadata.processingTime).toBeGreaterThan(0);
      });
    });

    it('should maintain consistency across inferences', async () => {
      const [result1, result2] = await Promise.all([
        service.reason(mockQuery),
        service.reason(mockQuery)
      ]);

      expect(result1.conclusion).toBe(result2.conclusion);
      expect(result1.confidence).toBeCloseTo(result2.confidence, 2);
    });
  });
}); 