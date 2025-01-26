import { CodeReviewService } from '../CodeReviewService';
import { CodeAnalysisService } from '../CodeAnalysisService';
import type { AnalysisResult, CodeReviewSuggestion } from '~/types/analysis';

describe('CodeReviewService', () => {
  let codeReviewService: CodeReviewService;
  let mockAnalysisService: jest.Mocked<CodeAnalysisService>;

  beforeEach(() => {
    mockAnalysisService = {
      analyzeCode: jest.fn()
    } as any;

    codeReviewService = new CodeReviewService(mockAnalysisService);
  });

  describe('generateReviewSuggestions', () => {
    const mockAnalysisResult: AnalysisResult = {
      linting: [{
        filePath: 'test.ts',
        messages: [{
          ruleId: 'no-unused-vars',
          severity: 2,
          message: 'Variable is unused',
          line: 1,
          column: 1
        }],
        errorCount: 1,
        warningCount: 0,
        fixableErrorCount: 1,
        fixableWarningCount: 0
      }],
      security: [{
        package: 'test-package',
        severity: 'HIGH',
        description: 'Security vulnerability',
        cve: 'CVE-2023-1234',
        fixedIn: '2.0.0'
      }],
      metrics: {
        complexity: 25,
        coverage: 70,
        duplication: 8,
        bugs: 2,
        vulnerabilities: 1,
        codeSmells: 5
      },
      performance: {
        cpu: 75,
        memory: 600,
        latency: 120,
        throughput: 800
      },
      timestamp: new Date()
    };

    beforeEach(() => {
      mockAnalysisService.analyzeCode.mockResolvedValue(mockAnalysisResult);
    });

    it('should generate suggestions from all analysis types', async () => {
      const suggestions = await codeReviewService.generateReviewSuggestions('test.ts');

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('unused')
        })
      );

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'security',
          message: expect.stringContaining('HIGH severity')
        })
      );

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'improvement',
          message: expect.stringContaining('complexity')
        })
      );

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'performance',
          message: expect.stringContaining('CPU usage')
        })
      );
    });

    it('should prioritize suggestions correctly', async () => {
      const suggestions = await codeReviewService.generateReviewSuggestions('test.ts');
      
      // Security issues should have higher priority
      const securitySuggestion = suggestions.find(s => s.type === 'security');
      const lintingSuggestion = suggestions.find(s => s.type === 'warning');
      
      expect(securitySuggestion?.priority).toBeLessThan(lintingSuggestion?.priority || 999);
    });

    it('should include suggested fixes', async () => {
      const suggestions = await codeReviewService.generateReviewSuggestions('test.ts');

      suggestions.forEach(suggestion => {
        expect(suggestion.suggestedFix).toBeDefined();
        expect(suggestion.suggestedFix?.length).toBeGreaterThan(0);
      });
    });

    it('should handle analysis service errors', async () => {
      mockAnalysisService.analyzeCode.mockRejectedValue(
        new Error('Analysis failed')
      );

      await expect(codeReviewService.generateReviewSuggestions('test.ts'))
        .rejects
        .toThrow('Failed to generate review suggestions');
    });
  });
}); 