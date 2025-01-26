import { Service } from 'typedi';
import { Neo4j } from '@google-cloud/neo4j';
import { validateEnv } from '~/config/env.server';
import type { 
  KnowledgeNode,
  KnowledgeRelation,
  KnowledgeQuery,
  KnowledgeResult,
  GraphStats 
} from '~/types/knowledge';
import { ProcessingError } from '~/errors/ProcessingError';

@Service()
export class KnowledgeGraph {
  private neo4j: Neo4j;
  private readonly defaultLimit = 50;

  constructor() {
    const env = validateEnv();
    this.neo4j = new Neo4j({
      projectId: env.GCP_PROJECT_ID,
      instanceId: env.NEO4J_INSTANCE_ID
    });
  }

  async getRelevantKnowledge(query: KnowledgeQuery): Promise<KnowledgeResult[]> {
    try {
      const cypher = this.buildQueryCypher(query);
      const params = this.buildQueryParams(query);

      const result = await this.neo4j.run(cypher, params);
      return this.processQueryResults(result, query);
    } catch (error) {
      throw new ProcessingError('Failed to retrieve knowledge', error);
    }
  }

  async addKnowledge(node: KnowledgeNode): Promise<void> {
    try {
      const cypher = `
        CREATE (n:${node.type} {
          id: $id,
          content: $content,
          metadata: $metadata,
          created: datetime(),
          lastUpdated: datetime()
        })
      `;

      await this.neo4j.run(cypher, {
        id: node.id,
        content: JSON.stringify(node.content),
        metadata: JSON.stringify(node.metadata)
      });

      await this.createRelations(node);
    } catch (error) {
      throw new ProcessingError('Failed to add knowledge', error);
    }
  }

  async updateKnowledge(node: KnowledgeNode): Promise<void> {
    try {
      const cypher = `
        MATCH (n:${node.type} {id: $id})
        SET n.content = $content,
            n.metadata = $metadata,
            n.lastUpdated = datetime()
        RETURN n
      `;

      const result = await this.neo4j.run(cypher, {
        id: node.id,
        content: JSON.stringify(node.content),
        metadata: JSON.stringify(node.metadata)
      });

      if (result.records.length === 0) {
        throw new ProcessingError('Knowledge node not found');
      }

      await this.updateRelations(node);
    } catch (error) {
      throw new ProcessingError('Failed to update knowledge', error);
    }
  }

  async getGraphStats(): Promise<GraphStats> {
    try {
      const cypher = `
        MATCH (n)
        WITH labels(n) as type, count(n) as count
        RETURN collect({type: type[0], count: count}) as stats
      `;

      const result = await this.neo4j.run(cypher);
      return this.processGraphStats(result);
    } catch (error) {
      throw new ProcessingError('Failed to get graph stats', error);
    }
  }

  private buildQueryCypher(query: KnowledgeQuery): string {
    const { types, relations, limit = this.defaultLimit } = query;
    
    let cypher = 'MATCH (n)';
    
    if (types?.length) {
      cypher += ` WHERE any(type IN labels(n) WHERE type IN $types)`;
    }

    if (relations?.length) {
      cypher += ` WITH n MATCH (n)-[r:${relations.join('|')}]->(related)`;
    }

    cypher += `
      WITH n, related
      WHERE n.content CONTAINS $searchText
      RETURN n, collect(related) as related
      LIMIT $limit
    `;

    return cypher;
  }

  private buildQueryParams(query: KnowledgeQuery): Record<string, any> {
    return {
      types: query.types || [],
      searchText: query.query.toLowerCase(),
      limit: query.limit || this.defaultLimit
    };
  }

  private async createRelations(node: KnowledgeNode): Promise<void> {
    if (!node.relations?.length) return;

    const cypher = `
      MATCH (n:${node.type} {id: $nodeId})
      UNWIND $relations as rel
      MATCH (target {id: rel.targetId})
      CREATE (n)-[r:${rel.type} {metadata: $metadata}]->(target)
    `;

    await this.neo4j.run(cypher, {
      nodeId: node.id,
      relations: node.relations,
      metadata: JSON.stringify({})
    });
  }

  private async updateRelations(node: KnowledgeNode): Promise<void> {
    // Delete existing relations
    await this.neo4j.run(`
      MATCH (n:${node.type} {id: $id})-[r]-()
      DELETE r
    `, { id: node.id });

    // Create new relations
    await this.createRelations(node);
  }

  private processQueryResults(
    result: any,
    query: KnowledgeQuery
  ): KnowledgeResult[] {
    return result.records.map(record => {
      const node = record.get('n');
      const related = record.get('related');

      return {
        id: node.properties.id,
        type: node.labels[0],
        content: JSON.parse(node.properties.content),
        metadata: JSON.parse(node.properties.metadata),
        created: new Date(node.properties.created),
        lastUpdated: new Date(node.properties.lastUpdated),
        relevance: this.calculateRelevance(node, query),
        related: related.map(this.processRelatedNode)
      };
    });
  }

  private processRelatedNode(node: any): KnowledgeNode {
    return {
      id: node.properties.id,
      type: node.labels[0],
      content: JSON.parse(node.properties.content),
      metadata: JSON.parse(node.properties.metadata)
    };
  }

  private processGraphStats(result: any): GraphStats {
    const stats = result.records[0].get('stats');
    
    return {
      totalNodes: stats.reduce((sum: number, s: any) => sum + s.count, 0),
      nodeTypes: stats.reduce((acc: Record<string, number>, s: any) => {
        acc[s.type] = s.count;
        return acc;
      }, {}),
      lastUpdated: new Date()
    };
  }

  private calculateRelevance(node: any, query: KnowledgeQuery): number {
    let relevance = 0;

    // Type match
    if (query.types?.includes(node.labels[0])) {
      relevance += 0.3;
    }

    // Content match
    const contentMatch = JSON.parse(node.properties.content)
      .toString()
      .toLowerCase()
      .includes(query.query.toLowerCase());
    if (contentMatch) {
      relevance += 0.4;
    }

    // Recency boost
    const ageInDays = (
      Date.now() - new Date(node.properties.lastUpdated).getTime()
    ) / (1000 * 60 * 60 * 24);
    relevance += Math.max(0, 0.3 - (ageInDays / 30) * 0.3); // Decay over 30 days

    return Math.min(1, relevance);
  }
} 