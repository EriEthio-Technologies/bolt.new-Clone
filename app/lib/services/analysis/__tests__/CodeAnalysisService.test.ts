import { CodeAnalysisService } from '../CodeAnalysisService';
import { ESLint } from 'eslint';
import * as sonarqubeScanner from 'sonarqube-scanner';
import { exec } from 'child_process';
import type { AnalysisResult } from '~/types/analysis';

jest.mock('eslint');
jest.mock('sonarqube-scanner');
jest.mock('child_process');

describe('CodeAnalysisService', () => {
  let analysisService: CodeAnalysisService;
  let mockESLint: jest.Mocked<ESLint>;
  let mockExec: jest.Mock;

  beforeEach(() => {
    mockESLint = {
      lintFiles: jest.fn(),
      loadFormatter: jest.fn()
    } as any;

    (ESLint as jest.Mock).mockImplementation(() => mockESLint);
    mockExec = exec as jest.Mock;

    analysisService = new CodeAnalysisService();
  });

  describe('analyzeCode', () => {
    const mockPath = 'src/test.ts';

    beforeEach(() => {
      // Mock ESLint results
      mockESLint.lintFiles.mockResolvedValue([{
        filePath: mockPath,
        messages: [{
          ruleId: 'no-unused-vars',
          severity: 2,
          message: 'Variable is unused',
          line: 1,
          column: 1
        }],
        errorCount: 1,
        warningCount: 0,
        fixableErrorCount: 1,
        fixableWarningCount: 0
      }]);

      mockESLint.loadFormatter.mockResolvedValue({
        format: jest.fn().mockResolvedValue(JSON.stringify([]))
      });

      // Mock Snyk scan
      mockExec.mockImplementation((command: string, callback: any) => {
        if (command.includes('snyk')) {
          callback(null, {
            stdout: JSON.stringify({
              vulnerabilities: [{
                package: 'test-package',
                severity: 'HIGH',
                description: 'Security vulnerability',
                cve: 'CVE-2023-1234'
              }]
            })
          });
        }
        return { stdout: '', stderr: '' };
      });
    });

    it('should perform complete code analysis', async () => {
      const result = await analysisService.analyzeCode(mockPath);

      expect(result).toMatchObject({
        linting: expect.any(Array),
        security: expect.any(Array),
        metrics: expect.any(Object),
        performance: expect.any(Object),
        timestamp: expect.any(Date)
      });
    });

    it('should handle linting analysis', async () => {
      const result = await analysisService.analyzeCode(mockPath);

      expect(mockESLint.lintFiles).toHaveBeenCalledWith([mockPath]);
      expect(result.linting[0]).toMatchObject({
        filePath: mockPath,
        errorCount: 1
      });
    });

    it('should handle security scanning', async () => {
      const result = await analysisService.analyzeCode(mockPath);

      expect(result.security).toContainEqual(
        expect.objectContaining({
          package: 'test-package',
          severity: 'HIGH'
        })
      );
    });

    it('should handle SonarQube metrics', async () => {
      (sonarqubeScanner as jest.Mock).mockResolvedValueOnce(undefined);
      global.fetch = jest.fn().mockResolvedValueOnce({
        json: () => Promise.resolve({
          component: {
            measures: [
              { metric: 'complexity', value: '10' },
              { metric: 'coverage', value: '80' }
            ]
          }
        })
      });

      const result = await analysisService.analyzeCode(mockPath);

      expect(result.metrics).toMatchObject({
        complexity: 10,
        coverage: 80
      });
    });

    it('should handle performance analysis', async () => {
      mockExec.mockImplementation((command: string, callback: any) => {
        if (command.includes('clinic')) {
          callback(null, {
            stdout: `
              CPU usage: 45%
              Memory usage: 128MB
              Average latency: 50ms
              Requests/sec: 1000
            `
          });
        }
        return { stdout: '', stderr: '' };
      });

      const result = await analysisService.analyzeCode(mockPath);

      expect(result.performance).toMatchObject({
        cpu: 45,
        memory: 128,
        latency: 50,
        throughput: 1000
      });
    });

    it('should handle analysis failures gracefully', async () => {
      mockESLint.lintFiles.mockRejectedValueOnce(new Error('Lint failed'));

      await expect(analysisService.analyzeCode(mockPath))
        .rejects
        .toThrow('Code analysis failed');
    });
  });

  describe('dependency checking', () => {
    it('should handle dependency check output', async () => {
      mockExec.mockImplementation((command: string, callback: any) => {
        if (command.includes('dependency-check')) {
          callback(null, {
            stdout: JSON.stringify({
              dependencies: [{
                fileName: 'package.json',
                vulnerabilities: [{
                  severity: 'CRITICAL',
                  description: 'Critical vulnerability',
                  name: 'CVE-2023-5678',
                  fixedIn: '2.0.0'
                }]
              }]
            })
          });
        }
        return { stdout: '', stderr: '' };
      });

      const result = await analysisService.analyzeCode('test/path');

      expect(result.security).toContainEqual(
        expect.objectContaining({
          package: 'package.json',
          severity: 'CRITICAL',
          fixedIn: '2.0.0'
        })
      );
    });
  });

  describe('metric calculations', () => {
    it('should calculate correct metric values', async () => {
      const mockMetrics = {
        component: {
          measures: [
            { metric: 'complexity', value: '15' },
            { metric: 'coverage', value: '75.5' },
            { metric: 'duplicated_lines_density', value: '5.2' },
            { metric: 'bugs', value: '3' },
            { metric: 'vulnerabilities', value: '2' },
            { metric: 'code_smells', value: '10' }
          ]
        }
      };

      const metrics = (analysisService as any).transformSonarMetrics(mockMetrics);

      expect(metrics).toEqual({
        complexity: 15,
        coverage: 75.5,
        duplication: 5.2,
        bugs: 3,
        vulnerabilities: 2,
        codeSmells: 10
      });
    });

    it('should handle missing metric values', async () => {
      const mockMetrics = {
        component: {
          measures: [
            { metric: 'complexity', value: '15' }
          ]
        }
      };

      const metrics = (analysisService as any).transformSonarMetrics(mockMetrics);

      expect(metrics.coverage).toBe(0);
      expect(metrics.bugs).toBe(0);
    });
  });
}); 