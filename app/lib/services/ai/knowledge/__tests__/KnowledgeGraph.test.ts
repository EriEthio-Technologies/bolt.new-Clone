import { KnowledgeGraph } from '../KnowledgeGraph';
import { ProcessingError } from '~/errors/ProcessingError';
import type { KnowledgeNode, KnowledgeQuery } from '~/types/knowledge';

describe('KnowledgeGraph', () => {
  let knowledgeGraph: KnowledgeGraph;
  let mockNeo4j: jest.Mocked<any>;

  beforeEach(() => {
    mockNeo4j = {
      run: jest.fn()
    };

    (knowledgeGraph as any).neo4j = mockNeo4j;
  });

  describe('getRelevantKnowledge', () => {
    const mockQuery: KnowledgeQuery = {
      query: 'test query',
      types: ['CodePattern'],
      limit: 10
    };

    it('should retrieve and process knowledge correctly', async () => {
      mockNeo4j.run.mockResolvedValueOnce({
        records: [{
          get: (key: string) => {
            if (key === 'n') {
              return {
                properties: {
                  id: 'test1',
                  content: JSON.stringify({ pattern: 'factory' }),
                  metadata: JSON.stringify({}),
                  created: '2023-01-01',
                  lastUpdated: '2023-01-01'
                },
                labels: ['CodePattern']
              };
            }
            return [];
          }
        }]
      });

      const results = await knowledgeGraph.getRelevantKnowledge(mockQuery);
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('CodePattern');
      expect(results[0].relevance).toBeGreaterThan(0);
    });

    it('should handle query errors gracefully', async () => {
      mockNeo4j.run.mockRejectedValueOnce(new Error('Database error'));

      await expect(knowledgeGraph.getRelevantKnowledge(mockQuery))
        .rejects
        .toThrow(ProcessingError);
    });
  });

  describe('addKnowledge', () => {
    const mockNode: KnowledgeNode = {
      id: 'test1',
      type: 'CodePattern',
      content: { pattern: 'factory' },
      metadata: {},
      relations: [{
        type: 'USES',
        targetId: 'test2'
      }]
    };

    it('should add node and relations correctly', async () => {
      mockNeo4j.run.mockResolvedValueOnce({ records: [] });
      mockNeo4j.run.mockResolvedValueOnce({ records: [] });

      await knowledgeGraph.addKnowledge(mockNode);
      
      expect(mockNeo4j.run).toHaveBeenCalledTimes(2);
    });

    it('should handle addition errors', async () => {
      mockNeo4j.run.mockRejectedValueOnce(new Error('Database error'));

      await expect(knowledgeGraph.addKnowledge(mockNode))
        .rejects
        .toThrow(ProcessingError);
    });
  });

  describe('updateKnowledge', () => {
    const mockNode: KnowledgeNode = {
      id: 'test1',
      type: 'CodePattern',
      content: { pattern: 'factory' },
      metadata: {}
    };

    it('should update existing node correctly', async () => {
      mockNeo4j.run.mockResolvedValueOnce({
        records: [{ get: () => ({ properties: {} }) }]
      });

      await knowledgeGraph.updateKnowledge(mockNode);
      
      expect(mockNeo4j.run).toHaveBeenCalled();
    });

    it('should handle non-existent nodes', async () => {
      mockNeo4j.run.mockResolvedValueOnce({ records: [] });

      await expect(knowledgeGraph.updateKnowledge(mockNode))
        .rejects
        .toThrow('Knowledge node not found');
    });
  });

  describe('getGraphStats', () => {
    it('should return correct statistics', async () => {
      mockNeo4j.run.mockResolvedValueOnce({
        records: [{
          get: () => ([
            { type: 'CodePattern', count: 10 },
            { type: 'Algorithm', count: 5 }
          ])
        }]
      });

      const stats = await knowledgeGraph.getGraphStats();
      
      expect(stats.totalNodes).toBe(15);
      expect(stats.nodeTypes.CodePattern).toBe(10);
      expect(stats.nodeTypes.Algorithm).toBe(5);
    });
  });
}); 