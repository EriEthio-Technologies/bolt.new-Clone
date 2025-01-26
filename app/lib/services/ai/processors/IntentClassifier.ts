import { Service } from 'typedi';
import { pipeline } from '@xenova/transformers';
import type { Intent, IntentContext } from '~/types/ai';
import { ProcessingError } from '~/errors/ProcessingError';

@Service()
export class IntentClassifier {
  private model: any;
  private readonly intentMap = new Map<string, string>([
    ['create', 'code_generation'],
    ['generate', 'code_generation'],
    ['build', 'code_generation'],
    ['implement', 'code_generation'],
    ['fix', 'code_fix'],
    ['debug', 'code_fix'],
    ['solve', 'code_fix'],
    ['explain', 'explanation'],
    ['describe', 'explanation'],
    ['how', 'explanation'],
    ['test', 'testing'],
    ['verify', 'testing'],
    ['validate', 'testing'],
    ['optimize', 'optimization'],
    ['improve', 'optimization'],
    ['refactor', 'optimization']
  ]);

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      this.model = await pipeline('text-classification', 'Xenova/code-intent-classifier');
    } catch (error) {
      throw new ProcessingError('Failed to initialize intent classifier', error);
    }
  }

  async classifyIntent(text: string, context: IntentContext): Promise<Intent> {
    try {
      // Get base classification from model
      const [prediction] = await this.model(text);
      
      // Enhance with rule-based classification
      const ruleBasedIntent = this.getRuleBasedIntent(text);
      
      // Combine model and rule-based predictions
      const combinedIntent = this.combineIntents(
        prediction,
        ruleBasedIntent,
        context
      );

      return {
        type: combinedIntent.type,
        confidence: combinedIntent.confidence,
        subIntents: combinedIntent.subIntents,
        parameters: combinedIntent.parameters
      };
    } catch (error) {
      throw new ProcessingError('Intent classification failed', error);
    }
  }

  private getRuleBasedIntent(text: string): Partial<Intent> {
    const words = text.toLowerCase().split(/\s+/);
    const matches = new Map<string, number>();

    // Count intent-related keywords
    for (const word of words) {
      const intent = this.intentMap.get(word);
      if (intent) {
        matches.set(intent, (matches.get(intent) || 0) + 1);
      }
    }

    if (matches.size === 0) {
      return { type: 'unknown', confidence: 0.3 };
    }

    // Find the most frequent intent
    let maxCount = 0;
    let primaryIntent = '';
    for (const [intent, count] of matches) {
      if (count > maxCount) {
        maxCount = count;
        primaryIntent = intent;
      }
    }

    return {
      type: primaryIntent,
      confidence: Math.min(0.8, 0.5 + (maxCount * 0.1))
    };
  }

  private combineIntents(
    modelIntent: { label: string; score: number },
    ruleIntent: Partial<Intent>,
    context: IntentContext
  ): Intent {
    // Combine confidences using weighted average
    const modelWeight = 0.7;
    const ruleWeight = 0.3;

    const combinedConfidence =
      (modelIntent.score * modelWeight) +
      ((ruleIntent.confidence || 0) * ruleWeight);

    // Determine primary intent type
    const primaryType = this.reconcileIntentTypes(
      modelIntent.label,
      ruleIntent.type || 'unknown',
      context
    );

    // Extract parameters based on intent type
    const parameters = this.extractIntentParameters(
      primaryType,
      context
    );

    // Identify sub-intents
    const subIntents = this.identifySubIntents(
      primaryType,
      context
    );

    return {
      type: primaryType,
      confidence: combinedConfidence,
      subIntents,
      parameters
    };
  }

  private reconcileIntentTypes(
    modelType: string,
    ruleType: string,
    context: IntentContext
  ): string {
    // If both types agree, use that type
    if (modelType === ruleType) {
      return modelType;
    }

    // If one type is unknown, use the other
    if (modelType === 'unknown') return ruleType;
    if (ruleType === 'unknown') return modelType;

    // Use context to break ties
    const { recentIntents, projectType } = context;

    // Check if either intent type matches recent activity
    if (recentIntents.includes(modelType)) return modelType;
    if (recentIntents.includes(ruleType)) return ruleType;

    // Consider project type
    const projectIntentMap: Record<string, string[]> = {
      'frontend': ['ui_generation', 'styling', 'component_creation'],
      'backend': ['api_creation', 'database', 'authentication'],
      'fullstack': ['code_generation', 'integration', 'deployment']
    };

    const relevantIntents = projectIntentMap[projectType] || [];
    if (relevantIntents.includes(modelType)) return modelType;
    if (relevantIntents.includes(ruleType)) return ruleType;

    // Default to model prediction if no other criteria match
    return modelType;
  }

  private extractIntentParameters(
    intentType: string,
    context: IntentContext
  ): Record<string, any> {
    const parameters: Record<string, any> = {};

    switch (intentType) {
      case 'code_generation':
        parameters.language = context.preferredLanguage;
        parameters.framework = context.preferredFramework;
        break;
      case 'testing':
        parameters.testType = context.testingFramework;
        parameters.coverage = context.coverageThreshold;
        break;
      case 'optimization':
        parameters.target = context.optimizationTarget;
        parameters.metric = context.performanceMetric;
        break;
    }

    return parameters;
  }

  private identifySubIntents(
    primaryIntent: string,
    context: IntentContext
  ): Intent[] {
    const subIntents: Intent[] = [];

    // Common sub-intents based on primary intent
    const intentHierarchy: Record<string, string[]> = {
      'code_generation': ['testing', 'documentation', 'validation'],
      'testing': ['coverage', 'performance', 'security'],
      'optimization': ['performance', 'memory', 'security'],
      'explanation': ['context', 'examples', 'best_practices']
    };

    const potentialSubIntents = intentHierarchy[primaryIntent] || [];
    
    for (const subIntent of potentialSubIntents) {
      if (this.isSubIntentRelevant(subIntent, context)) {
        subIntents.push({
          type: subIntent,
          confidence: 0.7, // Sub-intents have lower confidence
          parameters: this.extractIntentParameters(subIntent, context)
        });
      }
    }

    return subIntents;
  }

  private isSubIntentRelevant(
    subIntent: string,
    context: IntentContext
  ): boolean {
    // Check if sub-intent is relevant based on context
    const { projectRequirements, recentIntents } = context;

    // Check project requirements
    if (projectRequirements.includes(subIntent)) return true;

    // Check recent activity
    if (recentIntents.includes(subIntent)) return true;

    return false;
  }
} 