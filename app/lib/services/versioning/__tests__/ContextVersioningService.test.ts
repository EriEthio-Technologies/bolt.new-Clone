import { ContextVersioningService } from '../ContextVersioningService';
import { ContextPersistenceService } from '../../persistence/ContextPersistenceService';
import { readFile, writeFile } from 'fs/promises';
import { execAsync } from '~/utils/execAsync';
import type { DomainContext } from '~/types/context';

jest.mock('fs/promises');
jest.mock('~/utils/execAsync');
jest.mock('../../persistence/ContextPersistenceService');

describe('ContextVersioningService', () => {
  let service: ContextVersioningService;
  let mockPersistenceService: jest.Mocked<ContextPersistenceService>;

  const mockContext: DomainContext = {
    entities: [{
      name: 'TestEntity',
      type: 'class',
      properties: [],
      relations: [],
      documentation: '',
      file: 'test.ts',
      metadata: {
        isAbstract: false,
        decorators: []
      }
    }],
    services: [],
    dependencies: {
      nodes: new Map(),
      edges: []
    },
    metadata: {
      totalFiles: 1,
      totalLines: 100,
      fileTypes: {},
      complexity: {
        average: 1,
        highest: 1,
        distribution: {}
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
    mockPersistenceService = {
      saveContext: jest.fn().mockResolvedValue(undefined)
    } as any;

    (readFile as jest.Mock).mockResolvedValue(JSON.stringify({
      branches: { main: null },
      tags: {},
      lastUpdated: new Date()
    }));
    (writeFile as jest.Mock).mockResolvedValue(undefined);
    (execAsync as jest.Mock).mockImplementation(async (command: string) => {
      if (command.includes('rev-parse')) {
        return { stdout: 'abcdef1234567' };
      }
      if (command.includes('config user.name')) {
        return { stdout: 'Test User' };
      }
      if (command.includes('log -1')) {
        return { stdout: 'Test commit message' };
      }
      return { stdout: '' };
    });

    service = new ContextVersioningService(mockPersistenceService);
  });

  describe('createVersion', () => {
    it('should create a new version successfully', async () => {
      const result = await service.createVersion(mockContext);

      expect(result).toMatchObject({
        version: expect.stringMatching(/^main-[a-f0-9]{7}-\d+$/),
        branch: 'main',
        timestamp: expect.any(Date),
        context: mockContext,
        metadata: {
          author: 'Test User',
          message: 'Test commit message',
          tags: []
        }
      });

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.any(String)
      );
    });

    it('should calculate diff when previous version exists', async () => {
      // First version
      await service.createVersion(mockContext);

      // Modified context
      const modifiedContext = {
        ...mockContext,
        entities: [
          {
            ...mockContext.entities[0],
            properties: [{ name: 'newProp', type: 'string', optional: false }]
          }
        ]
      };

      const result = await service.createVersion(modifiedContext);
      expect(result.diff).toBeDefined();
      expect(result.diff!.entities.modified).toHaveLength(1);
    });

    it('should handle version creation errors gracefully', async () => {
      (writeFile as jest.Mock).mockRejectedValueOnce(new Error('Write failed'));

      await expect(service.createVersion(mockContext))
        .rejects
        .toThrow('Version creation failed');
    });
  });

  describe('createBranch', () => {
    it('should create a new branch successfully', async () => {
      const mainVersion = await service.createVersion(mockContext);
      const branch = await service.createBranch('feature');

      expect(branch).toMatchObject({
        name: 'feature',
        head: mainVersion.version,
        base: 'main',
        author: 'Test User'
      });
    });

    it('should prevent duplicate branch creation', async () => {
      await service.createVersion(mockContext);
      await service.createBranch('feature');

      await expect(service.createBranch('feature'))
        .rejects
        .toThrow('Branch feature already exists');
    });
  });

  describe('mergeBranches', () => {
    it('should merge branches successfully', async () => {
      // Create main version
      await service.createVersion(mockContext);

      // Create and modify feature branch
      await service.createBranch('feature');
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
            file: 'new.ts',
            metadata: {
              isAbstract: false,
              decorators: []
            }
          }
        ]
      };
      await service.createVersion(modifiedContext, 'feature');

      const result = await service.mergeBranches('feature', 'main');
      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect and handle merge conflicts', async () => {
      // Setup conflicting changes
      await service.createVersion(mockContext);
      await service.createBranch('feature');

      const mainModified = {
        ...mockContext,
        entities: [{
          ...mockContext.entities[0],
          properties: [{ name: 'mainProp', type: 'string', optional: false }]
        }]
      };

      const featureModified = {
        ...mockContext,
        entities: [{
          ...mockContext.entities[0],
          properties: [{ name: 'featureProp', type: 'string', optional: false }]
        }]
      };

      await service.createVersion(mainModified, 'main');
      await service.createVersion(featureModified, 'feature');

      const result = await service.mergeBranches('feature', 'main');
      expect(result.conflicts).toHaveLength(1);
    });
  });

  describe('getVersionHistory', () => {
    it('should return complete version history', async () => {
      await service.createVersion(mockContext);
      await service.createVersion({
        ...mockContext,
        timestamp: new Date()
      });

      const history = await service.getVersionHistory();
      expect(history).toHaveLength(2);
      expect(history[0].metadata.parent).toBe(history[1].version);
    });

    it('should handle empty history gracefully', async () => {
      const history = await service.getVersionHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('integration', () => {
    it('should maintain version chain integrity', async () => {
      const version1 = await service.createVersion(mockContext);
      const version2 = await service.createVersion({
        ...mockContext,
        timestamp: new Date()
      });
      const version3 = await service.createVersion({
        ...mockContext,
        timestamp: new Date()
      });

      const history = await service.getVersionHistory();
      expect(history).toHaveLength(3);
      expect(history[0].version).toBe(version3.version);
      expect(history[1].version).toBe(version2.version);
      expect(history[2].version).toBe(version1.version);
    });

    it('should handle concurrent operations', async () => {
      const operations = Array(3).fill(null).map(() => 
        service.createVersion(mockContext)
      );

      const results = await Promise.all(operations);
      expect(results).toHaveLength(3);
      expect(new Set(results.map(r => r.version)).size).toBe(3);
    });
  });
}); 