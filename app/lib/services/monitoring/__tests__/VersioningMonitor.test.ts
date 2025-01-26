import { VersioningMonitor } from '../VersioningMonitor';
import { Monitoring } from '@google-cloud/monitoring';
import { readFile } from 'fs/promises';
import type { 
  ContextVersion,
  VersionMetadata,
  VersionMergeResult 
} from '~/types/versioning';

jest.mock('@google-cloud/monitoring');
jest.mock('fs/promises');

describe('VersioningMonitor', () => {
  let monitor: VersioningMonitor;
  let mockMonitoring: jest.Mocked<Monitoring>;

  const mockVersion: ContextVersion = {
    version: 'main-abc1234-1234567890',
    branch: 'main',
    timestamp: new Date(),
    context: {
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
    },
    diff: {
      entities: {
        added: [{ name: 'NewEntity' }],
        modified: [],
        removed: []
      },
      services: {
        added: [],
        modified: [{ name: 'ModifiedService' }],
        removed: []
      },
      dependencies: {
        added: [{ from: 'A', to: 'B' }],
        removed: []
      }
    },
    metadata: {
      author: 'Test User',
      message: 'Test commit',
      tags: [],
      parent: null
    }
  };

  beforeEach(() => {
    mockMonitoring = {
      projectPath: jest.fn().mockReturnValue('projects/test-project'),
      createTimeSeries: jest.fn().mockResolvedValue(undefined)
    } as any;

    (Monitoring as jest.Mock).mockImplementation(() => mockMonitoring);
    (readFile as jest.Mock).mockResolvedValue('{}');

    monitor = new VersioningMonitor();
  });

  describe('trackVersionCreation', () => {
    it('should track version creation metrics successfully', async () => {
      await monitor.trackVersionCreation(mockVersion);

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledTimes(1);
      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];

      // Verify versions count metric
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/versioning/versions_count',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 1
              }
            })
          ]
        })
      );

      // Verify changes count metric
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/versioning/changes_count',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 3 // 1 added entity + 1 modified service + 1 added dependency
              }
            })
          ]
        })
      );
    });

    it('should handle monitoring errors gracefully', async () => {
      mockMonitoring.createTimeSeries.mockRejectedValueOnce(new Error('API Error'));

      await expect(monitor.trackVersionCreation(mockVersion))
        .rejects
        .toThrow('Version monitoring failed');
    });
  });

  describe('trackMergeOperation', () => {
    const mockMergeResult: VersionMergeResult = {
      success: true,
      version: 'main-def456-1234567891',
      conflicts: ['Entity conflict: User']
    };

    it('should track merge metrics successfully', async () => {
      await monitor.trackMergeOperation(mockMergeResult);

      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/versioning/merge_conflicts',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 1
              }
            })
          ]
        })
      );
    });
  });

  describe('trackBranchMetrics', () => {
    const mockMetadata: VersionMetadata = {
      branches: {
        main: 'main-abc123',
        feature: 'feature-def456'
      },
      tags: {
        'v1.0.0': 'main-abc123'
      },
      lastUpdated: new Date()
    };

    it('should track branch metrics successfully', async () => {
      await monitor.trackBranchMetrics(mockMetadata);

      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/versioning/branch_count',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 2
              }
            })
          ]
        })
      );
    });
  });

  describe('integration', () => {
    it('should handle concurrent monitoring operations', async () => {
      const operations = [
        monitor.trackVersionCreation(mockVersion),
        monitor.trackMergeOperation({ success: true, version: 'test', conflicts: [] }),
        monitor.trackBranchMetrics({ branches: {}, tags: {}, lastUpdated: new Date() })
      ];

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });

    it('should maintain metric consistency', async () => {
      const version = { ...mockVersion, diff: null };
      await monitor.trackVersionCreation(version);

      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];
      expect(call.timeSeries.find((ts: any) => 
        ts.metric.type === 'custom.googleapis.com/versioning/changes_count'
      ).points[0].value.doubleValue).toBe(0);
    });
  });
}); 