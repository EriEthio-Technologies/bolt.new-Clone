import { DomainContextExtractor } from '../DomainContextExtractor';
import * as ts from 'typescript';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import type { DomainContext } from '~/types/context';

jest.mock('fs/promises');
jest.mock('typescript', () => ({
  ...jest.requireActual('typescript'),
  createProgram: jest.fn(),
  findConfigFile: jest.fn(),
  readConfigFile: jest.fn(),
  parseJsonConfigFileContent: jest.fn(),
  createSourceFile: jest.fn()
}));

describe('DomainContextExtractor', () => {
  let extractor: DomainContextExtractor;
  const mockRootPath = '/project/root';

  beforeEach(() => {
    // Mock TypeScript configuration
    (ts.findConfigFile as jest.Mock).mockReturnValue('tsconfig.json');
    (ts.readConfigFile as jest.Mock).mockReturnValue({ config: {} });
    (ts.parseJsonConfigFileContent as jest.Mock).mockReturnValue({
      fileNames: ['test.ts'],
      options: {}
    });

    // Mock file system
    (readdir as jest.Mock).mockResolvedValue([
      { name: 'test.ts', isDirectory: () => false, isFile: () => true },
      { name: 'types', isDirectory: () => true, isFile: () => false }
    ]);

    (readFile as jest.Mock).mockResolvedValue(`
      import { Service } from 'typedi';
      
      @Service()
      export class TestService {
        constructor(private readonly dep: Dependency) {}
        
        async testMethod(param: string): Promise<void> {
          if (param) {
            return;
          }
        }
      }
    `);

    extractor = new DomainContextExtractor();
  });

  describe('extractContext', () => {
    it('should extract complete domain context', async () => {
      const context = await extractor.extractContext(mockRootPath);

      expect(context).toMatchObject({
        entities: expect.any(Array),
        services: expect.any(Array),
        dependencies: expect.objectContaining({
          nodes: expect.any(Map),
          edges: expect.any(Array)
        }),
        metadata: expect.objectContaining({
          totalFiles: expect.any(Number),
          totalLines: expect.any(Number)
        }),
        timestamp: expect.any(Date)
      });
    });

    it('should handle extraction errors gracefully', async () => {
      (readdir as jest.Mock).mockRejectedValue(new Error('File system error'));

      await expect(extractor.extractContext(mockRootPath))
        .rejects
        .toThrow('Domain context extraction failed');
    });
  });

  describe('extractEntities', () => {
    it('should extract entity definitions correctly', async () => {
      (readFile as jest.Mock).mockResolvedValue(`
        export interface TestEntity {
          id: string;
          name?: string;
          @OneToMany(() => RelatedEntity)
          relations: RelatedEntity[];
        }
      `);

      const context = await extractor.extractContext(mockRootPath);
      const entity = context.entities[0];

      expect(entity).toMatchObject({
        name: 'TestEntity',
        type: 'interface',
        properties: expect.arrayContaining([
          expect.objectContaining({
            name: 'id',
            type: 'string',
            optional: false
          })
        ]),
        relations: expect.arrayContaining([
          expect.objectContaining({
            type: 'oneToMany',
            target: 'RelatedEntity'
          })
        ])
      });
    });
  });

  describe('extractServices', () => {
    it('should extract service definitions correctly', async () => {
      const context = await extractor.extractContext(mockRootPath);
      const service = context.services[0];

      expect(service).toMatchObject({
        name: 'TestService',
        methods: expect.arrayContaining([
          expect.objectContaining({
            name: 'testMethod',
            returnType: 'Promise<void>',
            isAsync: true
          })
        ]),
        dependencies: expect.arrayContaining([
          expect.objectContaining({
            service: 'Dependency',
            type: 'required'
          })
        ])
      });
    });

    it('should calculate service metrics correctly', async () => {
      const context = await extractor.extractContext(mockRootPath);
      const service = context.services[0];

      expect(service.metadata).toMatchObject({
        isAsync: true,
        hasTests: expect.any(Boolean),
        metrics: expect.objectContaining({
          complexity: expect.any(Number),
          dependencies: expect.any(Number),
          coverage: expect.any(Number)
        })
      });
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build correct dependency graph', async () => {
      const context = await extractor.extractContext(mockRootPath);
      const { nodes, edges } = context.dependencies;

      expect(nodes.size).toBeGreaterThan(0);
      expect(edges.length).toBeGreaterThan(0);

      const testNode = nodes.get('test.ts');
      expect(testNode).toMatchObject({
        imports: expect.arrayContaining([
          expect.objectContaining({
            name: 'Service',
            path: 'typedi'
          })
        ]),
        type: expect.stringMatching(/^(service|entity|util|test|config)$/)
      });
    });

    it('should resolve import paths correctly', async () => {
      const context = await extractor.extractContext(mockRootPath);
      const { edges } = context.dependencies;

      const importEdge = edges.find(e => e.type === 'import');
      expect(importEdge).toBeDefined();
      expect(importEdge!.from).toContain('test.ts');
      expect(importEdge!.to).toBeDefined();
    });
  });

  describe('generateContextMetadata', () => {
    it('should generate accurate metadata', async () => {
      const context = await extractor.extractContext(mockRootPath);
      const { metadata } = context;

      expect(metadata).toMatchObject({
        totalFiles: expect.any(Number),
        totalLines: expect.any(Number),
        fileTypes: expect.any(Object),
        complexity: expect.objectContaining({
          average: expect.any(Number),
          highest: expect.any(Number),
          distribution: expect.any(Object)
        }),
        coverage: expect.objectContaining({
          lines: expect.any(Number),
          functions: expect.any(Number)
        })
      });
    });

    it('should handle missing test coverage gracefully', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const context = await extractor.extractContext(mockRootPath);
      
      expect(context.metadata.coverage).toEqual({
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0
      });
    });
  });

  describe('integration', () => {
    it('should handle complex project structures', async () => {
      (readdir as jest.Mock).mockImplementation(async (path: string) => {
        if (path === mockRootPath) {
          return [
            { name: 'src', isDirectory: () => true, isFile: () => false },
            { name: 'tests', isDirectory: () => true, isFile: () => false }
          ];
        }
        return [
          { name: 'test.ts', isDirectory: () => false, isFile: () => true },
          { name: 'test.test.ts', isDirectory: () => false, isFile: () => true }
        ];
      });

      const context = await extractor.extractContext(mockRootPath);
      
      expect(context.metadata.totalFiles).toBeGreaterThan(0);
      expect(context.services.some(s => s.metadata.hasTests)).toBe(true);
    });

    it('should maintain referential integrity in dependency graph', async () => {
      const context = await extractor.extractContext(mockRootPath);
      const { nodes, edges } = context.dependencies;

      edges.forEach(edge => {
        expect(nodes.has(edge.from)).toBe(true);
        if (edge.to.startsWith('.')) {
          expect(nodes.has(edge.to)).toBe(true);
        }
      });
    });
  });
}); 