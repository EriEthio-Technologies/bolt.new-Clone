import { InferenceEngine } from '../InferenceEngine';
import { KnowledgeGraph } from '../../knowledge/KnowledgeGraph';
import { ProcessingError } from '~/errors/ProcessingError';
import type { InferenceContext } from '~/types/inference';

describe('InferenceEngine', () => {
  let inferenceEngine: InferenceEngine;
  let mockKnowledgeGraph: jest.Mocked<KnowledgeGraph>;

  beforeEach(() => {
    mockKnowledgeGraph = {
      getRelevantKnowledge: jest.fn().mockResolvedValue([
        {
          id: 'knowledge1',
          type: 'code_pattern',
          content: { pattern: 'factory' },
          relevance: 0.9
        }
      ])
    } as any;

    inferenceEngine = new InferenceEngine(mockKnowledgeGraph);
  });

  describe('infer', () => {
    const mockContext: InferenceContext = {
      query: 'Create a factory function',
      intent: {
        type: 'code_generation',
        confidence: 0.9
      },
      entities: [
        {
          text: 'factory',
          type: 'FUNCTION',
          confidence: 0.85
        }
      ]
    };

    it('should generate valid inference results', async () => {
      const result = await inferenceEngine.infer(mockContext);

      expect(result).toMatchObject({
        confidence: expect.any(Number),
        reasoning: {
          steps: expect.any(Array),
          confidence: expect.any(Number),
          alternatives: expect.any(Array)
        },
        metadata: {
          knowledgeUsed: expect.any(Array),
          rulesApplied: expect.any(Array),
          modelVersion: expect.any(String)
        }
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning.steps.length).toBeGreaterThan(0);
    });

    it('should handle low confidence scenarios', async () => {
      const lowConfidenceContext = {
        ...mockContext,
        intent: { ...mockContext.intent, confidence: 0.3 }
      };

      await expect(inferenceEngine.infer(lowConfidenceContext))
        .rejects
        .toThrow(ProcessingError);
    });

    it('should generate consistent reasoning chains', async () => {
      const result = await inferenceEngine.infer(mockContext);
      
      // Check reasoning chain consistency
      const { steps } = result.reasoning;
      let lastConfidence = 1;
      
      steps.forEach(step => {
        expect(step.confidence).toBeLessThanOrEqual(lastConfidence);
        lastConfidence = step.confidence;
      });
    });

    it('should detect and handle contradictions', async () => {
      const contradictoryContext: InferenceContext = {
        ...mockContext,
        entities: [
          { text: 'sync', type: 'PROPERTY', confidence: 0.8 },
          { text: 'async', type: 'PROPERTY', confidence: 0.8 }
        ]
      };

      await expect(inferenceEngine.infer(contradictoryContext))
        .rejects
        .toThrow('Contradictory conclusions in reasoning');
    });

    it('should incorporate knowledge graph results', async () => {
      const result = await inferenceEngine.infer(mockContext);
      
      expect(mockKnowledgeGraph.getRelevantKnowledge).toHaveBeenCalledWith(
        expect.objectContaining({
          query: mockContext.query
        })
      );

      expect(result.metadata.knowledgeUsed).toContain('knowledge1');
    });
  });

  describe('error handling', () => {
    it('should handle model initialization failures', async () => {
      // Force model initialization error
      jest.spyOn(inferenceEngine as any, 'initialize')
        .mockRejectedValueOnce(new Error('Model failed to load'));

      await expect(inferenceEngine['initialize']())
        .rejects
        .toThrow(ProcessingError);
    });

    it('should handle knowledge graph failures gracefully', async () => {
      mockKnowledgeGraph.getRelevantKnowledge
        .mockRejectedValueOnce(new Error('Knowledge graph error'));

      await expect(inferenceEngine.infer({
        query: 'test',
        intent: { type: 'test', confidence: 0.9 },
        entities: []
      })).rejects.toThrow(ProcessingError);
    });
  });
}); 