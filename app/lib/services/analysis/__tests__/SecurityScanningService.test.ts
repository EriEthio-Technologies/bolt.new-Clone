import { SecurityScanningService } from '../SecurityScanningService';
import { exec } from 'child_process';
import type { SecurityScanResult } from '~/types/security';

jest.mock('child_process');

describe('SecurityScanningService', () => {
  let securityService: SecurityScanningService;
  const mockExec = exec as jest.Mock;

  beforeEach(() => {
    securityService = new SecurityScanningService();
    jest.clearAllMocks();
  });

  describe('scanProject', () => {
    const mockPath = 'src/test';

    beforeEach(() => {
      // Mock npm audit results
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('npm audit')) {
          callback(null, {
            stdout: JSON.stringify({
              advisories: {
                '1234': {
                  id: 1234,
                  title: 'Test Vulnerability',
                  overview: 'Test Description',
                  severity: 'high',
                  module_name: 'test-package',
                  findings: [{
                    version: '1.0.0',
                    paths: ['node_modules/test-package']
                  }],
                  patched_versions: '>=2.0.0',
                  references: ['https://test.com']
                }
              }
            })
          });
        }
        return { stdout: '{}' };
      });
    });

    it('should scan project and return results', async () => {
      const result = await securityService.scanProject(mockPath);

      expect(result).toMatchObject({
        vulnerabilities: expect.arrayContaining([
          expect.objectContaining({
            id: '1234',
            title: 'Test Vulnerability',
            severity: 'HIGH'
          })
        ]),
        summary: expect.objectContaining({
          critical: expect.any(Number),
          high: expect.any(Number)
        })
      });
    });

    it('should handle scan failures gracefully', async () => {
      mockExec.mockImplementation(() => {
        throw new Error('Scan failed');
      });

      await expect(securityService.scanProject(mockPath))
        .rejects
        .toThrow('Security scan failed');
    });

    it('should normalize severity levels correctly', async () => {
      const result = await securityService.scanProject(mockPath);
      
      result.vulnerabilities.forEach(vuln => {
        expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(vuln.severity);
      });
    });

    it('should count vulnerabilities by severity correctly', async () => {
      const result = await securityService.scanProject(mockPath);
      
      const totalVulns = result.vulnerabilities.length;
      const sumBySeverity = 
        result.summary.critical +
        result.summary.high +
        result.summary.medium +
        result.summary.low;
      
      expect(sumBySeverity).toBe(totalVulns);
    });
  });
}); 