export interface CausalNode {
  id: string;
  type: 'event' | 'condition' | 'action' | 'outcome';
  description: string;
  confidence: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface CausalLink {
  id: string;
  source: string;
  target: string;
  type: 'causes' | 'influences' | 'prevents' | 'enables';
  strength: number;  // 0 to 1
  confidence: number;
  evidence?: string[];
  metadata?: Record<string, any>;
}

export interface CausalChain {
  id: string;
  nodes: CausalNode[];
  links: CausalLink[];
  rootCause?: string;  // Node ID
  finalEffect?: string;  // Node ID
  confidence: number;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    source: string;
  };
}

export interface CausalAnalysis {
  chain: CausalChain;
  insights: {
    keyFactors: string[];
    criticalPaths: Array<{
      path: string[];
      impact: number;
    }>;
    uncertainties: Array<{
      node: string;
      reason: string;
      impact: number;
    }>;
  };
  recommendations: Array<{
    action: string;
    impact: number;
    confidence: number;
    rationale: string;
  }>;
}

export interface CausalQuery {
  event: string;
  context?: Record<string, any>;
  constraints?: {
    maxDepth?: number;
    minConfidence?: number;
    includeTypes?: CausalNode['type'][];
    excludeTypes?: CausalNode['type'][];
  };
} 