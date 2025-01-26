export interface InferenceContext {
  query: string;
  intent: {
    type: string;
    confidence: number;
  };
  entities: Array<{
    text: string;
    type: string;
    confidence: number;
  }>;
  projectContext?: any;
}

export interface InferenceResult {
  result: any;
  confidence: number;
  reasoning: ReasoningChain;
  metadata: {
    knowledgeUsed: string[];
    rulesApplied: InferenceRule[];
    modelVersion: string;
  };
}

export interface ReasoningChain {
  steps: Array<{
    type: string;
    description: string;
    evidence: any[];
    confidence: number;
  }>;
  confidence: number;
  alternatives: ReasoningChain[];
}

export interface InferenceRule {
  name: string;
  condition: (context: any) => boolean;
  action: (context: any) => any;
  evidence: any[];
  confidence: number;
}

export interface ModelPrediction {
  text: string;
  confidence: number;
  type: string;
}

export interface ConfidenceScore {
  value: number;
  factors: {
    name: string;
    weight: number;
    score: number;
  }[];
}

export interface RuleResult {
  results: any[];
  appliedRules: InferenceRule[];
  confidence: number;
}

export interface RuleSet {
  [key: string]: InferenceRule;
}

export interface RuleMetadata {
  category: string;
  priority: number;
  description: string;
  requiredEntities?: string[];
}

export interface RuleAction {
  type: string;
  parameters?: any;
  confidence?: number;
} 