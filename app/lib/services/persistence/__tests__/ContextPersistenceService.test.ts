import { ContextPersistenceService } from '../ContextPersistenceService';
import { Storage } from '@google-cloud/storage';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { execAsync } from '~/utils/execAsync';
import type { DomainContext, ContextPersistenceConfig } from '~/types/persistence';

jest.mock('@google-cloud/storage');
jest.mock('fs/promises');
jest.mock('~/utils/execAsync');

describe('ContextPersistenceService', () => {
  let service: ContextPersistenceService;
  let mockStorage: jest.Mocked<Storage>;
  let mockBucket: any;
  let mockFile: any;

  const mockContext: DomainContext = {
    entities: [],
    services: [],
    dependencies: {
      nodes: new Map(),
      edges: []
    },
    metadata: {
      totalFiles: 0,
      totalLines: 0,
      fileTypes: {},
      complexity: {
        average: 0,
        highest: 0,
        distribution: {}
      },
      coverage: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0
      },
      lastUpdated: new Date(),
      version: '1.0.0'
    },
    timestamp: new Date()
  };

  const mockConfig: ContextPersistenceConfig = {
    remoteBackup: true,
    compressionEnabled: true,
    retentionDays: 30
  };

  beforeEach(() => {
    mockFile = {
      save: jest.fn().mockResolvedValue(undefined),
      download: jest.fn().mockResolvedValue([Buffer.from('{}')]
    )};

    mockBucket = {
      exists: jest.fn().mockResolvedValue([true]),
      file: jest.fn().mockReturnValue(mockFile)
    };

    mockStorage = {
      bucket: jest.fn().mockReturnValue(mockBucket),
      createBucket: jest.fn().mockResolvedValue([mockBucket])
    } as any;

    (Storage as jest.Mock).mockImplementation(() => mockStorage);
    (mkdir as jest.Mock).mockResolvedValue(undefined);
    (readFile as jest.Mock).mockResolvedValue('{"versions":[],"lastUpdated":"2023-01-01","config":{}}');
    (writeFile as jest.Mock).mockResolvedValue(undefined);
    (execAsync as jest.Mock).mockResolvedValue({ stdout: 'abcdef1234567' });

    service = new ContextPersistenceService();
  });

  describe('initialize', () => {
    it('should create local directory and initialize metadata', async () => {
      await service.initialize();

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.context'),
        { recursive: true }
      );
      expect(mockStorage.bucket).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      (mkdir as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));

      await expect(service.initialize())
        .rejects
        .toThrow('Context persistence initialization failed');
    });
  });

  describe('saveContext', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should save context locally and remotely', async () => {
      const result = await service.saveContext(mockContext, mockConfig);

      expect(result).toMatchObject({
        version: expect.stringMatching(/^\d+\.\d+\.\d+-[a-f0-9]{7}-\d+$/),
        timestamp: expect.any(Date),
        config: mockConfig
      });

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.any(String)
      );

      expect(mockFile.save).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          contentType: 'application/json'
        })
      );
    });

    it('should skip remote backup when configured', async () => {
      await service.saveContext(mockContext, { ...mockConfig, remoteBackup: false });

      expect(mockFile.save).not.toHaveBeenCalled();
    });

    it('should handle save errors gracefully', async () => {
      (writeFile as jest.Mock).mockRejectedValueOnce(new Error('Write failed'));

      await expect(service.saveContext(mockContext, mockConfig))
        .rejects
        .toThrow('Context save failed');
    });
  });

  describe('loadContext', () => {
    beforeEach(async () => {
      await service.initialize();
      await service.saveContext(mockContext, mockConfig);
    });

    it('should load context from local storage', async () => {
      const context = await service.loadContext();

      expect(context).toBeDefined();
      expect(readFile).toHaveBeenCalled();
    });

    it('should fall back to remote storage on local failure', async () => {
      (readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'));

      const context = await service.loadContext();

      expect(context).toBeDefined();
      expect(mockFile.download).toHaveBeenCalled();
    });

    it('should handle load errors gracefully', async () => {
      (readFile as jest.Mock).mockRejectedValueOnce(new Error('Read failed'));
      mockFile.download.mockRejectedValueOnce(new Error('Download failed'));

      await expect(service.loadContext())
        .rejects
        .toThrow('Context load failed');
    });
  });

  describe('listVersions', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should list all versions', async () => {
      await service.saveContext(mockContext, mockConfig);
      await service.saveContext(mockContext, mockConfig);

      const versions = await service.listVersions();

      expect(versions).toHaveLength(2);
      expect(versions[0]).toMatchObject({
        version: expect.any(String),
        timestamp: expect.any(Date),
        config: expect.any(Object)
      });
    });
  });

  describe('integration', () => {
    it('should maintain version history correctly', async () => {
      await service.initialize();

      // Save multiple versions
      const version1 = await service.saveContext(mockContext, mockConfig);
      const version2 = await service.saveContext(
        { ...mockContext, timestamp: new Date() },
        mockConfig
      );

      // Load specific version
      const loadedContext = await service.loadContext(version1.version);
      expect(loadedContext.timestamp).toEqual(mockContext.timestamp);

      // Verify version listing
      const versions = await service.listVersions();
      expect(versions).toContainEqual(expect.objectContaining({
        version: version1.version
      }));
      expect(versions).toContainEqual(expect.objectContaining({
        version: version2.version
      }));
    });

    it('should handle concurrent operations', async () => {
      await service.initialize();

      const operations = Array(3).fill(null).map(() => 
        service.saveContext(mockContext, mockConfig)
      );

      const results = await Promise.all(operations);
      expect(results).toHaveLength(3);
      expect(new Set(results.map(r => r.version)).size).toBe(3);
    });
  });
}); 