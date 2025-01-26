import { Service } from 'typedi';
import { DebugService } from '../../debug/DebugService';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

export interface DependencyAuditResult {
  name: string;
  version: string;
  vulnerabilities: {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    fixedIn: string;
  }[];
}

@Service()
export class DependencyScanner {
  constructor(private debug: DebugService) {}

  async scanDependencies(): Promise<DependencyAuditResult[]> {
    try {
      // Run npm audit
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const auditResults = JSON.parse(auditOutput);

      // Parse package.json
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      return Object.entries(dependencies).map(([name, version]) => ({
        name,
        version: version as string,
        vulnerabilities: this.getVulnerabilitiesForPackage(name, auditResults)
      }));
    } catch (error) {
      this.debug.log('error', 'DependencyScanner', 'Failed to scan dependencies', { error });
      throw error;
    }
  }

  private getVulnerabilitiesForPackage(packageName: string, auditResults: any): DependencyAuditResult['vulnerabilities'] {
    return auditResults.vulnerabilities[packageName]?.map(vuln => ({
      id: vuln.id,
      severity: vuln.severity,
      description: vuln.overview,
      fixedIn: vuln.fixAvailable?.version || 'No fix available'
    })) || [];
  }
} 