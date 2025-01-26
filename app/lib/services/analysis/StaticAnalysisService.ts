import { Service } from 'typedi';
import { ESLint } from 'eslint';
import * as ts from 'typescript';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { validateEnv } from '~/config/env.server';
import type { 
  StaticAnalysisResult,
  CodeIssue,
  ComplexityMetrics,
  TypeCheckResult 
} from '~/types/analysis';

const execAsync = promisify(exec);

@Service()
export class StaticAnalysisService {
  private readonly eslint: ESLint;
  private readonly tsConfig: ts.ParsedCommandLine;

  constructor() {
    const env = validateEnv();
    
    // Initialize ESLint
    this.eslint = new ESLint({
      useEslintrc: true,
      fix: false,
      cache: true,
      cacheLocation: '.eslintcache',
      extensions: ['.ts', '.tsx', '.js', '.jsx']
    });

    // Load TypeScript configuration
    const configPath = ts.findConfigFile(
      process.cwd(),
      ts.sys.fileExists,
      'tsconfig.json'
    );

    if (!configPath) {
      throw new Error('Could not find tsconfig.json');
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    this.tsConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      process.cwd()
    );
  }

  async analyzeCode(path: string): Promise<StaticAnalysisResult> {
    try {
      const [
        lintResults,
        typeCheckResults,
        complexityMetrics
      ] = await Promise.all([
        this.runLintAnalysis(path),
        this.runTypeCheck(path),
        this.calculateComplexity(path)
      ]);

      return {
        issues: [
          ...this.transformLintResults(lintResults),
          ...this.transformTypeCheckResults(typeCheckResults)
        ],
        metrics: complexityMetrics,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Static analysis failed: ${error.message}`);
    }
  }

  private async runLintAnalysis(path: string): Promise<ESLint.LintResult[]> {
    return await this.eslint.lintFiles(path);
  }

  private async runTypeCheck(path: string): Promise<TypeCheckResult[]> {
    const program = ts.createProgram([path], this.tsConfig.options);
    const sourceFile = program.getSourceFile(path);
    const checker = program.getTypeChecker();
    const diagnostics = [
      ...program.getSemanticDiagnostics(sourceFile),
      ...program.getSyntacticDiagnostics(sourceFile)
    ];

    return diagnostics.map(diagnostic => ({
      code: diagnostic.code,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      location: sourceFile!.getLineAndCharacterOfPosition(diagnostic.start!),
      severity: this.getDiagnosticSeverity(diagnostic)
    }));
  }

  private async calculateComplexity(path: string): Promise<ComplexityMetrics> {
    const sourceCode = await readFile(path, 'utf-8');
    const sourceFile = ts.createSourceFile(
      path,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const metrics: ComplexityMetrics = {
      cyclomaticComplexity: 0,
      cognitiveComplexity: 0,
      maintainabilityIndex: 100,
      linesOfCode: 0,
      commentDensity: 0
    };

    const calculateNodeComplexity = (node: ts.Node) => {
      // Increment cyclomatic complexity for control flow statements
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isIfStatement(node) ||
        ts.isForStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isCaseClause(node)
      ) {
        metrics.cyclomaticComplexity++;
      }

      // Calculate cognitive complexity
      if (ts.isIfStatement(node)) {
        metrics.cognitiveComplexity += this.getNestingLevel(node);
      }

      ts.forEachChild(node, calculateNodeComplexity);
    };

    calculateNodeComplexity(sourceFile);

    // Calculate lines of code and comment density
    const lines = sourceCode.split('\n');
    metrics.linesOfCode = lines.length;
    const commentLines = lines.filter(line => 
      line.trim().startsWith('//') || line.trim().startsWith('/*')
    ).length;
    metrics.commentDensity = (commentLines / metrics.linesOfCode) * 100;

    // Calculate maintainability index
    metrics.maintainabilityIndex = this.calculateMaintainabilityIndex(
      metrics.cyclomaticComplexity,
      metrics.linesOfCode,
      metrics.commentDensity
    );

    return metrics;
  }

  private getNestingLevel(node: ts.Node): number {
    let level = 1;
    let parent = node.parent;
    while (parent) {
      if (ts.isIfStatement(parent) || ts.isForStatement(parent)) {
        level++;
      }
      parent = parent.parent;
    }
    return level;
  }

  private calculateMaintainabilityIndex(
    complexity: number,
    linesOfCode: number,
    commentDensity: number
  ): number {
    // Using the Microsoft maintainability index formula
    const mi = Math.max(
      0,
      171 - 
      (5.2 * Math.log(complexity)) - 
      (0.23 * Math.log(linesOfCode)) +
      (0.99 * Math.log(commentDensity))
    );
    return Math.min(100, mi);
  }

  private getDiagnosticSeverity(diagnostic: ts.Diagnostic): 'error' | 'warning' {
    return diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning';
  }

  private transformLintResults(results: ESLint.LintResult[]): CodeIssue[] {
    return results.flatMap(result =>
      result.messages.map(message => ({
        type: 'lint',
        ruleId: message.ruleId || 'unknown',
        message: message.message,
        severity: message.severity === 2 ? 'error' : 'warning',
        location: {
          file: result.filePath,
          line: message.line,
          column: message.column
        }
      }))
    );
  }

  private transformTypeCheckResults(results: TypeCheckResult[]): CodeIssue[] {
    return results.map(result => ({
      type: 'typecheck',
      ruleId: `TS${result.code}`,
      message: result.message,
      severity: result.severity,
      location: {
        file: 'current',
        line: result.location.line + 1,
        column: result.location.character + 1
      }
    }));
  }
} 