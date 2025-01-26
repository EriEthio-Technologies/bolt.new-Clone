export interface CodeQualityResult {
  metrics: QualityMetrics;
  coverage: TestCoverage;
  duplication: DuplicationInfo;
  technicalDebt: TechnicalDebt;
  timestamp: Date;
}

export interface QualityMetrics {
  codeSize: {
    lines: number;
    statements: number;
    functions: number;
    classes: number;
  };
  complexity: {
    cyclomatic: number;
    cognitive: number;
    halstead: {
      difficulty: number;
      effort: number;
      time: number;
      bugs: number;
    };
  };
  maintainability: {
    index: number;
    technicalDebtRatio: number;
    testCoverage: number;
  };
}

export interface TestCoverage {
  lines: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
  statements: CoverageMetric;
}

export interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number;
}

export interface DuplicationInfo {
  percentage: number;
  duplicates: Array<{
    sourceFile: string;
    targetFile: string;
    startLine: number;
    endLine: number;
    lines: number;
  }>;
}

export interface TechnicalDebt {
  rating: 'A' | 'B' | 'C' | 'D' | 'E';
  ratio: number;
  issues: Array<{
    type: string;
    severity: string;
    component: string;
    line: number;
    message: string;
    effort: string;
  }>;
  effort: number;
} 