import { StaticAnalysisService } from '../StaticAnalysisService';
import { ESLint } from 'eslint';
import * as ts from 'typescript';
import { readFile } from 'fs/promises';
import type { StaticAnalysisResult } from '~/types/analysis';

jest.mock('eslint');
jest.mock('typescript');
jest.mock('fs/promises');

describe('StaticAnalysisService', () => {
  let analysisService: StaticAnalysisService;
  let mockESLint: jest.Mocked<ESLint>;

  beforeEach(() => {
    // Mock TypeScript configuration
    (ts.findConfigFile as jest.Mock).mockReturnValue('tsconfig.json');
    (ts.readConfigFile as jest.Mock).mockReturnValue({ config: {} });
    (ts.parseJsonConfigFileContent as jest.Mock).mockReturnValue({
      options: {}
    });

    // Mock ESLint
    mockESLint = {
      lintFiles: jest.fn(),
      loadFormatter: jest.fn()
    } as any;

    (ESLint as jest.Mock).mockImplementation(() => mockESLint);

    analysisService = new StaticAnalysisService();
  });

  describe('analyzeCode', () => {
    const mockPath = 'src/test.ts';
    const mockSourceCode = `
      function test() {
        if (true) {
          console.log('test');
        }
      }
    `;

    beforeEach(() => {
      (readFile as jest.Mock).mockResolvedValue(mockSourceCode);
      
      // Mock ESLint results
      mockESLint.lintFiles.mockResolvedValue([{
        filePath: mockPath,
        messages: [{
          ruleId: 'no-console',
          severity: 2,
          message: 'Unexpected console statement',
          line: 4,
          column: 11
        }],
        errorCount: 1,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0
      }]);

      // Mock TypeScript diagnostics
      (ts.createProgram as jest.Mock).mockReturnValue({
        getSourceFile: jest.fn().mockReturnValue({
          getLineAndCharacterOfPosition: jest.fn().mockReturnValue({
            line: 3,
            character: 10
          })
        }),
        getTypeChecker: jest.fn(),
        getSemanticDiagnostics: jest.fn().mockReturnValue([{
          code: 2322,
          messageText: 'Type error',
          start: 0,
          category: ts.DiagnosticCategory.Error
        }]),
        getSyntacticDiagnostics: jest.fn().mockReturnValue([])
      });
    });

    it('should analyze code and return results', async () => {
      const result = await analysisService.analyzeCode(mockPath);

      expect(result).toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'lint',
            ruleId: 'no-console',
            severity: 'error'
          }),
          expect.objectContaining({
            type: 'typecheck',
            ruleId: 'TS2322',
            severity: 'error'
          })
        ]),
        metrics: expect.objectContaining({
          cyclomaticComplexity: expect.any(Number),
          cognitiveComplexity: expect.any(Number),
          maintainabilityIndex: expect.any(Number)
        })
      });
    });

    it('should calculate complexity metrics correctly', async () => {
      const result = await analysisService.analyzeCode(mockPath);

      expect(result.metrics).toMatchObject({
        cyclomaticComplexity: expect.any(Number),
        cognitiveComplexity: expect.any(Number),
        maintainabilityIndex: expect.any(Number),
        linesOfCode: expect.any(Number),
        commentDensity: expect.any(Number)
      });

      expect(result.metrics.maintainabilityIndex).toBeGreaterThanOrEqual(0);
      expect(result.metrics.maintainabilityIndex).toBeLessThanOrEqual(100);
    });

    it('should handle analysis errors gracefully', async () => {
      mockESLint.lintFiles.mockRejectedValue(new Error('Lint failed'));

      await expect(analysisService.analyzeCode(mockPath))
        .rejects
        .toThrow('Static analysis failed');
    });
  });
}); 