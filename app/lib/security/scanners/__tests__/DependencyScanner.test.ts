import { DependencyScanner } from '../DependencyScanner';
import { DebugService } from '../../../debug/DebugService';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

jest.mock('child_process');
jest.mock('fs');
jest.mock('../../../debug/DebugService');

describe('DependencyScanner', () => {
  let scanner: DependencyScanner;
  let mockDebug: jest.Mocked<DebugService>;

  beforeEach(() => {
    mockDebug = {
      log: jest.fn()
    } as any;

    scanner = new DependencyScanner(mockDebug);

    (execSync as jest.Mock).mockReturnValue(JSON.stringify({
      vulnerabilities: {
        'test-package': [{
          id: 'TEST-001',
          severity: 'high',
          overview: 'Test vulnerability',
          fixAvailable: { version: '2.0.0' }
        }]
      }
    }));

    (readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      dependencies: {
        'test-package': '1.0.0'
      },
      devDependencies: {
        'dev-package': '1.0.0'
      }
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scanDependencies', () => {
    it('scans dependencies and returns vulnerabilities', async () => {
      const results = await scanner.scanDependencies();

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        name: 'test-package',
        version: '1.0.0',
        vulnerabilities: [{
          id: 'TEST-001',
          severity: 'high',
          description: 'Test vulnerability',
          fixedIn: '2.0.0'
        }]
      });
    });

    it('handles npm audit errors', async () => {
      const error = new Error('npm audit failed');
      (execSync as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(scanner.scanDependencies()).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'DependencyScanner',
        'Failed to scan dependencies',
        { error }
      );
    });

    it('handles package.json read errors', async () => {
      const error = new Error('Failed to read package.json');
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(scanner.scanDependencies()).rejects.toThrow(error);
    });
  });
}); 