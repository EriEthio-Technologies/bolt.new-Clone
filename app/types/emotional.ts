export interface EmotionalSignal {
  type: 'lexical' | 'syntactic' | 'contextual';
  valence: number;  // -1 to 1
  arousal: number;  // -1 to 1
  dominance: number;  // -1 to 1
  confidence: number;  // 0 to 1
  source: string;
  metadata?: Record<string, any>;
}

export interface EmotionalState {
  primary: string;
  intensity: number;
  confidence: number;
  dimensions: {
    valence: number;
    arousal: number;
    dominance: number;
  };
  secondary?: string[];
  metadata?: Record<string, any>;
}

export interface EmotionalContext {
  history: EmotionalState[];
  situation?: {
    type: string;
    intensity: number;
    valence: number;
    metadata?: Record<string, any>;
  };
  relationships?: {
    type: string;
    strength: number;
    valence: number;
    metadata?: Record<string, any>;
  }[];
  environment?: {
    type: string;
    impact: number;
    metadata?: Record<string, any>;
  };
}

export interface EmotionalAnalysis {
  state: EmotionalState;
  timestamp: Date;
  metadata: {
    inputLength: number;
    processingTime: number;
    confidenceScore: number;
    version: string;
  };
  insights: string[];
  recommendations: string[];
} 