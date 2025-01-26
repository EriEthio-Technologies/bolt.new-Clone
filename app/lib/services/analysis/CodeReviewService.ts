import { Service } from 'typedi';
import { CodeAnalysisService } from './CodeAnalysisService';
import { validateEnv } from '~/config/env.server';
import type { 
  CodeReviewSuggestion,
  AnalysisResult,
  LintResult 
} from '~/types/analysis';

@Service()
export class CodeReviewService {
  private readonly analysisService: CodeAnalysisService;
  private readonly priorityThresholds = {
    high: 8,
    medium: 5,
    low: 3
  };

  constructor(analysisService: CodeAnalysisService) {
    this.analysisService = analysisService;
  }

  async generateReviewSuggestions(
    path: string
  ): Promise<CodeReviewSuggestion[]> {
    try {
      const analysis = await this.analysisService.analyzeCode(path);
      const suggestions: CodeReviewSuggestion[] = [
        ...this.getLintingSuggestions(analysis.linting),
        ...this.getSecuritySuggestions(analysis.security),
        ...this.getMetricSuggestions(analysis.metrics),
        ...this.getPerformanceSuggestions(analysis.performance)
      ];

      return this.prioritizeSuggestions(suggestions);
    } catch (error) {
      throw new Error(`Failed to generate review suggestions: ${error.message}`);
    }
  }

  private getLintingSuggestions(
    lintResults: LintResult[]
  ): CodeReviewSuggestion[] {
    return lintResults.flatMap(result => 
      result.messages.map(msg => ({
        file: result.filePath,
        line: msg.line,
        type: msg.severity === 2 ? 'warning' : 'improvement',
        message: msg.message,
        suggestedFix: this.getSuggestedFix(msg.ruleId, msg.message),
        priority: this.calculatePriority('lint', msg.severity)
      }))
    );
  }

  private getSecuritySuggestions(
    securityResults: AnalysisResult['security']
  ): CodeReviewSuggestion[] {
    return securityResults.map(vuln => ({
      file: vuln.package,
      line: 0, // Package-level vulnerability
      type: 'security',
      message: `${vuln.severity} severity vulnerability: ${vuln.description}`,
      suggestedFix: vuln.fixedIn ? 
        `Update to version ${vuln.fixedIn} or later` : 
        'Review and patch security vulnerability',
      priority: this.calculatePriority('security', this.getSeverityScore(vuln.severity))
    }));
  }

  private getMetricSuggestions(
    metrics: AnalysisResult['metrics']
  ): CodeReviewSuggestion[] {
    const suggestions: CodeReviewSuggestion[] = [];

    if (metrics.complexity > 20) {
      suggestions.push({
        file: '',
        line: 0,
        type: 'improvement',
        message: 'High cyclomatic complexity detected',
        suggestedFix: 'Consider breaking down complex functions and reducing nesting',
        priority: this.calculatePriority('metrics', metrics.complexity / 10)
      });
    }

    if (metrics.coverage < 80) {
      suggestions.push({
        file: '',
        line: 0,
        type: 'improvement',
        message: 'Test coverage is below target',
        suggestedFix: 'Add more unit tests to improve coverage',
        priority: this.calculatePriority('metrics', (80 - metrics.coverage) / 10)
      });
    }

    if (metrics.duplication > 5) {
      suggestions.push({
        file: '',
        line: 0,
        type: 'improvement',
        message: 'Code duplication detected',
        suggestedFix: 'Extract duplicate code into reusable functions or components',
        priority: this.calculatePriority('metrics', metrics.duplication / 2)
      });
    }

    return suggestions;
  }

  private getPerformanceSuggestions(
    performance: AnalysisResult['performance']
  ): CodeReviewSuggestion[] {
    const suggestions: CodeReviewSuggestion[] = [];

    if (performance.cpu > 70) {
      suggestions.push({
        file: '',
        line: 0,
        type: 'performance',
        message: 'High CPU usage detected',
        suggestedFix: 'Optimize CPU-intensive operations and consider caching',
        priority: this.calculatePriority('performance', performance.cpu / 10)
      });
    }

    if (performance.memory > 512) {
      suggestions.push({
        file: '',
        line: 0,
        type: 'performance',
        message: 'High memory usage detected',
        suggestedFix: 'Check for memory leaks and optimize memory usage',
        priority: this.calculatePriority('performance', performance.memory / 100)
      });
    }

    if (performance.latency > 100) {
      suggestions.push({
        file: '',
        line: 0,
        type: 'performance',
        message: 'High latency detected',
        suggestedFix: 'Optimize response times and consider caching strategies',
        priority: this.calculatePriority('performance', performance.latency / 20)
      });
    }

    return suggestions;
  }

  private getSuggestedFix(ruleId: string, message: string): string {
    // Map common lint rules to suggested fixes
    const fixSuggestions: Record<string, string> = {
      'no-unused-vars': 'Remove unused variable or add prefix with underscore',
      'no-console': 'Replace console.log with proper logging mechanism',
      'prefer-const': 'Use const instead of let for values that are never reassigned',
      'max-len': 'Break long line into multiple lines or extract into variables'
    };

    return fixSuggestions[ruleId] || 'Review and fix the issue';
  }

  private calculatePriority(
    type: string,
    severity: number
  ): number {
    const baseScore = severity;
    const typeMultipliers: Record<string, number> = {
      security: 2.0,
      performance: 1.5,
      metrics: 1.2,
      lint: 1.0
    };

    return Math.min(10, Math.round(baseScore * (typeMultipliers[type] || 1)));
  }

  private getSeverityScore(severity: string): number {
    const scores: Record<string, number> = {
      CRITICAL: 10,
      HIGH: 8,
      MEDIUM: 5,
      LOW: 2
    };
    return scores[severity] || 5;
  }

  private prioritizeSuggestions(
    suggestions: CodeReviewSuggestion[]
  ): CodeReviewSuggestion[] {
    return suggestions
      .sort((a, b) => b.priority - a.priority)
      .map(suggestion => ({
        ...suggestion,
        priority: this.normalizePriority(suggestion.priority)
      }));
  }

  private normalizePriority(score: number): number {
    if (score >= this.priorityThresholds.high) return 1;
    if (score >= this.priorityThresholds.medium) return 2;
    if (score >= this.priorityThresholds.low) return 3;
    return 4;
  }
} 