import { Service } from 'typedi';
import { DebugService } from '../../debug/DebugService';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import * as ESLint from 'eslint';

export interface CodeAnalysisResult {
  file: string;
  vulnerabilities: {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    line: number;
    column: number;
    description: string;
    remediation: string;
  }[];
  codeQuality: {
    complexity: number;
    maintainability: number;
    issues: {
      ruleId: string;
      severity: 'warning' | 'error';
      message: string;
      line: number;
      column: number;
    }[];
  };
}

@Service()
export class CodeScanner {
  private eslint: ESLint.ESLint;

  constructor(private debug: DebugService) {
    this.eslint = new ESLint.ESLint({
      useEslintrc: true,
      overrideConfig: {
        plugins: ['security', 'sonarjs'],
        extends: [
          'plugin:security/recommended',
          'plugin:sonarjs/recommended'
        ]
      }
    });
  }

  async scanCode(): Promise<CodeAnalysisResult[]> {
    try {
      const files = await glob('app/**/*.{ts,tsx,js,jsx}', { ignore: ['**/node_modules/**', '**/dist/**'] });
      const results: CodeAnalysisResult[] = [];

      for (const file of files) {
        const content = readFileSync(file, 'utf8');
        const [eslintResults, complexityMetrics] = await Promise.all([
          this.eslint.lintText(content, { filePath: file }),
          this.analyzeComplexity(content)
        ]);

        results.push({
          file,
          vulnerabilities: this.extractVulnerabilities(eslintResults[0]),
          codeQuality: {
            ...complexityMetrics,
            issues: this.extractIssues(eslintResults[0])
          }
        });
      }

      return results;
    } catch (error) {
      this.debug.log('error', 'CodeScanner', 'Failed to scan code', { error });
      throw error;
    }
  }

  private extractVulnerabilities(result: ESLint.ESLint.LintResult): CodeAnalysisResult['vulnerabilities'] {
    return result.messages
      .filter(msg => msg.ruleId?.startsWith('security/'))
      .map(msg => ({
        id: msg.ruleId!,
        severity: this.mapSeverity(msg.severity),
        line: msg.line,
        column: msg.column,
        description: msg.message,
        remediation: this.getRemediation(msg.ruleId!)
      }));
  }

  private extractIssues(result: ESLint.ESLint.LintResult): CodeAnalysisResult['codeQuality']['issues'] {
    return result.messages
      .filter(msg => !msg.ruleId?.startsWith('security/'))
      .map(msg => ({
        ruleId: msg.ruleId || 'unknown',
        severity: msg.severity === 2 ? 'error' : 'warning',
        message: msg.message,
        line: msg.line,
        column: msg.column
      }));
  }

  private async analyzeComplexity(content: string): Promise<{ complexity: number; maintainability: number }> {
    // Implement complexity analysis using tools like escomplex
    return {
      complexity: 0,
      maintainability: 0
    };
  }

  private mapSeverity(eslintSeverity: number): 'low' | 'medium' | 'high' | 'critical' {
    switch (eslintSeverity) {
      case 0: return 'low';
      case 1: return 'medium';
      case 2: return 'high';
      default: return 'critical';
    }
  }

  private getRemediation(ruleId: string): string {
    // Implement remediation suggestions based on rule ID
    const remediations: Record<string, string> = {
      'security/detect-eval-with-expression': 'Avoid using eval() with dynamic expressions',
      'security/detect-non-literal-regexp': 'Use literal regular expressions instead of dynamic ones',
      'security/detect-no-csrf-before-method-override': 'Add CSRF protection before method override middleware'
    };

    return remediations[ruleId] || 'Review and fix the security issue according to best practices';
  }
} 