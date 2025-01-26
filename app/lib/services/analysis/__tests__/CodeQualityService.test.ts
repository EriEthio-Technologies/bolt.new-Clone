import { CodeQualityService } from '../CodeQualityService';
import { exec } from 'child_process';
import * as ts from 'typescript';
import { readFile } from 'fs/promises';
import type { CodeQualityResult } from '~/types/quality';

jest.mock('child_process');
jest.mock('typescript');
jest.mock('fs/promises');

describe('CodeQualityService', () => {
  let qualityService: CodeQualityService;
  const mockExec = exec as jest.Mock;

  beforeEach(() => {
    qualityService = new CodeQualityService();
    jest.clearAllMocks();

    // Mock file content
    (readFile as jest.Mock).mockResolvedValue(`
      function test() {
        if (true) {
          console.log('test');
          for (let i = 0; i < 10; i++) {
            if (i > 5) {
              return i;
            }
          }
        }
        return null;
      }
    `);

    // Mock TypeScript source file creation
    (ts.createSourceFile as jest.Mock).mockReturnValue({
      getFullText: () => (readFile as jest.Mock).mock.results[0].value,
      statements: [],
      forEachChild: jest.fn()
    });
  });

  describe('analyzeCodeQuality', () => {
    const mockPath = 'src/test.ts';

    beforeEach(() => {
      // Mock Jest coverage results
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('jest --coverage')) {
          callback(null, {
            stdout: JSON.stringify({
              total: {
                lines: { total: 100, covered: 80, pct: 80 },
                statements: { total: 50, covered: 40, pct: 80 },
                functions: { total: 20, covered: 15, pct: 75 },
                branches: { total: 30, covered: 20, pct: 66.67 }
              }
            })
          });
        } else if (command.includes('jscpd')) {
          callback(null, {
            stdout: JSON.stringify({
              statistics: {
                total: {
                  percentage: 5.5
                }
              },
              duplicates: [{
                firstFile: {
                  name: 'test1.ts',
                  start: { line: 1 },
                  end: { line: 10 }
                },
                secondFile: {
                  name: 'test2.ts'
                },
                lines: 10
              }]
            })
          });
        } else if (command.includes('sonar-scanner')) {
          callback(null, {
            stdout: JSON.stringify({
              measures: {
                sqale_debt_ratio: 8.5
              },
              issues: [{
                type: 'CODE_SMELL',
                severity: 'MAJOR',
                component: 'test.ts',
                line: 5,
                message: 'Test issue',
                effort: '30min'
              }]
            })
          });
        }
        return { stdout: '{}' };
      });
    });

    it('should analyze code and return comprehensive results', async () => {
      const result = await qualityService.analyzeCodeQuality(mockPath);

      expect(result).toMatchObject({
        metrics: expect.objectContaining({
          codeSize: expect.any(Object),
          complexity: expect.any(Object),
          maintainability: expect.any(Object)
        }),
        coverage: expect.objectContaining({
          lines: expect.objectContaining({
            percentage: 80
          })
        }),
        duplication: expect.objectContaining({
          percentage: 5.5
        }),
        technicalDebt: expect.objectContaining({
          rating: 'B',
          ratio: 8.5
        })
      });
    });

    it('should calculate code metrics correctly', async () => {
      const result = await qualityService.analyzeCodeQuality(mockPath);

      expect(result.metrics.complexity).toMatchObject({
        cyclomatic: expect.any(Number),
        cognitive: expect.any(Number),
        halstead: expect.objectContaining({
          difficulty: expect.any(Number),
          bugs: expect.any(Number)
        })
      });

      expect(result.metrics.complexity.cyclomatic).toBeGreaterThan(1);
      expect(result.metrics.complexity.halstead.bugs).toBeGreaterThanOrEqual(0);
    });

    it('should handle coverage analysis failures gracefully', async () => {
      mockExec.mockImplementation((command) => {
        if (command.includes('jest --coverage')) {
          throw new Error('Coverage failed');
        }
        return { stdout: '{}' };
      });

      const result = await qualityService.analyzeCodeQuality(mockPath);
      expect(result.coverage).toEqual(expect.objectContaining({
        lines: { total: 0, covered: 0, percentage: 0 }
      }));
    });

    it('should calculate technical debt rating correctly', async () => {
      const testCases = [
        { ratio: 3, expected: 'A' },
        { ratio: 8, expected: 'B' },
        { ratio: 15, expected: 'C' },
        { ratio: 30, expected: 'D' },
        { ratio: 60, expected: 'E' }
      ];

      for (const { ratio, expected } of testCases) {
        mockExec.mockImplementation((command, callback) => {
          if (command.includes('sonar-scanner')) {
            callback(null, {
              stdout: JSON.stringify({
                measures: { sqale_debt_ratio: ratio },
                issues: []
              })
            });
          }
          return { stdout: '{}' };
        });

        const result = await qualityService.analyzeCodeQuality(mockPath);
        expect(result.technicalDebt.rating).toBe(expected);
      }
    });

    it('should handle analysis failures gracefully', async () => {
      mockExec.mockImplementation(() => {
        throw new Error('Analysis failed');
      });

      await expect(qualityService.analyzeCodeQuality(mockPath))
        .rejects
        .toThrow('Code quality analysis failed');
    });
  });
}); 