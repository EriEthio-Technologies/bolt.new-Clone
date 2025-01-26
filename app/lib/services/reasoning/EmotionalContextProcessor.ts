import { Service } from 'typedi';
import { validateEnv } from '~/config/env.server';
import { VersioningMonitor } from '../monitoring/VersioningMonitor';
import type { 
  EmotionalContext,
  EmotionalSignal,
  EmotionalAnalysis,
  EmotionalState 
} from '~/types/emotional';

@Service()
export class EmotionalContextProcessor {
  private readonly env: ReturnType<typeof validateEnv>;

  constructor(
    private readonly monitor: VersioningMonitor
  ) {
    this.env = validateEnv();
  }

  async processEmotionalContext(
    input: string,
    context: EmotionalContext
  ): Promise<EmotionalAnalysis> {
    try {
      const signals = await this.extractEmotionalSignals(input);
      const baseState = await this.determineBaseEmotionalState(signals);
      const contextualState = await this.applyContextualFactors(baseState, context);
      const analysis = await this.generateEmotionalAnalysis(contextualState, input);

      await this.monitor.trackEmotionalAnalysis(analysis);
      return analysis;
    } catch (error) {
      console.error('Failed to process emotional context:', error);
      throw new Error(`Emotional context processing failed: ${error.message}`);
    }
  }

  private async extractEmotionalSignals(input: string): Promise<EmotionalSignal[]> {
    const signals: EmotionalSignal[] = [];
    
    // Lexical analysis for emotional indicators
    const lexicalSignals = await this.analyzeLexicalEmotions(input);
    signals.push(...lexicalSignals);

    // Syntactic pattern analysis
    const syntacticSignals = await this.analyzeSyntacticPatterns(input);
    signals.push(...syntacticSignals);

    // Contextual cues analysis
    const contextualSignals = await this.analyzeContextualCues(input);
    signals.push(...contextualSignals);

    return signals;
  }

  private async determineBaseEmotionalState(
    signals: EmotionalSignal[]
  ): Promise<EmotionalState> {
    const weights = {
      lexical: 0.4,
      syntactic: 0.3,
      contextual: 0.3
    };

    const aggregatedScores = signals.reduce((scores, signal) => ({
      valence: scores.valence + (signal.valence * weights[signal.type]),
      arousal: scores.arousal + (signal.arousal * weights[signal.type]),
      dominance: scores.dominance + (signal.dominance * weights[signal.type])
    }), { valence: 0, arousal: 0, dominance: 0 });

    return {
      primary: this.mapToEmotionCategory(aggregatedScores),
      intensity: this.calculateIntensity(aggregatedScores),
      confidence: this.calculateConfidence(signals),
      dimensions: aggregatedScores
    };
  }

  private async applyContextualFactors(
    baseState: EmotionalState,
    context: EmotionalContext
  ): Promise<EmotionalState> {
    const contextualModifiers = {
      historicalBias: 0.2,
      situationalIntensity: 0.3,
      relationshipDynamics: 0.25,
      environmentalFactors: 0.25
    };

    const modifiedState = { ...baseState };

    // Apply historical context
    if (context.history.length > 0) {
      const historicalTrend = this.analyzeHistoricalTrend(context.history);
      modifiedState.dimensions = this.applyHistoricalBias(
        modifiedState.dimensions,
        historicalTrend,
        contextualModifiers.historicalBias
      );
    }

    // Apply situational modifiers
    if (context.situation) {
      modifiedState.dimensions = this.applySituationalModifiers(
        modifiedState.dimensions,
        context.situation,
        contextualModifiers.situationalIntensity
      );
    }

    // Recalculate primary emotion and intensity
    modifiedState.primary = this.mapToEmotionCategory(modifiedState.dimensions);
    modifiedState.intensity = this.calculateIntensity(modifiedState.dimensions);

    return modifiedState;
  }

  private async generateEmotionalAnalysis(
    state: EmotionalState,
    input: string
  ): Promise<EmotionalAnalysis> {
    return {
      state,
      timestamp: new Date(),
      metadata: {
        inputLength: input.length,
        processingTime: Date.now(),
        confidenceScore: state.confidence,
        version: '1.0.0'
      },
      insights: await this.generateEmotionalInsights(state, input),
      recommendations: await this.generateActionableRecommendations(state)
    };
  }

