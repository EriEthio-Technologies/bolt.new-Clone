import { CodeScanner } from '../CodeScanner';
import { DebugService } from '../../../debug/DebugService';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import * as ESLint from 'eslint';

jest.mock('glob');
jest.mock('fs');
jest.mock('eslint');
jest.mock('../../../debug/DebugService');

describe('CodeScanner', () => {
  let scanner: CodeScanner;
  let mockDebug: jest.Mocked<DebugService>;
  let mockESLint: jest.Mocked<ESLint.ESLint>;

  beforeEach(() => {
    mockDebug = {
      log: jest.fn()
    } as any;

    mockESLint = {
      lintText: jest.fn().mockResolvedValue([{
        messages: [
          {
            ruleId: 'security/detect-eval-with-expression',
            severity: 2,
            message: 'Unsafe eval()',
            line: 1,
            column: 1
          },
          {
            ruleId: 'no-unused-vars',
            severity: 1,
            message: 'Unused variable',
            line: 2,
            column: 1
          }
        ]
      }])
    } as any;

    (ESLint.ESLint as jest.Mock).mockImplementation(() => mockESLint);
    (glob as jest.Mock).mockResolvedValue(['test.ts']);
    (readFileSync as jest.Mock).mockReturnValue('test code');

    scanner = new CodeScanner(mockDebug);
  });

  describe('scanCode', () => {
    it('scans files and detects vulnerabilities', async () => {
      const results = await scanner.scanCode();

      expect(results).toHaveLength(1);
      expect(results[0].vulnerabilities).toHaveLength(1);
      expect(results[0].vulnerabilities[0]).toMatchObject({
        id: 'security/detect-eval-with-expression',
        severity: 'high'
      });
    });

    it('includes code quality metrics', async () => {
      const results = await scanner.scanCode();

      expect(results[0].codeQuality).toMatchObject({
        complexity: expect.any(Number),
        maintainability: expect.any(Number),
        issues: expect.arrayContaining([
          expect.objectContaining({
            ruleId: 'no-unused-vars',
            severity: 'warning'
          })
        ])
      });
    });

    it('handles file read errors', async () => {
      const error = new Error('File read failed');
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(scanner.scanCode()).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'CodeScanner',
        'Failed to scan code',
        { error }
      );
    });

    it('provides remediation suggestions', async () => {
      const results = await scanner.scanCode();

      expect(results[0].vulnerabilities[0].remediation).toBe(
        'Avoid using eval() with dynamic expressions'
      );
    });
  });
}); 