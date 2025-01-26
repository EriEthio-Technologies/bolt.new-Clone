import { ContextTracker } from '../ContextTracker';
import { DomainContextExtractor } from '../DomainContextExtractor';
import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { execAsync } from '~/utils/execAsync';
import type { DomainContext, ContextChange } from '~/types/context';

jest.mock('fs/promises');
jest.mock('~/utils/execAsync');
jest.mock('../DomainContextExtractor');

describe('ContextTracker', () => {
  let tracker: ContextTracker;
  let mockExtractor: jest.Mocked<DomainContextExtractor>;
  const mockRootPath = '/project/root';

  const mockContext: DomainContext = {
    entities: [{
      name: 'TestEntity',
      type: 'class',
      properties: [],
      relations: [],
      documentation: '',
      file: 'src/entities/TestEntity.ts',
      metadata: {
        isAbstract: false,
        decorators: []
      }
    }],
    services: [{
      name: 'TestService',
      methods: [{
        name: 'testMethod',
        returnType: 'void',
        parameters: [],
        documentation: '',
        isAsync: false,
        visibility: 'public'
      }],
      dependencies: [],
      documentation: '',
      file: 'src/services/TestService.ts',
      metadata: {
        isAsync: false,
        hasTests: true,
        metrics: {
          complexity: 1,
          coverage: 100,
          dependencies: 0
        }
      }
    }],
    dependencies: {
      nodes: new Map([
        ['src/services/TestService.ts', {
          imports: [],
          exports: [],
          type: 'service'
        }]
      ]),
      edges: []
    },
    metadata: {
      totalFiles: 2,
      totalLines: 100,
      fileTypes: { service: 1, entity: 1 },
      complexity: {
        average: 1,
        highest: 1,
        distribution: { '0-4': 1 }
      },
      coverage: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      },
      lastUpdated: new Date(),
      version: '1.0.0'
    },
    timestamp: new Date()
  };

  beforeEach(() => {
    mockExtractor = {
      extractContext: jest.fn().mockResolvedValue(mockContext)
    } as any;

    (readFile as jest.Mock).mockResolvedValue('{}');
    (writeFile as jest.Mock).mockResolvedValue(undefined);
    (readdir as jest.Mock).mockResolvedValue([]);
    (execAsync as jest.Mock).mockResolvedValue({ stdout: 'abcdef1|Test User|test@example.com|1234567890|Test commit' });

    tracker = new ContextTracker(mockExtractor);
  });

  describe('trackChanges', () => {
    it('should detect and track entity changes', async () => {
      const modifiedContext = {
        ...mockContext,
        entities: [{
          ...mockContext.entities[0],
          properties: [{
            name: 'newProp',
            type: 'string',
            optional: false,
            documentation: ''
          }]
        }]
      };

      mockExtractor.extractContext
        .mockResolvedValueOnce(mockContext)
        .mockResolvedValueOnce(modifiedContext);

      // First call to establish baseline
      await tracker.trackChanges(mockRootPath);
      
      // Second call to detect changes
      const changes = await tracker.trackChanges(mockRootPath);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        type: 'entity',
        action: 'modified',
        name: 'TestEntity'
      });
    });

    it('should detect and track service changes', async () => {
      const modifiedContext = {
        ...mockContext,
        services: [{
          ...mockContext.services[0],
          methods: [
            ...mockContext.services[0].methods,
            {
              name: 'newMethod',
              returnType: 'void',
              parameters: [],
              documentation: '',
              isAsync: false,
              visibility: 'public'
            }
          ]
        }]
      };

      mockExtractor.extractContext
        .mockResolvedValueOnce(mockContext)
        .mockResolvedValueOnce(modifiedContext);

      await tracker.trackChanges(mockRootPath);
      const changes = await tracker.trackChanges(mockRootPath);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        type: 'service',
        action: 'modified',
        name: 'TestService',
        details: {
          methodChanges: expect.arrayContaining([
            expect.objectContaining({
              type: 'method_added',
              name: 'newMethod'
            })
          ])
        }
      });
    });

    it('should enrich changes with git information', async () => {
      const modifiedContext = {
        ...mockContext,
        entities: [
          ...mockContext.entities,
          {
            name: 'NewEntity',
            type: 'class',
            properties: [],
            relations: [],
            documentation: '',
            file: 'src/entities/NewEntity.ts',
            metadata: {
              isAbstract: false,
              decorators: []
            }
          }
        ]
      };

      mockExtractor.extractContext
        .mockResolvedValueOnce(mockContext)
        .mockResolvedValueOnce(modifiedContext);

      await tracker.trackChanges(mockRootPath);
      const changes = await tracker.trackChanges(mockRootPath);

      expect(changes[0].git).toBeDefined();
      expect(changes[0].git).toMatchObject({
        commit: expect.any(String),
        author: expect.any(String),
        email: expect.any(String),
        timestamp: expect.any(Date),
        message: expect.any(String)
      });
    });

    it('should handle missing git information gracefully', async () => {
      (execAsync as jest.Mock).mockRejectedValue(new Error('Git command failed'));

      const modifiedContext = {
        ...mockContext,
        entities: []
      };

      mockExtractor.extractContext
        .mockResolvedValueOnce(mockContext)
        .mockResolvedValueOnce(modifiedContext);

      await tracker.trackChanges(mockRootPath);
      const changes = await tracker.trackChanges(mockRootPath);

      expect(changes[0].git).toBeUndefined();
    });
  });

  describe('getContextHistory', () => {
    it('should return context version history', async () => {
      const mockSnapshots = [
        {
          version: '1.0.0-abc123',
          changes: [{ type: 'entity', action: 'added' }],
          timestamp: new Date()
        },
        {
          version: '1.0.0-def456',
          changes: [{ type: 'service', action: 'modified' }],
          timestamp: new Date()
        }
      ];

      (readdir as jest.Mock).mockResolvedValue(['1.json', '2.json']);
      (readFile as jest.Mock).mockImplementation((path) => {
        const index = path.endsWith('1.json') ? 0 : 1;
        return Promise.resolve(JSON.stringify(mockSnapshots[index]));
      });

      const history = await tracker.getContextHistory();

      expect(history).toHaveLength(2);
      expect(history[0]).toMatchObject({
        version: expect.any(String),
        changes: expect.any(Number),
        significant: expect.any(Boolean)
      });
    });
  });

  describe('getDiff', () => {
    it('should generate diff between versions', async () => {
      const mockSnapshots = [
        {
          version: 'v1',
          context: mockContext,
          changes: [],
          timestamp: new Date()
        },
        {
          version: 'v2',
          context: {
            ...mockContext,
            entities: []
          },
          changes: [],
          timestamp: new Date()
        }
      ];

      (readdir as jest.Mock).mockResolvedValue(['1.json', '2.json']);
      (readFile as jest.Mock).mockImplementation((path) => {
        const index = path.endsWith('1.json') ? 0 : 1;
        return Promise.resolve(JSON.stringify(mockSnapshots[index]));
      });

      const diff = await tracker.getDiff('v1', 'v2');

      expect(diff).toMatchObject({
        from: 'v1',
        to: 'v2',
        timestamp: expect.any(Date),
        changes: expect.arrayContaining([
          expect.objectContaining({
            type: 'entity',
            action: 'removed'
          })
        ])
      });
    });

    it('should handle missing versions gracefully', async () => {
      (readdir as jest.Mock).mockResolvedValue([]);

      await expect(tracker.getDiff('v1', 'v2'))
        .rejects
        .toThrow('Version not found');
    });
  });

  describe('integration', () => {
    it('should maintain context history correctly', async () => {
      const contexts = [
        mockContext,
        {
          ...mockContext,
          entities: [
            ...mockContext.entities,
            {
              name: 'NewEntity',
              type: 'class',
              properties: [],
              relations: [],
              documentation: '',
              file: 'src/entities/NewEntity.ts',
              metadata: {
                isAbstract: false,
                decorators: []
              }
            }
          ]
        },
        {
          ...mockContext,
          entities: []
        }
      ];

      mockExtractor.extractContext
        .mockResolvedValueOnce(contexts[0])
        .mockResolvedValueOnce(contexts[1])
        .mockResolvedValueOnce(contexts[2]);

      // Track changes multiple times
      await tracker.trackChanges(mockRootPath);
      await tracker.trackChanges(mockRootPath);
      await tracker.trackChanges(mockRootPath);

      const history = await tracker.getContextHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history.every(v => v.version && v.timestamp)).toBe(true);
    });

    it('should handle concurrent tracking operations', async () => {
      const modifiedContext = {
        ...mockContext,
        entities: []
      };

      mockExtractor.extractContext
        .mockResolvedValueOnce(mockContext)
        .mockResolvedValueOnce(modifiedContext);

      const operations = Array(3).fill(null).map(() => 
        tracker.trackChanges(mockRootPath)
      );

      const results = await Promise.all(operations);
      expect(results.every(Array.isArray)).toBe(true);
    });
  });
}); 