import { Service } from 'typedi';
import { ESLint } from 'eslint';
import * as sonarqubeScanner from 'sonarqube-scanner';
import { exec } from 'child_process';
import { promisify } from 'util';
import { validateEnv } from '~/config/env.server';
import type { 
  AnalysisResult, 
  CodeMetrics,
  SecurityVulnerability,
  PerformanceMetrics 
} from '~/types/analysis';

const execAsync = promisify(exec);

@Service()
export class CodeAnalysisService {
  private readonly eslint: ESLint;
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
    this.eslint = new ESLint({
      useEslintrc: true,
      fix: false
    });
  }

  async analyzeCode(path: string): Promise<AnalysisResult> {
    try {
      const [
        lintResults,
        securityResults,
        metrics,
        performanceMetrics
      ] = await Promise.all([
        this.runLintAnalysis(path),
        this.runSecurityAnalysis(path),
        this.calculateCodeMetrics(path),
        this.analyzePerformance(path)
      ]);

      return {
        linting: lintResults,
        security: securityResults,
        metrics,
        performance: performanceMetrics,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Code analysis failed: ${error.message}`);
    }
  }

  private async runLintAnalysis(path: string) {
    const results = await this.eslint.lintFiles([path]);
    const formatter = await this.eslint.loadFormatter('json');
    return JSON.parse(await formatter.format(results));
  }

  private async runSecurityAnalysis(
    path: string
  ): Promise<SecurityVulnerability[]> {
    // Run multiple security scanners
    const [snykResults, dependencyCheckResults] = await Promise.all([
      this.runSnykScan(path),
      this.runDependencyCheck(path)
    ]);

    return [...snykResults, ...dependencyCheckResults];
  }

  private async calculateCodeMetrics(path: string): Promise<CodeMetrics> {
    await this.runSonarQube(path);
    return this.getSonarQubeMetrics();
  }

  private async analyzePerformance(
    path: string
  ): Promise<PerformanceMetrics> {
    const { stdout } = await execAsync(
      `npx clinic doctor --on-port 'autocannon localhost:$PORT' -- node ${path}`
    );
    return this.parseClinicOutput(stdout);
  }

  private async runSnykScan(path: string): Promise<SecurityVulnerability[]> {
    try {
      const { stdout } = await execAsync(`snyk test ${path} --json`);
      return JSON.parse(stdout).vulnerabilities;
    } catch (error) {
      console.error('Snyk scan failed:', error);
      return [];
    }
  }

  private async runDependencyCheck(
    path: string
  ): Promise<SecurityVulnerability[]> {
    try {
      const { stdout } = await execAsync(
        `dependency-check --project "Gobeze AI" --scan ${path} --format JSON`
      );
      return this.parseDependencyCheckOutput(stdout);
    } catch (error) {
      console.error('Dependency check failed:', error);
      return [];
    }
  }

  private async runSonarQube(path: string): Promise<void> {
    await sonarqubeScanner({
      serverUrl: this.env.SONARQUBE_URL,
      token: this.env.SONARQUBE_TOKEN,
      options: {
        'sonar.sources': path,
        'sonar.projectKey': 'gobeze-ai',
        'sonar.projectName': 'Gobeze AI',
        'sonar.projectVersion': process.env.npm_package_version,
        'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info'
      }
    });
  }

  private async getSonarQubeMetrics(): Promise<CodeMetrics> {
    // Fetch metrics from SonarQube API
    const response = await fetch(
      `${this.env.SONARQUBE_URL}/api/measures/component`, {
        headers: {
          Authorization: `Bearer ${this.env.SONARQUBE_TOKEN}`
        },
        body: JSON.stringify({
          component: 'gobeze-ai',
          metricKeys: [
            'complexity',
            'coverage',
            'duplicated_lines_density',
            'bugs',
            'vulnerabilities',
            'code_smells'
          ]
        })
      }
    );

    const data = await response.json();
    return this.transformSonarMetrics(data);
  }

  private transformSonarMetrics(data: any): CodeMetrics {
    const measures = data.component.measures;
    return {
      complexity: this.findMetricValue(measures, 'complexity'),
      coverage: this.findMetricValue(measures, 'coverage'),
      duplication: this.findMetricValue(measures, 'duplicated_lines_density'),
      bugs: this.findMetricValue(measures, 'bugs'),
      vulnerabilities: this.findMetricValue(measures, 'vulnerabilities'),
      codeSmells: this.findMetricValue(measures, 'code_smells')
    };
  }

  private findMetricValue(measures: any[], key: string): number {
    return Number(measures.find(m => m.metric === key)?.value || 0);
  }

  private parseClinicOutput(output: string): PerformanceMetrics {
    // Parse Clinic Doctor output
    const metrics = {
      cpu: 0,
      memory: 0,
      latency: 0,
      throughput: 0
    };

    // Extract metrics from output
    const cpuMatch = output.match(/CPU usage: (\d+)%/);
    if (cpuMatch) metrics.cpu = Number(cpuMatch[1]);

    const memMatch = output.match(/Memory usage: (\d+)MB/);
    if (memMatch) metrics.memory = Number(memMatch[1]);

    const latencyMatch = output.match(/Average latency: (\d+)ms/);
    if (latencyMatch) metrics.latency = Number(latencyMatch[1]);

    const throughputMatch = output.match(/Requests\/sec: (\d+)/);
    if (throughputMatch) metrics.throughput = Number(throughputMatch[1]);

    return metrics;
  }

  private parseDependencyCheckOutput(
    output: string
  ): SecurityVulnerability[] {
    const results = JSON.parse(output);
    return results.dependencies
      .filter(dep => dep.vulnerabilities?.length > 0)
      .flatMap(dep => 
        dep.vulnerabilities.map(vuln => ({
          package: dep.fileName,
          severity: vuln.severity,
          description: vuln.description,
          cve: vuln.name,
          fixedIn: vuln.fixedIn
        }))
      );
  }
} 