  private async analyzeLexicalEmotions(input: string): Promise<EmotionalSignal[]> {
    const signals: EmotionalSignal[] = [];
    
    // Emotion word dictionary with VAD scores
    const emotionLexicon = {
      happy: { valence: 0.8, arousal: 0.7, dominance: 0.6 },
      sad: { valence: -0.7, arousal: -0.3, dominance: -0.4 },
      angry: { valence: -0.8, arousal: 0.8, dominance: 0.7 },
      afraid: { valence: -0.7, arousal: 0.7, dominance: -0.6 },
      // ... more emotion words
    };

    const words = input.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      if (word in emotionLexicon) {
        signals.push({
          type: 'lexical',
          ...emotionLexicon[word],
          confidence: 0.8,
          source: word
        });
      }
    }

    // Analyze intensifiers
    const intensifiers = ['very', 'really', 'extremely', 'incredibly'];
    words.forEach((word, i) => {
      if (intensifiers.includes(word) && signals[i + 1]) {
        signals[i + 1].valence *= 1.5;
        signals[i + 1].arousal *= 1.5;
      }
    });

    return signals;
  }

  private async analyzeSyntacticPatterns(input: string): Promise<EmotionalSignal[]> {
    const signals: EmotionalSignal[] = [];
    
    // Question patterns
    if (input.match(/\?{2,}/)) {
      signals.push({
        type: 'syntactic',
        valence: -0.3,
        arousal: 0.7,
        dominance: -0.2,
        confidence: 0.7,
        source: 'multiple_questions'
      });
    }

    // Exclamation patterns
    if (input.match(/!{2,}/)) {
      signals.push({
        type: 'syntactic',
        valence: 0,
        arousal: 0.8,
        dominance: 0.4,
        confidence: 0.7,
        source: 'multiple_exclamations'
      });
    }

    // Capitalization patterns
    if (input.match(/[A-Z]{3,}/)) {
      signals.push({
        type: 'syntactic',
        valence: 0,
        arousal: 0.6,
        dominance: 0.5,
        confidence: 0.6,
        source: 'capitalization'
      });
    }

    return signals;
  }

  private async analyzeContextualCues(input: string): Promise<EmotionalSignal[]> {
    const signals: EmotionalSignal[] = [];
    
    // Time-related cues
    const timePatterns = {
      urgent: /urgent|asap|immediately|right now/i,
      deadline: /deadline|due|by|until/i,
      waiting: /waiting|waited|still|yet/i
    };

    if (timePatterns.urgent.test(input)) {
      signals.push({
        type: 'contextual',
        valence: -0.3,
        arousal: 0.8,
        dominance: 0.4,
        confidence: 0.7,
        source: 'urgency'
      });
    }

    // Social cues
    const socialPatterns = {
      agreement: /agree|yes|absolutely|definitely/i,
      disagreement: /disagree|no|never|wrong/i,
      gratitude: /thank|grateful|appreciate/i
    };

    Object.entries(socialPatterns).forEach(([type, pattern]) => {
      if (pattern.test(input)) {
        signals.push({
          type: 'contextual',
          ...this.getSocialCueValues(type),
          confidence: 0.75,
          source: `social_${type}`
        });
      }
    });

    return signals;
  }

  private getSocialCueValues(type: string): { valence: number; arousal: number; dominance: number } {
    const cueValues = {
      agreement: { valence: 0.6, arousal: 0.3, dominance: 0.4 },
      disagreement: { valence: -0.5, arousal: 0.5, dominance: 0.6 },
      gratitude: { valence: 0.8, arousal: 0.4, dominance: 0.3 }
    };
    return cueValues[type] || { valence: 0, arousal: 0, dominance: 0 };
  }

  private analyzeHistoricalTrend(history: EmotionalState[]): {
    trend: 'stable' | 'increasing' | 'decreasing';
    dominantEmotion: string;
    volatility: number;
  } {
    if (history.length < 2) {
      return { trend: 'stable', dominantEmotion: 'neutral', volatility: 0 };
    }

    const valenceChanges = history.slice(1).map((state, i) => 
      state.dimensions.valence - history[i].dimensions.valence
    );

    const trend = valenceChanges.reduce((sum, change) => sum + change, 0) > 0 
      ? 'increasing' 
      : valenceChanges.reduce((sum, change) => sum + change, 0) < 0 
        ? 'decreasing' 
        : 'stable';

    const emotionCounts = history.reduce((counts, state) => {
      counts[state.primary] = (counts[state.primary] || 0) + 1;
      return counts;
    }, {});

    const dominantEmotion = Object.entries(emotionCounts)
      .reduce((max, [emotion, count]) => 
        count > max[1] ? [emotion, count] : max, ['neutral', 0]
      )[0];

    const volatility = Math.sqrt(
      valenceChanges.reduce((sum, change) => sum + Math.pow(change, 2), 0) / 
      valenceChanges.length
    );

    return { trend, dominantEmotion, volatility };
  }

  private applyHistoricalBias(
    dimensions: { valence: number; arousal: number; dominance: number },
    historicalTrend: ReturnType<typeof this.analyzeHistoricalTrend>,
    weight: number
  ): typeof dimensions {
    const biasFactors = {
      stable: 0.1,
      increasing: 0.2,
      decreasing: -0.2
    };

    const volatilityFactor = Math.min(historicalTrend.volatility * 2, 1);
    const trendBias = biasFactors[historicalTrend.trend] * weight;

    return {
      valence: dimensions.valence + trendBias * (1 - volatilityFactor),
      arousal: dimensions.arousal * (1 + volatilityFactor * weight),
      dominance: dimensions.dominance * (1 - volatilityFactor * weight)
    };
  }

  private applySituationalModifiers(
    dimensions: { valence: number; arousal: number; dominance: number },
    situation: NonNullable<EmotionalContext['situation']>,
    weight: number
  ): typeof dimensions {
    const intensityFactor = situation.intensity * weight;
    const valenceBias = situation.valence * weight;

    return {
      valence: dimensions.valence + valenceBias,
      arousal: dimensions.arousal * (1 + intensityFactor),
      dominance: dimensions.dominance * (1 + (situation.valence > 0 ? intensityFactor : -intensityFactor))
    };
  }

  private mapToEmotionCategory(dimensions: {
    valence: number;
    arousal: number;
    dominance: number;
  }): string {
    // Implementation for mapping VAD dimensions to emotion categories
    return 'neutral';
  }

  private calculateIntensity(dimensions: {
    valence: number;
    arousal: number;
    dominance: number;
  }): number {
    return Math.sqrt(
      Math.pow(dimensions.valence, 2) +
      Math.pow(dimensions.arousal, 2) +
      Math.pow(dimensions.dominance, 2)
    ) / Math.sqrt(3);
  }

  private calculateConfidence(signals: EmotionalSignal[]): number {
    // Implementation for calculating confidence score
    return 0.8;
  }

  private async generateEmotionalInsights(
    state: EmotionalState,
    input: string
  ): Promise<string[]> {
    const insights: string[] = [];

    // Emotional state insights
    if (state.intensity > 0.7) {
      insights.push(`High emotional intensity detected (${(state.intensity * 100).toFixed(1)}%)`);
    }

    if (state.confidence < 0.6) {
      insights.push('Low confidence in emotional analysis - consider additional context');
    }

    // Dimensional analysis
    if (Math.abs(state.dimensions.valence) > 0.7) {
      insights.push(
        state.dimensions.valence > 0 
          ? 'Strong positive emotional valence present'
          : 'Strong negative emotional valence present'
      );
    }

    if (state.dimensions.arousal > 0.7) {
      insights.push('High emotional arousal indicates heightened state');
    }

    if (Math.abs(state.dimensions.dominance) > 0.7) {
      insights.push(
        state.dimensions.dominance > 0
          ? 'Strong sense of control/dominance expressed'
          : 'Significant feeling of being controlled/submissive'
      );
    }

    return insights;
  }

  private async generateActionableRecommendations(
    state: EmotionalState
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Based on emotional intensity
    if (state.intensity > 0.8) {
      recommendations.push(
        'Consider taking a moment to process these strong emotions before responding'
      );
    }

    // Based on valence
    if (state.dimensions.valence < -0.6) {
      recommendations.push(
        'Acknowledge the negative feelings and consider positive reframing'
      );
    }

    // Based on arousal
    if (state.dimensions.arousal > 0.7) {
      recommendations.push(
        'High emotional energy detected - consider calming techniques if needed'
      );
    }

    // Based on dominance
    if (state.dimensions.dominance < -0.6) {
      recommendations.push(
        'Focus on aspects within your control to improve sense of agency'
      );
    }

    // Based on confidence
    if (state.confidence < 0.7) {
      recommendations.push(
        'Consider seeking additional context to better understand the emotional state'
      );
    }

    return recommendations;
  }
} 