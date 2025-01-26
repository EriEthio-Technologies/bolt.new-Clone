import { Service } from 'typedi';
import type { 
  InferenceRule, 
  InferenceContext,
  RuleResult,
  RuleSet,
  RuleMetadata 
} from '~/types/inference';
import { ProcessingError } from '~/errors/ProcessingError';

@Service()
export class RuleEngine {
  private rules: Map<string, InferenceRule>;
  private readonly defaultConfidence = 0.85;

  constructor() {
    this.rules = new Map();
    this.initializeRules();
  }

  private initializeRules() {
    // Code Generation Rules
    this.addRule({
      name: 'function_generation',
      condition: (context: InferenceContext) => 
        context.intent.type === 'code_generation' &&
        context.entities.some(e => e.type === 'FUNCTION'),
      action: (context: InferenceContext) => ({
        type: 'function_template',
        parameters: this.extractFunctionParameters(context)
      }),
      metadata: {
        category: 'code_generation',
        priority: 1,
        description: 'Generate function template based on context'
      }
    });

    // Error Handling Rules
    this.addRule({
      name: 'error_resolution',
      condition: (context: InferenceContext) =>
        context.intent.type === 'error_fix' &&
        context.entities.some(e => e.type === 'ERROR'),
      action: (context: InferenceContext) => ({
        type: 'error_solution',
        fixes: this.generateErrorFixes(context)
      }),
      metadata: {
        category: 'error_handling',
        priority: 2,
        description: 'Propose solutions for identified errors'
      }
    });

    // Testing Rules
    this.addRule({
      name: 'test_generation',
      condition: (context: InferenceContext) =>
        context.intent.type === 'testing' &&
        context.entities.some(e => ['FUNCTION', 'CLASS'].includes(e.type)),
      action: (context: InferenceContext) => ({
        type: 'test_template',
        scenarios: this.generateTestScenarios(context)
      }),
      metadata: {
        category: 'testing',
        priority: 1,
        description: 'Generate test cases based on context'
      }
    });

    // Code Optimization Rules
    this.addRule({
      name: 'performance_optimization',
      condition: (context: InferenceContext) =>
        context.intent.type === 'optimization' &&
        context.entities.some(e => e.type === 'PERFORMANCE_METRIC'),
      action: (context: InferenceContext) => ({
        type: 'optimization_suggestions',
        optimizations: this.generateOptimizations(context)
      }),
      metadata: {
        category: 'optimization',
        priority: 3,
        description: 'Suggest performance optimizations'
      }
    });
  }

  async applyRules(
    context: InferenceContext,
    knowledge: any[]
  ): Promise<RuleResult> {
    try {
      const applicableRules = this.findApplicableRules(context);
      const results: any[] = [];
      const appliedRules: InferenceRule[] = [];

      for (const rule of applicableRules) {
        const ruleResult = await this.executeRule(rule, context, knowledge);
        if (ruleResult) {
          results.push(ruleResult);
          appliedRules.push(rule);
        }
      }

      return {
        results,
        appliedRules,
        confidence: this.calculateRuleConfidence(appliedRules, context)
      };
    } catch (error) {
      throw new ProcessingError('Rule application failed', error);
    }
  }

  private findApplicableRules(context: InferenceContext): InferenceRule[] {
    const applicableRules: InferenceRule[] = [];

    for (const rule of this.rules.values()) {
      try {
        if (rule.condition(context)) {
          applicableRules.push(rule);
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.name}:`, error);
      }
    }

    return this.prioritizeRules(applicableRules);
  }

  private async executeRule(
    rule: InferenceRule,
    context: InferenceContext,
    knowledge: any[]
  ): Promise<any> {
    try {
      const enrichedContext = {
        ...context,
        knowledge,
        timestamp: new Date()
      };

      const result = await Promise.resolve(rule.action(enrichedContext));
      return {
        ...result,
        ruleName: rule.name,
        confidence: rule.confidence || this.defaultConfidence
      };
    } catch (error) {
      console.error(`Error executing rule ${rule.name}:`, error);
      return null;
    }
  }

  private calculateRuleConfidence(
    rules: InferenceRule[],
    context: InferenceContext
  ): number {
    if (rules.length === 0) return 0;

    const weights = {
      intent_match: 0.4,
      entity_match: 0.3,
      rule_confidence: 0.3
    };

    const scores = rules.map(rule => {
      const intentMatch = rule.metadata.category === context.intent.type ? 1 : 0;
      const entityMatch = this.calculateEntityMatch(rule, context);
      const ruleConfidence = rule.confidence || this.defaultConfidence;

      return (
        intentMatch * weights.intent_match +
        entityMatch * weights.entity_match +
        ruleConfidence * weights.rule_confidence
      );
    });

    return scores.reduce((sum, score) => sum + score, 0) / rules.length;
  }

  private calculateEntityMatch(
    rule: InferenceRule,
    context: InferenceContext
  ): number {
    const ruleEntities = rule.metadata.requiredEntities || [];
    if (ruleEntities.length === 0) return 1;

    const matchedEntities = ruleEntities.filter(type =>
      context.entities.some(e => e.type === type)
    );

    return matchedEntities.length / ruleEntities.length;
  }

  private prioritizeRules(rules: InferenceRule[]): InferenceRule[] {
    return rules.sort((a, b) => {
      const priorityA = a.metadata.priority || 0;
      const priorityB = b.metadata.priority || 0;
      return priorityB - priorityA;
    });
  }

  private addRule(rule: Omit<InferenceRule, 'confidence'> & { metadata: RuleMetadata }): void {
    this.rules.set(rule.name, {
      ...rule,
      confidence: this.defaultConfidence,
      evidence: []
    });
  }

  // Helper methods for rule actions
  private extractFunctionParameters(context: InferenceContext): any {
    const functionEntity = context.entities.find(e => e.type === 'FUNCTION');
    return {
      name: functionEntity?.text || 'newFunction',
      parameters: context.entities
        .filter(e => e.type === 'PARAMETER')
        .map(e => ({ name: e.text, type: 'any' }))
    };
  }

  private generateErrorFixes(context: InferenceContext): any[] {
    const errorEntity = context.entities.find(e => e.type === 'ERROR');
    return [{
      description: `Fix for ${errorEntity?.text || 'error'}`,
      solution: 'Implement error fix',
      confidence: 0.8
    }];
  }

  private generateTestScenarios(context: InferenceContext): any[] {
    const testableEntity = context.entities.find(
      e => ['FUNCTION', 'CLASS'].includes(e.type)
    );
    return [{
      description: `Test ${testableEntity?.text || 'component'}`,
      testCases: ['positive case', 'negative case', 'edge case']
    }];
  }

  private generateOptimizations(context: InferenceContext): any[] {
    const metricEntity = context.entities.find(
      e => e.type === 'PERFORMANCE_METRIC'
    );
    return [{
      target: metricEntity?.text || 'performance',
      suggestions: ['Implement caching', 'Optimize algorithms', 'Reduce complexity']
    }];
  }
} 