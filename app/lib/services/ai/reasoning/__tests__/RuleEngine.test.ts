import { RuleEngine } from '../RuleEngine';
import type { InferenceContext, InferenceRule } from '~/types/inference';
import { ProcessingError } from '~/errors/ProcessingError';

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;

  beforeEach(() => {
    ruleEngine = new RuleEngine();
  });

  describe('rule application', () => {
    const mockContext: InferenceContext = {
      query: 'Create a user authentication function',
      intent: {
        type: 'code_generation',
        confidence: 0.95
      },
      entities: [
        {
          text: 'authenticate',
          type: 'FUNCTION',
          confidence: 0.9
        },
        {
          text: 'user',
          type: 'PARAMETER',
          confidence: 0.85
        }
      ]
    };

    it('should apply matching rules correctly', async () => {
      const result = await ruleEngine.applyRules(mockContext, []);
      
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      
      const functionRule = result.appliedRules.find(
        r => r.name === 'function_generation'
      );
      expect(functionRule).toBeDefined();
    });

    it('should prioritize rules correctly', async () => {
      const result = await ruleEngine.applyRules({
        ...mockContext,
        intent: { type: 'error_fix', confidence: 0.9 },
        entities: [
          { text: 'null pointer', type: 'ERROR', confidence: 0.9 },
          { text: 'performance', type: 'PERFORMANCE_METRIC', confidence: 0.8 }
        ]
      }, []);

      const appliedRuleNames = result.appliedRules.map(r => r.name);
      const errorRuleIndex = appliedRuleNames.indexOf('error_resolution');
      const perfRuleIndex = appliedRuleNames.indexOf('performance_optimization');

      expect(errorRuleIndex).toBeLessThan(perfRuleIndex);
    });

    it('should calculate confidence scores accurately', async () => {
      const result = await ruleEngine.applyRules(mockContext, []);
      
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      
      // Check individual rule confidences
      result.appliedRules.forEach(rule => {
        expect(rule.confidence).toBeGreaterThanOrEqual(0);
        expect(rule.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should handle rule execution failures gracefully', async () => {
      // Add a failing rule
      (ruleEngine as any).rules.set('failing_rule', {
        name: 'failing_rule',
        condition: () => true,
        action: () => { throw new Error('Rule execution failed'); },
        confidence: 0.9,
        metadata: { category: 'test', priority: 1, description: 'test' }
      });

      const result = await ruleEngine.applyRules(mockContext, []);
      
      // Should continue with other rules
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe('rule helpers', () => {
    it('should extract function parameters correctly', () => {
      const context: InferenceContext = {
        query: 'Create function with parameters',
        intent: { type: 'code_generation', confidence: 0.9 },
        entities: [
          { text: 'processData', type: 'FUNCTION', confidence: 0.9 },
          { text: 'input', type: 'PARAMETER', confidence: 0.8 },
          { text: 'callback', type: 'PARAMETER', confidence: 0.8 }
        ]
      };

      const result = (ruleEngine as any).extractFunctionParameters(context);
      
      expect(result.name).toBe('processData');
      expect(result.parameters).toHaveLength(2);
      expect(result.parameters[0].name).toBe('input');
    });

    it('should generate appropriate test scenarios', () => {
      const context: InferenceContext = {
        query: 'Test user authentication',
        intent: { type: 'testing', confidence: 0.9 },
        entities: [
          { text: 'UserAuth', type: 'CLASS', confidence: 0.9 }
        ]
      };

      const scenarios = (ruleEngine as any).generateTestScenarios(context);
      
      expect(scenarios[0].description).toContain('UserAuth');
      expect(scenarios[0].testCases).toContain('positive case');
      expect(scenarios[0].testCases).toContain('negative case');
    });
  });

  describe('error handling', () => {
    it('should handle invalid rule conditions', async () => {
      // Add rule with invalid condition
      (ruleEngine as any).rules.set('invalid_rule', {
        name: 'invalid_rule',
        condition: () => { throw new Error('Invalid condition'); },
        action: () => ({}),
        confidence: 0.9,
        metadata: { category: 'test', priority: 1, description: 'test' }
      });

      const result = await ruleEngine.applyRules({
        query: 'test',
        intent: { type: 'test', confidence: 0.9 },
        entities: []
      }, []);

      // Should skip invalid rule and continue
      expect(result.appliedRules).not.toContainEqual(
        expect.objectContaining({ name: 'invalid_rule' })
      );
    });

    it('should handle empty rule sets gracefully', async () => {
      (ruleEngine as any).rules.clear();

      const result = await ruleEngine.applyRules({
        query: 'test',
        intent: { type: 'test', confidence: 0.9 },
        entities: []
      }, []);

      expect(result.results).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });
  });
}); 