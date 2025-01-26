import { Service } from 'typedi';
import { Neo4j } from 'neo4j-driver';
import type { Node, Relationship, GraphQuery } from '~/types/ai';

@Service()
export class KnowledgeGraph {
  private driver: Neo4j.Driver;

  constructor() {
    this.driver = Neo4j.driver(
      process.env.NEO4J_URI!,
      Neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
    );
  }

  async query(query: GraphQuery): Promise<Node[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(query.cypher, query.params);
      return result.records.map(record => record.get('node').properties);
    } finally {
      await session.close();
    }
  }

  async addNode(node: Node): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        'CREATE (n:Concept {id: $id, type: $type, data: $data})',
        node
      );
    } finally {
      await session.close();
    }
  }

  async addRelationship(relationship: Relationship): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (a:Concept {id: $fromId})
        MATCH (b:Concept {id: $toId})
        CREATE (a)-[r:${relationship.type} {properties: $properties}]->(b)
        `,
        relationship
      );
    } finally {
      await session.close();
    }
  }
} 