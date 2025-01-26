export interface Observation {
  id: string;
  description: string;
  timestamp: Date;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface Hypothesis {
  id: string;
  description: string;
  explanation: string;
  confidence: number;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  assumptions: string[];
  implications: string[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    source: string;
    version: string;
  };
}

export interface AbductiveAnalysis {
  observations: Observation[];
  hypotheses: Hypothesis[];
  rankedHypotheses: Array<{
    hypothesisId: string;
    score: number;
    reasoning: string[];
  }>;
  insights: {
    keyFactors: string[];
    uncertainties: Array<{
      factor: string;
      impact: number;
      mitigation?: string;
    }>;
    gaps: Array<{
      description: string;
      criticality: number;
      suggestedAction?: string;
    }>;
  };
  recommendations: Array<{
    action: string;
    confidence: number;
    impact: number;
    rationale: string;
    prerequisites?: string[];
  }>;
  metadata: {
    timestamp: Date;
    processingTime: number;
    version: string;
    confidence: number;
  };
}

export interface AbductiveQuery {
  observations: string[];
  context?: Record<string, any>;
  constraints?: {
    maxHypotheses?: number;
    minConfidence?: number;
    includeTypes?: string[];
    excludeTypes?: string[];
  };
} 