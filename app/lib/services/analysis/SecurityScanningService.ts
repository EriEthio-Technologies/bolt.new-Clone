import { Service } from 'typedi';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { validateEnv } from '~/config/env.server';
import type { 
  SecurityScanResult,
  SecurityVulnerability,
  DependencyAudit,
  CodeAudit 
} from '~/types/security';

const execAsync = promisify(exec);

@Service()
export class SecurityScanningService {
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
  }

  async scanProject(path: string): Promise<SecurityScanResult> {
    try {
      const [
        dependencyAudit,
        codeAudit,
        secretScan,
        compositionAnalysis
      ] = await Promise.all([
        this.runDependencyAudit(),
        this.runCodeAudit(path),
        this.scanForSecrets(path),
        this.analyzeComposition()
      ]);

      return {
        vulnerabilities: [
          ...dependencyAudit.vulnerabilities,
          ...codeAudit.vulnerabilities,
          ...secretScan.vulnerabilities,
          ...compositionAnalysis.vulnerabilities
        ],
        summary: {
          critical: this.countBySeverity(dependencyAudit.vulnerabilities, 'CRITICAL'),
          high: this.countBySeverity(dependencyAudit.vulnerabilities, 'HIGH'),
          medium: this.countBySeverity(dependencyAudit.vulnerabilities, 'MEDIUM'),
          low: this.countBySeverity(dependencyAudit.vulnerabilities, 'LOW')
        },
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Security scan failed: ${error.message}`);
    }
  }

  private async runDependencyAudit(): Promise<DependencyAudit> {
    try {
      // Run npm audit
      const { stdout: npmAudit } = await execAsync('npm audit --json');
      const npmResults = JSON.parse(npmAudit);

      // Run Snyk scan
      const { stdout: snykScan } = await execAsync('snyk test --json');
      const snykResults = JSON.parse(snykScan);

      return {
        vulnerabilities: [
          ...this.transformNpmAudit(npmResults),
          ...this.transformSnykResults(snykResults)
        ]
      };
    } catch (error) {
      console.error('Dependency audit failed:', error);
      return { vulnerabilities: [] };
    }
  }

  private async runCodeAudit(path: string): Promise<CodeAudit> {
    try {
      // Run SonarQube security rules
      const { stdout: sonarScan } = await execAsync(
        `sonar-scanner -Dsonar.sources=${path} -Dsonar.projectKey=security-scan`
      );

      // Run Semgrep security patterns
      const { stdout: semgrepScan } = await execAsync(
        `semgrep --config=p/security-audit ${path} --json`
      );

      return {
        vulnerabilities: [
          ...this.transformSonarResults(sonarScan),
          ...this.transformSemgrepResults(JSON.parse(semgrepScan))
        ]
      };
    } catch (error) {
      console.error('Code audit failed:', error);
      return { vulnerabilities: [] };
    }
  }

  private async scanForSecrets(path: string): Promise<CodeAudit> {
    try {
      // Run GitLeaks for secret detection
      const { stdout: gitleaks } = await execAsync(
        `gitleaks detect --source ${path} --report-format json`
      );

      // Run TruffleHog for additional secret scanning
      const { stdout: trufflehog } = await execAsync(
        `trufflehog filesystem ${path} --json`
      );

      return {
        vulnerabilities: [
          ...this.transformGitleaksResults(JSON.parse(gitleaks)),
          ...this.transformTrufflehogResults(JSON.parse(trufflehog))
        ]
      };
    } catch (error) {
      console.error('Secret scan failed:', error);
      return { vulnerabilities: [] };
    }
  }

  private async analyzeComposition(): Promise<DependencyAudit> {
    try {
      // Run OWASP Dependency-Check
      const { stdout: depCheck } = await execAsync(
        'dependency-check --scan . --format JSON'
      );

      // Run License compliance check
      const { stdout: licenseCheck } = await execAsync(
        'license-checker --json'
      );

      return {
        vulnerabilities: [
          ...this.transformDependencyCheck(JSON.parse(depCheck)),
          ...this.transformLicenseIssues(JSON.parse(licenseCheck))
        ]
      };
    } catch (error) {
      console.error('Composition analysis failed:', error);
      return { vulnerabilities: [] };
    }
  }

  private transformNpmAudit(results: any): SecurityVulnerability[] {
    return Object.values(results.advisories).map((advisory: any) => ({
      id: advisory.id,
      title: advisory.title,
      description: advisory.overview,
      severity: this.normalizeSeverity(advisory.severity),
      package: advisory.module_name,
      version: advisory.findings[0].version,
      fixedIn: advisory.patched_versions,
      references: advisory.references,
      type: 'dependency',
      path: advisory.findings[0].paths[0]
    }));
  }

  private transformSnykResults(results: any): SecurityVulnerability[] {
    return results.vulnerabilities.map((vuln: any) => ({
      id: vuln.id,
      title: vuln.title,
      description: vuln.description,
      severity: this.normalizeSeverity(vuln.severity),
      package: vuln.package,
      version: vuln.version,
      fixedIn: vuln.fixedIn,
      references: vuln.references,
      type: 'dependency',
      path: vuln.from.join('>')
    }));
  }

  private transformSonarResults(results: string): SecurityVulnerability[] {
    // Parse Sonar output and transform to vulnerabilities
    // Implementation depends on SonarQube output format
    return [];
  }

  private transformSemgrepResults(results: any): SecurityVulnerability[] {
    return results.results.map((result: any) => ({
      id: result.check_id,
      title: result.extra.message,
      description: result.extra.lines,
      severity: this.normalizeSeverity(result.extra.severity),
      package: null,
      version: null,
      fixedIn: null,
      references: [],
      type: 'code',
      path: result.path,
      location: {
        line: result.start.line,
        column: result.start.col
      }
    }));
  }

  private normalizeSeverity(severity: string): SecurityVulnerability['severity'] {
    const severityMap: Record<string, SecurityVulnerability['severity']> = {
      'critical': 'CRITICAL',
      'high': 'HIGH',
      'moderate': 'MEDIUM',
      'medium': 'MEDIUM',
      'low': 'LOW'
    };

    return severityMap[severity.toLowerCase()] || 'MEDIUM';
  }

  private countBySeverity(
    vulnerabilities: SecurityVulnerability[],
    severity: SecurityVulnerability['severity']
  ): number {
    return vulnerabilities.filter(v => v.severity === severity).length;
  }
} 