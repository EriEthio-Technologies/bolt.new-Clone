import { PersistenceMonitor } from '../PersistenceMonitor';
import { Monitoring } from '@google-cloud/monitoring';
import type { PersistenceMetadata } from '~/types/persistence';

jest.mock('@google-cloud/monitoring');

describe('PersistenceMonitor', () => {
  let monitor: PersistenceMonitor;
  let mockMonitoring: jest.Mocked<Monitoring>;

  const mockMetadata: PersistenceMetadata = {
    versions: [
      {
        version: '1.0.0-abc1234-1234567890',
        timestamp: new Date(),
        hash: 'hash1',
        config: {
          remoteBackup: true,
          compressionEnabled: true,
          retentionDays: 30
        }
      },
      {
        version: '1.0.0-def5678-1234567891',
        timestamp: new Date(),
        hash: 'hash2',
        config: {
          remoteBackup: false,
          compressionEnabled: true,
          retentionDays: 30
        }
      }
    ],
    lastUpdated: new Date(),
    config: {
      remoteBackup: true,
      compressionEnabled: true,
      retentionDays: 30
    }
  };

  beforeEach(() => {
    mockMonitoring = {
      projectPath: jest.fn().mockReturnValue('projects/test-project'),
      createTimeSeries: jest.fn().mockResolvedValue(undefined)
    } as any;

    (Monitoring as jest.Mock).mockImplementation(() => mockMonitoring);
    monitor = new PersistenceMonitor();
  });

  describe('trackPersistenceMetrics', () => {
    it('should track all persistence metrics successfully', async () => {
      await monitor.trackPersistenceMetrics(mockMetadata);

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledTimes(1);
      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];

      // Verify versions count metric
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/persistence/versions_count',
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

      // Verify storage size metric
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/persistence/storage_size',
            labels: expect.any(Object)
          }
        })
      );

      // Verify backup success rate metric
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/persistence/backup_success_rate',
            labels: expect.any(Object)
          },
          points: [
            expect.objectContaining({
              value: {
                doubleValue: 0.5
              }
            })
          ]
        })
      );
    });

    it('should handle monitoring errors gracefully', async () => {
      mockMonitoring.createTimeSeries.mockRejectedValueOnce(new Error('API Error'));

      await expect(monitor.trackPersistenceMetrics(mockMetadata))
        .rejects
        .toThrow('Persistence monitoring failed');
    });

    it('should calculate storage size correctly', async () => {
      await monitor.trackPersistenceMetrics(mockMetadata);

      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];
      const storageSizeMetric = call.timeSeries.find((ts: any) => 
        ts.metric.type === 'custom.googleapis.com/persistence/storage_size'
      );

      expect(storageSizeMetric.points[0].value.doubleValue).toBeGreaterThan(0);
    });

    it('should handle empty version list', async () => {
      const emptyMetadata = {
        ...mockMetadata,
        versions: []
      };

      await monitor.trackPersistenceMetrics(emptyMetadata);

      const call = (mockMonitoring.createTimeSeries as jest.Mock).mock.calls[0][0];
      expect(call.timeSeries).toContainEqual(
        expect.objectContaining({
          metric: {
            type: 'custom.googleapis.com/persistence/backup_success_rate',
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

  describe('error handling', () => {
    it('should handle invalid metric values', async () => {
      const invalidMetadata = {
        ...mockMetadata,
        versions: [
          {
            ...mockMetadata.versions[0],
            hash: 'x'.repeat(1000000) // Create large string to test size calculation
          }
        ]
      };

      await monitor.trackPersistenceMetrics(invalidMetadata);
      expect(mockMonitoring.createTimeSeries).toHaveBeenCalled();
    });
  });

  describe('integration', () => {
    it('should batch metrics efficiently', async () => {
      const largeMetadata = {
        ...mockMetadata,
        versions: Array.from({ length: 1000 }, (_, i) => ({
          version: `1.0.0-test${i}`,
          timestamp: new Date(),
          hash: `hash${i}`,
          config: mockMetadata.config
        }))
      };

      const start = Date.now();
      await monitor.trackPersistenceMetrics(largeMetadata);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}); 