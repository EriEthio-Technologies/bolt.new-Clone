import { AbductiveReasoningService } from '../AbductiveReasoningService';
import { EmotionalContextProcessor } from '../EmotionalContextProcessor';
import { CausalReasoningService } from '../CausalReasoningService';
import type { AbductiveQuery, Observation, Hypothesis } from '~/types/abductive';

jest.mock('../EmotionalContextProcessor');
jest.mock('../CausalReasoningService');

describe('AbductiveReasoningService', () => {
  let service: AbductiveReasoningService;
  let mockEmotionalProcessor: jest.Mocked<EmotionalContextProcessor>;
  let mockCausalReasoning: jest.Mocked<CausalReasoningService>;

  const mockQuery: AbductiveQuery = {
    observations: [
      'System latency increased by 200%',
      'Database connections spiked',
      'Multiple timeout errors reported'
    ],
    constraints: {
      maxHypotheses: 5,
      minConfidence: 0.7
    }
  };

  beforeEach(() => {
    mockEmotionalProcessor = {
      processEmotionalContext: jest.fn().mockResolvedValue({
        state: {
          primary: 'neutral',
          intensity: 0.5,
          confidence: 0.8,
          dimensions: {
            valence: 0,
            arousal: 0,
            dominance: 0
          }
        },
        metadata: {
          processingTime: 100
        }
      })
    } as any;

    mockCausalReasoning = {
      analyzeCausality: jest.fn().mockResolvedValue({
        chain: {
          nodes: [],
          links: [],
          confidence: 0.8,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0',
            source: 'test'
          }
        },
        insights: {
          keyFactors: [],
          criticalPaths: [],
          uncertainties: []
        },
        recommendations: []
      })
    } as any;

    service = new AbductiveReasoningService(
      mockEmotionalProcessor,
      mockCausalReasoning
    );
  });

  describe('analyzeAbductively', () => {
    it('should generate complete abductive analysis', async () => {
      const result = await service.analyzeAbductively(mockQuery);

      expect(result).toMatchObject({
        observations: expect.any(Array),
        hypotheses: expect.any(Array),
        rankedHypotheses: expect.any(Array),
        insights: expect.objectContaining({
          keyFactors: expect.any(Array),
          uncertainties: expect.any(Array),
          gaps: expect.any(Array)
        }),
        recommendations: expect.any(Array),
        metadata: expect.objectContaining({
          timestamp: expect.any(Date),
          processingTime: expect.any(Number),
          version: expect.any(String),
          confidence: expect.any(Number)
        })
      });
    });

    it('should respect query constraints', async () => {
      const result = await service.analyzeAbductively({
        ...mockQuery,
        constraints: {
          maxHypotheses: 3,
          minConfidence: 0.8
        }
      });

      expect(result.hypotheses.length).toBeLessThanOrEqual(3);
      result.hypotheses.forEach(hypothesis => {
        expect(hypothesis.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('observation processing', () => {
    it('should process observations with emotional context', async () => {
      const result = await service.analyzeAbductively(mockQuery);

      expect(mockEmotionalProcessor.processEmotionalContext)
        .toHaveBeenCalledTimes(mockQuery.observations.length);

      result.observations.forEach(obs => {
        expect(obs.metadata?.emotionalContext).toBeDefined();
      });
    });
  });

  describe('hypothesis generation', () => {
    it('should generate hypotheses from causal chains', async () => {
      const result = await service.analyzeAbductively(mockQuery);

      expect(mockCausalReasoning.analyzeCausality)
        .toHaveBeenCalledTimes(mockQuery.observations.length);

      expect(result.hypotheses.length).toBeGreaterThan(0);
    });

    it('should deduplicate similar hypotheses', async () => {
      mockCausalReasoning.analyzeCausality.mockResolvedValue({
        chain: {
          nodes: [
            {
              id: 'node1',
              type: 'event',
              description: 'Same root cause',
              confidence: 0.9,
              timestamp: new Date()
            }
          ],
          links: [],
          confidence: 0.9,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0',
            source: 'test'
          }
        },
        insights: { keyFactors: [], criticalPaths: [], uncertainties: [] },
        recommendations: []
      });

      const result = await service.analyzeAbductively(mockQuery);
      const uniqueDescriptions = new Set(
        result.hypotheses.map(h => h.description)
      );

      expect(uniqueDescriptions.size).toBe(result.hypotheses.length);
    });
  });

  describe('ranking', () => {
    it('should rank hypotheses by score', async () => {
      const result = await service.analyzeAbductively(mockQuery);

      const scores = result.rankedHypotheses.map(h => h.score);
      const sortedScores = [...scores].sort((a, b) => b - a);

      expect(scores).toEqual(sortedScores);
    });

    it('should provide reasoning for rankings', async () => {
      const result = await service.analyzeAbductively(mockQuery);

      result.rankedHypotheses.forEach(ranked => {
        expect(ranked.reasoning.length).toBeGreaterThan(0);
      });
    });
  });

  describe('error handling', () => {
    it('should handle emotional processing failures gracefully', async () => {
      mockEmotionalProcessor.processEmotionalContext
        .mockRejectedValueOnce(new Error('Processing failed'));

      const result = await service.analyzeAbductively(mockQuery);
      expect(result.metadata.confidence).toBeLessThan(1);
    });

    it('should handle causal analysis failures gracefully', async () => {
      mockCausalReasoning.analyzeCausality
        .mockRejectedValueOnce(new Error('Analysis failed'));

      const result = await service.analyzeAbductively(mockQuery);
      expect(result.metadata.confidence).toBeLessThan(1);
    });
  });

  describe('integration', () => {
    it('should handle concurrent analysis requests', async () => {
      const queries = Array(3).fill(mockQuery);
      const results = await Promise.all(
        queries.map(q => service.analyzeAbductively(q))
      );

      results.forEach(result => {
        expect(result.metadata.confidence).toBeGreaterThan(0);
      });
    });

    it('should maintain consistency across analyses', async () => {
      const [result1, result2] = await Promise.all([
        service.analyzeAbductively(mockQuery),
        service.analyzeAbductively(mockQuery)
      ]);

      expect(result1.hypotheses.length).toBe(result2.hypotheses.length);
      expect(result1.metadata.confidence).toBeCloseTo(
        result2.metadata.confidence,
        2
      );
    });
  });
}); 