export interface NLPResult {
  tokens: string[];
  embeddings: number[][];
  entities: Entity[];
  intent: Intent;
}

export interface Entity {
  text: string;
  type: string;
  start: number;
  end: number;
  confidence: number;
}

export interface Intent {
  type: string;
  confidence: number;
  subIntents?: Intent[];
  parameters?: Record<string, any>;
}

export interface ContextData {
  query: string;
  entities: Entity[];
  intent: Intent;
  projectContext?: any;
  userContext?: any;
}

export interface EnrichedContext extends ContextData {
  temporalContext: any;
  spatialContext: any;
  domainContext: any;
}

export interface ReasoningChain {
  steps: ReasoningStep[];
  confidence: number;
  alternatives: ReasoningChain[];
}

export interface ReasoningStep {
  type: 'causal' | 'abductive' | 'deductive';
  description: string;
  evidence: any[];
  confidence: number;
}

export interface AIResponse {
  text: string;
  reasoning: ReasoningChain;
  confidence: number;
  suggestedActions: Action[];
}

export interface Action {
  type: string;
  description: string;
  parameters: Record<string, any>;
}

export interface NERResult {
  entities: Entity[];
  entityGroups: Entity[][];
  confidence: number;
}

export interface ProcessingError extends Error {
  code?: string;
  originalError?: Error;
}

export interface IntentContext {
  recentIntents: string[];
  projectType: string;
  preferredLanguage?: string;
  preferredFramework?: string;
  testingFramework?: string;
  coverageThreshold?: number;
  optimizationTarget?: string;
  performanceMetric?: string;
  projectRequirements: string[];
}

export interface ProcessingStage {
  stage: string;
  result: any;
}

export interface ErrorMetadata {
  query: string;
  processingStages: ProcessingStage[];
  lastStage?: string;
  context?: any;
}

export interface RetryConfig {
  maxRetries: number;
  backoffFactor: number;
  initialDelay: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
} 