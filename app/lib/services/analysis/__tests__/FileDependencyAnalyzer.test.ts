import { FileDependencyAnalyzer } from '../FileDependencyAnalyzer';
import { DomainContextExtractor } from '../../context/DomainContextExtractor';
import * as ts from 'typescript';
import { readFile } from 'fs/promises';
import type { DependencyAnalysis } from '~/types/dependencies';

jest.mock('fs/promises');
jest.mock('typescript', () => ({
  ...jest.requireActual('typescript'),
  createProgram: jest.fn(),
  findConfigFile: jest.fn(),
  readConfigFile: jest.fn(),
  parseJsonConfigFileContent: jest.fn(),
  createSourceFile: jest.fn(),
  sys: {
    readFile: jest.fn(),
    fileExists: jest.fn()
  }
}));
jest.mock('../../context/DomainContextExtractor');

describe('FileDependencyAnalyzer', () => {
  let analyzer: FileDependencyAnalyzer;
  let mockExtractor: jest.Mocked<DomainContextExtractor>;
  const mockRootPath = '/project/root';

  const mockContext = {
    dependencies: {
      nodes: new Map([
        ['src/services/TestService.ts', {
          imports: [{ name: 'Entity', path: '../entities/TestEntity' }],
          exports: [{ name: 'TestService', type: 'value' }],
          type: 'service'
        }],
        ['src/entities/TestEntity.ts', {
          imports: [],
          exports: [{ name: 'TestEntity', type: 'value' }],
          type: 'entity'
        }]
      ]),
      edges: [
        {
          from: 'src/services/TestService.ts',
          to: 'src/entities/TestEntity.ts',
          type: 'import'
        }
      ]
    }
  };

  beforeEach(() => {
    mockExtractor = {
      extractContext: jest.fn().mockResolvedValue(mockContext)
    } as any;

    (ts.sys.readFile as jest.Mock).mockReturnValue(`
      import { TestEntity } from '../entities/TestEntity';
      
      export class TestService {
        constructor(private entity: TestEntity) {}
        
        async process(): Promise<void> {
          if (this.entity) {
            return;
          }
        }
      }
    `);

    analyzer = new FileDependencyAnalyzer(mockExtractor);
  });

  describe('analyzeDependencies', () => {
    it('should analyze project dependencies correctly', async () => {
      const result = await analyzer.analyzeDependencies(mockRootPath);

      expect(result).toMatchObject({
        graph: {
          nodes: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              type: expect.any(String),
              complexity: expect.any(Number)
            })
          ]),
          edges: expect.arrayContaining([
            expect.objectContaining({
              source: expect.any(String),
              target: expect.any(String),
              type: expect.any(String)
            })
          ])
        },
        metrics: expect.objectContaining({
          totalFiles: expect.any(Number),
          totalDependencies: expect.any(Number)
        }),
        timestamp: expect.any(Date)
      });
    });

    it('should detect circular dependencies', async () => {
      const circularContext = {
        dependencies: {
          nodes: new Map([
            ['A.ts', { imports: [{ name: 'B', path: './B' }], type: 'service' }],
            ['B.ts', { imports: [{ name: 'C', path: './C' }], type: 'service' }],
            ['C.ts', { imports: [{ name: 'A', path: './A' }], type: 'service' }]
          ]),
          edges: [
            { from: 'A.ts', to: 'B.ts', type: 'import' },
            { from: 'B.ts', to: 'C.ts', type: 'import' },
            { from: 'C.ts', to: 'A.ts', type: 'import' }
          ]
        }
      };

      mockExtractor.extractContext.mockResolvedValueOnce(circularContext);
      const result = await analyzer.analyzeDependencies(mockRootPath);

      expect(result.circularDependencies).toHaveLength(1);
      expect(result.circularDependencies[0].files).toHaveLength(3);
    });

    it('should calculate correct dependency metrics', async () => {
      const result = await analyzer.analyzeDependencies(mockRootPath);

      expect(result.metrics).toMatchObject({
        totalFiles: 2,
        totalDependencies: 1,
        averageDependencies: 0.5,
        maxDependencies: 1,
        dependencyCohesion: expect.any(Number),
        dependencyStability: expect.any(Number)
      });

      expect(result.metrics.dependencyCohesion).toBeGreaterThanOrEqual(0);
      expect(result.metrics.dependencyCohesion).toBeLessThanOrEqual(1);
    });

    it('should identify dependency clusters correctly', async () => {
      const result = await analyzer.analyzeDependencies(mockRootPath);

      expect(result.clusters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            files: expect.any(Array),
            cohesion: expect.any(Number)
          })
        ])
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing files gracefully', async () => {
      (ts.sys.readFile as jest.Mock).mockReturnValue(null);

      const result = await analyzer.analyzeDependencies(mockRootPath);
      expect(result.graph.nodes[0].complexity).toBe(0);
    });

    it('should handle invalid TypeScript code gracefully', async () => {
      (ts.sys.readFile as jest.Mock).mockReturnValue('invalid { typescript');

      const result = await analyzer.analyzeDependencies(mockRootPath);
      expect(result).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should handle large dependency graphs', async () => {
      const largeContext = {
        dependencies: {
          nodes: new Map(
            Array.from({ length: 100 }, (_, i) => [
              `file${i}.ts`,
              { imports: [], exports: [], type: 'service' }
            ])
          ),
          edges: Array.from({ length: 200 }, (_, i) => ({
            from: `file${i % 100}.ts`,
            to: `file${(i + 1) % 100}.ts`,
            type: 'import'
          }))
        }
      };

      mockExtractor.extractContext.mockResolvedValueOnce(largeContext);
      const result = await analyzer.analyzeDependencies(mockRootPath);

      expect(result.graph.nodes).toHaveLength(100);
      expect(result.graph.edges).toHaveLength(200);
    });

    it('should maintain referential integrity', async () => {
      const result = await analyzer.analyzeDependencies(mockRootPath);

      // Verify all edges reference existing nodes
      const nodeIds = new Set(result.graph.nodes.map(n => n.id));
      result.graph.edges.forEach(edge => {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
      });
    });
  });
}); 