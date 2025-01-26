export interface ConceptNode {
  id: string;
  name: string;
  type: 'entity' | 'action' | 'state' | 'relation';
  properties: Record<string, any>;
  confidence: number;
  metadata: {
    source: string;
    timestamp: Date;
    version: string;
  };
}

export interface ConceptRelation {
  id: string;
  source: string;
  target: string;
  type: 'isA' | 'hasProperty' | 'canDo' | 'usedFor' | 'causes' | 'requires';
  confidence: number;
  metadata?: Record<string, any>;
}

export interface CommonSenseKnowledge {
  concepts: ConceptNode[];
  relations: ConceptRelation[];
  metadata: {
    lastUpdated: Date;
    version: string;
    source: string;
  };
}

export interface ReasoningContext {
  domain?: string;
  constraints?: {
    minConfidence?: number;
    maxDepth?: number;
    includeTypes?: ConceptNode['type'][];
    excludeTypes?: ConceptNode['type'][];
  };
  priorKnowledge?: CommonSenseKnowledge;
}

export interface CommonSenseQuery {
  statement: string;
  context?: ReasoningContext;
  requireExplanation?: boolean;
}

export interface CommonSenseInference {
  conclusion: string;
  confidence: number;
  explanation: string[];
  supportingFacts: Array<{
    concept: string;
    relation: string;
    confidence: number;
  }>;
  assumptions: string[];
  alternatives: Array<{
    conclusion: string;
    confidence: number;
    reasoning: string;
  }>;
  metadata: {
    processingTime: number;
    timestamp: Date;
    reasoningDepth: number;
  };
} 