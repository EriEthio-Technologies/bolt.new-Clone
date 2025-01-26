import { SecurityAuditService } from '../SecurityAuditService';
import { DependencyScanner } from '../scanners/DependencyScanner';
import { EndpointScanner } from '../scanners/EndpointScanner';
import { CodeScanner } from '../scanners/CodeScanner';
import { DebugService } from '../../debug/DebugService';
import { UIMonitor } from '../../monitoring/UIMonitor';

jest.mock('../scanners/DependencyScanner');
jest.mock('../scanners/EndpointScanner');
jest.mock('../scanners/CodeScanner');
jest.mock('../../debug/DebugService');
jest.mock('../../monitoring/UIMonitor');

describe('SecurityAuditService', () => {
  let service: SecurityAuditService;
  let mockDebug: jest.Mocked<DebugService>;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  let mockDependencyScanner: jest.Mocked<DependencyScanner>;
  let mockEndpointScanner: jest.Mocked<EndpointScanner>;
  let mockCodeScanner: jest.Mocked<CodeScanner>;

  beforeEach(() => {
    mockDebug = {
      log: jest.fn()
    } as any;

    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockDependencyScanner = {
      scanDependencies: jest.fn().mockResolvedValue([])
    } as any;

    mockEndpointScanner = {
      scanEndpoints: jest.fn().mockResolvedValue([])
    } as any;

    mockCodeScanner = {
      scanCode: jest.fn().mockResolvedValue([])
    } as any;

    service = new SecurityAuditService(
      mockDebug,
      mockUIMonitor,
      mockDependencyScanner,
      mockEndpointScanner,
      mockCodeScanner
    );
  });

  describe('runSecurityScan', () => {
    it('runs all scanners and aggregates results', async () => {
      mockDependencyScanner.scanDependencies.mockResolvedValue([{
        name: 'test-pkg',
        version: '1.0.0',
        vulnerabilities: [{
          id: 'DEP-001',
          severity: 'high',
          description: 'Test vulnerability',
          fixedIn: '1.0.1'
        }]
      }]);

      mockEndpointScanner.scanEndpoints.mockResolvedValue([{
        path: '/test',
        method: 'GET',
        vulnerabilities: [],
        securityHeaders: [],
        authenticationRequired: true,
        rateLimited: true
      }]);

      mockCodeScanner.scanCode.mockResolvedValue([{
        file: 'test.ts',
        vulnerabilities: [],
        codeQuality: {
          complexity: 5,
          maintainability: 80,
          issues: []
        }
      }]);

      const report = await service.runSecurityScan();

      expect(report.overallRisk).toBe('high');
      expect(report.vulnerabilities).toHaveLength(1);
      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalled();
    });

    it('handles scanner errors gracefully', async () => {
      const error = new Error('Scanner failed');
      mockDependencyScanner.scanDependencies.mockRejectedValue(error);

      await expect(service.runSecurityScan()).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'SecurityAuditService',
        'Security scan failed',
        { error }
      );
    });
  });

  describe('calculateOverallRisk', () => {
    it('returns correct risk level based on vulnerabilities', () => {
      const service = new SecurityAuditService(
        mockDebug,
        mockUIMonitor,
        mockDependencyScanner,
        mockEndpointScanner,
        mockCodeScanner
      );

      expect(service['calculateOverallRisk']([])).toBe('low');
      expect(service['calculateOverallRisk']([
        { severity: 'low', id: '1', type: 'test', description: '', affectedComponent: '', remediation: '' }
      ])).toBe('low');
      expect(service['calculateOverallRisk']([
        { severity: 'critical', id: '1', type: 'test', description: '', affectedComponent: '', remediation: '' }
      ])).toBe('critical');
    });
  });
}); 