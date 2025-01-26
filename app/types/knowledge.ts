export interface KnowledgeNode {
  id: string;
  type: string;
  content: any;
  metadata: Record<string, any>;
  relations?: KnowledgeRelation[];
  created?: Date;
  lastUpdated?: Date;
}

export interface KnowledgeRelation {
  type: string;
  targetId: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeQuery {
  query: string;
  types?: string[];
  relations?: string[];
  limit?: number;
  minRelevance?: number;
}

export interface KnowledgeResult extends KnowledgeNode {
  relevance: number;
  related: KnowledgeNode[];
}

export interface GraphStats {
  totalNodes: number;
  nodeTypes: Record<string, number>;
  lastUpdated: Date;
} 