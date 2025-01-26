import { ProjectSettingsService } from '../ProjectSettingsService';
import { DatabaseService } from '../../database/DatabaseService';
import { CacheService } from '../../cache/CacheService';
import { ProcessingError } from '~/errors/ProcessingError';
import type { ProjectSettings, SettingsUpdate } from '~/types/settings';

describe('ProjectSettingsService', () => {
  let settingsService: ProjectSettingsService;
  let mockDbService: jest.Mocked<DatabaseService>;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockDbService = {
      getPostgresConnection: jest.fn().mockResolvedValue(mockClient),
    } as any;

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
    } as any;

    settingsService = new ProjectSettingsService(
      mockDbService,
      mockCacheService
    );
  });

  describe('getProjectSettings', () => {
    const mockProjectId = 'test-project';
    const mockSettings: ProjectSettings = {
      projectId: mockProjectId,
      general: {
        name: 'Test Project',
        description: 'Test Description',
        version: '1.0.0'
      },
      development: {
        framework: 'react',
        language: 'typescript',
        nodeVersion: '18.x'
      },
      deployment: {
        platform: 'gcp',
        region: 'us-central1',
        environment: 'development'
      },
      security: {
        authEnabled: true,
        apiKeyRequired: true
      },
      features: {
        analytics: true,
        monitoring: true,
        logging: true
      }
    };

    it('should return cached settings if available', async () => {
      mockCacheService.get.mockResolvedValueOnce(mockSettings);

      const result = await settingsService.getProjectSettings(mockProjectId);

      expect(result).toEqual(mockSettings);
      expect(mockDbService.getPostgresConnection).not.toHaveBeenCalled();
    });

    it('should fetch from database if cache miss', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockClient.query.mockResolvedValueOnce({
        rows: [{ settings: mockSettings, version: 1 }]
      });

      const result = await settingsService.getProjectSettings(mockProjectId);

      expect(result).toEqual(mockSettings);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return default settings for new project', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await settingsService.getProjectSettings(mockProjectId);

      expect(result.projectId).toBe(mockProjectId);
      expect(result.general.version).toBe('1.0.0');
    });

    it('should handle database errors', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockClient.query.mockRejectedValueOnce(new Error('DB Error'));

      await expect(settingsService.getProjectSettings(mockProjectId))
        .rejects
        .toThrow(ProcessingError);
    });
  });

  describe('updateSettings', () => {
    const mockProjectId = 'test-project';
    const mockUpdate: SettingsUpdate = {
      general: {
        name: 'Updated Project',
        description: 'Updated Description',
        version: '1.1.0'
      }
    };

    it('should successfully update settings', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ settings: {}, version: 1 }] }) // Get current
        .mockResolvedValueOnce({ rows: [{ version: 2 }] }) // Insert
        .mockResolvedValueOnce({ rows: [] }); // History

      const result = await settingsService.updateSettings(
        mockProjectId,
        mockUpdate
      );

      expect(result.general.name).toBe('Updated Project');
      expect(mockCacheService.invalidate).toHaveBeenCalled();
    });

    it('should validate settings before update', async () => {
      const invalidUpdate: SettingsUpdate = {
        development: {
          framework: 'invalid-framework',
          language: 'typescript',
          nodeVersion: '18.x'
        }
      };

      await expect(settingsService.updateSettings(mockProjectId, invalidUpdate))
        .rejects
        .toThrow('Invalid framework');
    });

    it('should handle transaction failures', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Transaction failed'));

      await expect(settingsService.updateSettings(mockProjectId, mockUpdate))
        .rejects
        .toThrow(ProcessingError);
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getSettingsHistory', () => {
    const mockProjectId = 'test-project';

    it('should retrieve settings history', async () => {
      const mockHistory = [
        { settings: {}, version: 2, created_at: new Date() },
        { settings: {}, version: 1, created_at: new Date() }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockHistory });

      const result = await settingsService.getSettingsHistory(mockProjectId);

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2);
    });

    it('should limit history results', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await settingsService.getSettingsHistory(mockProjectId, 5);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        [mockProjectId, 5]
      );
    });
  });

  describe('revertToVersion', () => {
    const mockProjectId = 'test-project';
    const mockVersion = 1;

    it('should revert to previous version', async () => {
      const mockSettings = { version: 1, settings: {} };
      mockClient.query
        .mockResolvedValueOnce({ rows: [mockSettings] })
        .mockResolvedValueOnce({ rows: [] });

      await settingsService.revertToVersion(mockProjectId, mockVersion);

      expect(mockCacheService.invalidate).toHaveBeenCalled();
    });

    it('should handle non-existent versions', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        settingsService.revertToVersion(mockProjectId, mockVersion)
      ).rejects.toThrow('Version 1 not found');
    });

    it('should handle revert failures', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Revert failed'));

      await expect(
        settingsService.revertToVersion(mockProjectId, mockVersion)
      ).rejects.toThrow(ProcessingError);
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
}); 