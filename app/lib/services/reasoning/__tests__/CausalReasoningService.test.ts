import { CausalReasoningService } from '../CausalReasoningService';
import { EmotionalContextProcessor } from '../EmotionalContextProcessor';
import type { CausalQuery, CausalNode, CausalLink } from '~/types/causal';

jest.mock('../EmotionalContextProcessor');

describe('CausalReasoningService', () => {
  let service: CausalReasoningService;
  let mockEmotionalProcessor: jest.Mocked<EmotionalContextProcessor>;

  const mockQuery: CausalQuery = {
    event: 'System performance degradation',
    constraints: {
      maxDepth: 3,
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
        }
      })
    } as any;

    service = new CausalReasoningService(mockEmotionalProcessor);
  });

  describe('analyzeCausality', () => {
    it('should generate complete causal analysis', async () => {
      const result = await service.analyzeCausality(mockQuery);

      expect(result).toMatchObject({
        chain: expect.objectContaining({
          nodes: expect.any(Array),
          links: expect.any(Array),
          confidence: expect.any(Number)
        }),
        insights: expect.objectContaining({
          keyFactors: expect.any(Array),
          criticalPaths: expect.any(Array),
          uncertainties: expect.any(Array)
        }),
        recommendations: expect.any(Array)
      });
    });

    it('should respect query constraints', async () => {
      const constrainedQuery = {
        ...mockQuery,
        constraints: {
          maxDepth: 2,
          minConfidence: 0.8
        }
      };

      const result = await service.analyzeCausality(constrainedQuery);
      const maxDepth = getMaxChainDepth(result.chain.nodes, result.chain.links);
      
      expect(maxDepth).toBeLessThanOrEqual(2);
      expect(result.chain.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should handle cyclic relationships', async () => {
      const cyclicQuery: CausalQuery = {
        event: 'Recursive system behavior',
        constraints: { maxDepth: 5 }
      };

      const result = await service.analyzeCausality(cyclicQuery);
      const uniqueNodes = new Set(result.chain.nodes.map(n => n.id));
      
      expect(uniqueNodes.size).toBe(result.chain.nodes.length);
    });
  });

  describe('chain enrichment', () => {
    it('should enrich nodes with emotional context', async () => {
      const result = await service.analyzeCausality(mockQuery);
      
      expect(mockEmotionalProcessor.processEmotionalContext)
        .toHaveBeenCalled();
      
      result.chain.nodes.forEach(node => {
        expect(node.metadata?.emotionalContext).toBeDefined();
      });
    });
  });

  describe('recommendations', () => {
    it('should generate actionable recommendations', async () => {
      const result = await service.analyzeCausality(mockQuery);
      
      expect(result.recommendations.length).toBeGreaterThan(0);
      result.recommendations.forEach(rec => {
        expect(rec.impact).toBeGreaterThan(0);
        expect(rec.confidence).toBeGreaterThan(0);
        expect(rec.rationale).toBeTruthy();
      });
    });

    it('should prioritize high-impact recommendations', async () => {
      const result = await service.analyzeCausality(mockQuery);
      
      const sortedByImpact = [...result.recommendations].sort(
        (a, b) => (b.impact * b.confidence) - (a.impact * a.confidence)
      );
      
      expect(result.recommendations).toEqual(sortedByImpact);
    });
  });

  describe('error handling', () => {
    it('should handle invalid queries gracefully', async () => {
      const invalidQuery = { ...mockQuery, event: '' };
      await expect(service.analyzeCausality(invalidQuery))
        .rejects
        .toThrow('Causal analysis failed');
    });

    it('should handle emotional processing failures', async () => {
      mockEmotionalProcessor.processEmotionalContext
        .mockRejectedValueOnce(new Error('Processing failed'));

      const result = await service.analyzeCausality(mockQuery);
      expect(result.chain.confidence).toBeLessThan(1);
    });
  });
});

// Helper function to calculate max chain depth
function getMaxChainDepth(nodes: CausalNode[], links: CausalLink[]): number {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adjacencyList = new Map<string, string[]>();
  
  links.forEach(link => {
    if (!adjacencyList.has(link.source)) {
      adjacencyList.set(link.source, []);
    }
    adjacencyList.get(link.source)!.push(link.target);
  });

  function dfs(nodeId: string, visited: Set<string>): number {
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    if (neighbors.length === 0) return 0;

    return 1 + Math.max(...neighbors.map(n => dfs(n, visited)));
  }

  return Math.max(...nodes.map(n => dfs(n.id, new Set())));
} 