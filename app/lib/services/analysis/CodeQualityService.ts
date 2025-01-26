import { Service } from 'typedi';
import { ESLint } from 'eslint';
import * as ts from 'typescript';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { validateEnv } from '~/config/env.server';
import type { 
  CodeQualityResult,
  QualityMetrics,
  TestCoverage,
  DuplicationInfo,
  TechnicalDebt 
} from '~/types/quality';

const execAsync = promisify(exec);

@Service()
export class CodeQualityService {
  private readonly eslint: ESLint;
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
    this.eslint = new ESLint({
      useEslintrc: true,
      cache: true
    });
  }

  async analyzeCodeQuality(path: string): Promise<CodeQualityResult> {
    try {
      const [
        metrics,
        coverage,
        duplication,
        technicalDebt
      ] = await Promise.all([
        this.calculateMetrics(path),
        this.analyzeCoverage(),
        this.analyzeDuplication(path),
        this.calculateTechnicalDebt(path)
      ]);

      return {
        metrics,
        coverage,
        duplication,
        technicalDebt,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Code quality analysis failed: ${error.message}`);
    }
  }

  private async calculateMetrics(path: string): Promise<QualityMetrics> {
    const sourceCode = await readFile(path, 'utf-8');
    const sourceFile = ts.createSourceFile(
      path,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const metrics: QualityMetrics = {
      codeSize: {
        lines: 0,
        statements: 0,
        functions: 0,
        classes: 0
      },
      complexity: {
        cyclomatic: 0,
        cognitive: 0,
        halstead: {
          difficulty: 0,
          effort: 0,
          time: 0,
          bugs: 0
        }
      },
      maintainability: {
        index: 100,
        technicalDebtRatio: 0,
        testCoverage: 0
      }
    };

    // Calculate code size metrics
    this.calculateCodeSizeMetrics(sourceFile, metrics);

    // Calculate complexity metrics
    this.calculateComplexityMetrics(sourceFile, metrics);

    // Calculate Halstead metrics
    this.calculateHalsteadMetrics(sourceFile, metrics);

    return metrics;
  }

  private async analyzeCoverage(): Promise<TestCoverage> {
    try {
      // Run Jest with coverage
      const { stdout } = await execAsync('jest --coverage --json');
      const coverageResults = JSON.parse(stdout);

      return {
        lines: {
          total: coverageResults.total.lines.total,
          covered: coverageResults.total.lines.covered,
          percentage: coverageResults.total.lines.pct
        },
        functions: {
          total: coverageResults.total.functions.total,
          covered: coverageResults.total.functions.covered,
          percentage: coverageResults.total.functions.pct
        },
        branches: {
          total: coverageResults.total.branches.total,
          covered: coverageResults.total.branches.covered,
          percentage: coverageResults.total.branches.pct
        },
        statements: {
          total: coverageResults.total.statements.total,
          covered: coverageResults.total.statements.covered,
          percentage: coverageResults.total.statements.pct
        }
      };
    } catch (error) {
      console.error('Coverage analysis failed:', error);
      return this.getDefaultCoverage();
    }
  }

  private async analyzeDuplication(path: string): Promise<DuplicationInfo> {
    try {
      // Run jscpd for duplication detection
      const { stdout } = await execAsync(
        `jscpd ${path} --reporters json --min-lines 5 --min-tokens 50`
      );
      const duplicationResults = JSON.parse(stdout);

      return {
        percentage: duplicationResults.statistics.total.percentage,
        duplicates: duplicationResults.duplicates.map(dup => ({
          sourceFile: dup.firstFile.name,
          targetFile: dup.secondFile.name,
          startLine: dup.firstFile.start.line,
          endLine: dup.firstFile.end.line,
          lines: dup.lines
        }))
      };
    } catch (error) {
      console.error('Duplication analysis failed:', error);
      return {
        percentage: 0,
        duplicates: []
      };
    }
  }

  private async calculateTechnicalDebt(path: string): Promise<TechnicalDebt> {
    try {
      // Run SonarQube analysis
      const { stdout } = await execAsync(
        `sonar-scanner -Dsonar.sources=${path} -Dsonar.projectKey=quality-metrics`
      );
      const sonarResults = JSON.parse(stdout);

      return {
        rating: this.calculateDebtRating(sonarResults.measures),
        ratio: sonarResults.measures.sqale_debt_ratio || 0,
        issues: this.transformSonarIssues(sonarResults.issues),
        effort: this.calculateRemediationEffort(sonarResults.issues)
      };
    } catch (error) {
      console.error('Technical debt analysis failed:', error);
      return {
        rating: 'A',
        ratio: 0,
        issues: [],
        effort: 0
      };
    }
  }

  private calculateCodeSizeMetrics(
    sourceFile: ts.SourceFile,
    metrics: QualityMetrics
  ): void {
    const lines = sourceFile.getFullText().split('\n');
    metrics.codeSize.lines = lines.length;

    let statements = 0;
    let functions = 0;
    let classes = 0;

    const visit = (node: ts.Node) => {
      if (ts.isStatement(node)) statements++;
      if (ts.isFunctionDeclaration(node)) functions++;
      if (ts.isClassDeclaration(node)) classes++;
      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);

    metrics.codeSize.statements = statements;
    metrics.codeSize.functions = functions;
    metrics.codeSize.classes = classes;
  }

  private calculateComplexityMetrics(
    sourceFile: ts.SourceFile,
    metrics: QualityMetrics
  ): void {
    let cyclomatic = 1;
    let cognitive = 0;

    const visit = (node: ts.Node) => {
      if (
        ts.isIfStatement(node) ||
        ts.isForStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isCaseClause(node)
      ) {
        cyclomatic++;
        cognitive += this.getNestingLevel(node);
      }
      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);

    metrics.complexity.cyclomatic = cyclomatic;
    metrics.complexity.cognitive = cognitive;
  }

  private calculateHalsteadMetrics(
    sourceFile: ts.SourceFile,
    metrics: QualityMetrics
  ): void {
    const operators = new Set<string>();
    const operands = new Set<string>();

    const visit = (node: ts.Node) => {
      if (ts.isBinaryExpression(node)) {
        operators.add(node.operatorToken.getText());
      }
      if (ts.isIdentifier(node)) {
        operands.add(node.text);
      }
      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);

    const n1 = operators.size;
    const n2 = operands.size;
    const N1 = operators.size;
    const N2 = operands.size;

    const difficulty = (n1 / 2) * (N2 / n2);
    const effort = difficulty * (N1 + N2) * Math.log2(n1 + n2);
    const time = effort / 18;
    const bugs = effort ** (2/3) / 3000;

    metrics.complexity.halstead = {
      difficulty,
      effort,
      time,
      bugs
    };
  }

  private getNestingLevel(node: ts.Node): number {
    let level = 1;
    let parent = node.parent;
    while (parent) {
      if (ts.isBlock(parent)) level++;
      parent = parent.parent;
    }
    return level;
  }

  private calculateDebtRating(measures: any): 'A' | 'B' | 'C' | 'D' | 'E' {
    const ratio = measures.sqale_debt_ratio || 0;
    if (ratio <= 5) return 'A';
    if (ratio <= 10) return 'B';
    if (ratio <= 20) return 'C';
    if (ratio <= 50) return 'D';
    return 'E';
  }

  private getDefaultCoverage(): TestCoverage {
    return {
      lines: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      statements: { total: 0, covered: 0, percentage: 0 }
    };
  }

  private transformSonarIssues(issues: any[]): any[] {
    return issues.map(issue => ({
      type: issue.type,
      severity: issue.severity,
      component: issue.component,
      line: issue.line,
      message: issue.message,
      effort: issue.effort
    }));
  }

  private calculateRemediationEffort(issues: any[]): number {
    return issues.reduce((total, issue) => {
      const effort = parseInt(issue.effort || '0', 10);
      return total + effort;
    }, 0);
  }
} 