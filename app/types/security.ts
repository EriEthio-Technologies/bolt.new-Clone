export interface SecurityScanResult {
  vulnerabilities: SecurityVulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  timestamp: Date;
}

export interface SecurityVulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  package: string | null;
  version: string | null;
  fixedIn: string | null;
  references: string[];
  type: 'dependency' | 'code' | 'secret' | 'license';
  path: string;
  location?: {
    line: number;
    column: number;
  };
}

export interface DependencyAudit {
  vulnerabilities: SecurityVulnerability[];
}

export interface CodeAudit {
  vulnerabilities: SecurityVulnerability[];
}

export interface SecurityConfig {
  excludePatterns?: string[];
  severityThreshold?: SecurityVulnerability['severity'];
  customRules?: {
    id: string;
    pattern: string;
    severity: SecurityVulnerability['severity'];
    message: string;
  }[];
} 