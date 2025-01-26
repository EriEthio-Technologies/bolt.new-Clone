export interface PlanningStep {
  id: string;
  description: string;
  prerequisites: string[];
  outcomes: string[];
  estimatedDuration: number;
  confidence: number;
  alternatives?: Array<{
    description: string;
    tradeoffs: Array<{
      aspect: string;
      impact: number;
      explanation: string;
    }>;
  }>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
  };
}

export interface ExecutionContext {
  resources: Array<{
    type: string;
    availability: number;
    constraints?: Record<string, any>;
  }>;
  constraints: {
    maxDuration?: number;
    maxSteps?: number;
    requiredConfidence?: number;
    priorityFactors?: string[];
  };
  dependencies?: Record<string, any>;
}

export interface PlanningGoal {
  objective: string;
  successCriteria: string[];
  constraints?: {
    timeframe?: number;
    resourceLimits?: Record<string, number>;
    qualityThresholds?: Record<string, number>;
  };
  context?: Record<string, any>;
}

export interface ExecutionPlan {
  id: string;
  goal: PlanningGoal;
  steps: PlanningStep[];
  estimatedCompletion: number;
  confidence: number;
  risks: Array<{
    description: string;
    probability: number;
    impact: number;
    mitigation?: string;
  }>;
  alternatives: Array<{
    steps: PlanningStep[];
    tradeoffs: Array<{
      factor: string;
      difference: number;
      explanation: string;
    }>;
  }>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    generationParams: Record<string, any>;
  };
}

export interface PlanningQuery {
  goal: PlanningGoal;
  context: ExecutionContext;
  preferences?: {
    optimizeFor?: Array<'speed' | 'reliability' | 'cost' | 'quality'>;
    riskTolerance?: number;
    preferredApproaches?: string[];
  };
} 