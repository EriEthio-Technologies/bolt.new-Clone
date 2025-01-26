export interface AnalysisResult {
  linting: LintResult[];
  security: SecurityVulnerability[];
  metrics: CodeMetrics;
  performance: PerformanceMetrics;
  timestamp: Date;
}

export interface LintResult {
  filePath: string;
  messages: {
    ruleId: string;
    severity: number;
    message: string;
    line: number;
    column: number;
  }[];
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
}

export interface SecurityVulnerability {
  package: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  cve?: string;
  fixedIn?: string;
}

export interface CodeMetrics {
  complexity: number;
  coverage: number;
  duplication: number;
  bugs: number;
  vulnerabilities: number;
  codeSmells: number;
}

export interface PerformanceMetrics {
  cpu: number;
  memory: number;
  latency: number;
  throughput: number;
}

export interface CodeReviewSuggestion {
  file: string;
  line: number;
  type: 'improvement' | 'warning' | 'security' | 'performance';
  message: string;
  suggestedFix?: string;
  priority: number;
}

export interface StaticAnalysisResult {
  issues: CodeIssue[];
  metrics: ComplexityMetrics;
  timestamp: Date;
}

export interface CodeIssue {
  type: 'lint' | 'typecheck' | 'security';
  ruleId: string;
  message: string;
  severity: 'error' | 'warning';
  location: {
    file: string;
    line: number;
    column: number;
  };
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  linesOfCode: number;
  commentDensity: number;
}

export interface TypeCheckResult {
  code: number;
  message: string;
  location: {
    line: number;
    character: number;
  };
  severity: 'error' | 'warning';
} 