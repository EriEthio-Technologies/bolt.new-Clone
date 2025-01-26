import { Service } from 'typedi';
import { Monitoring } from '@google-cloud/monitoring';
import { validateEnv } from '~/config/env.server';
import type { PersistenceMetadata } from '~/types/persistence';

@Service()
export class PersistenceMonitor {
  private readonly monitoring: Monitoring;
  private readonly projectPath: string;
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
    this.monitoring = new Monitoring();
    this.projectPath = this.monitoring.projectPath(this.env.GCP_PROJECT_ID);
  }

  async trackPersistenceMetrics(metadata: PersistenceMetadata): Promise<void> {
    try {
      const timeSeriesData = [
        {
          metric: 'custom.googleapis.com/persistence/versions_count',
          value: metadata.versions.length
        },
        {
          metric: 'custom.googleapis.com/persistence/storage_size',
          value: this.calculateStorageSize(metadata)
        },
        {
          metric: 'custom.googleapis.com/persistence/backup_success_rate',
          value: this.calculateBackupSuccessRate(metadata)
        }
      ];

      await this.createTimeSeriesData(timeSeriesData);
    } catch (error) {
      console.error('Failed to track persistence metrics:', error);
      throw new Error('Persistence monitoring failed');
    }
  }

  private calculateStorageSize(metadata: PersistenceMetadata): number {
    return metadata.versions.reduce((total, version) => {
      const content = JSON.stringify(version);
      return total + Buffer.from(content).length;
    }, 0);
  }

  private calculateBackupSuccessRate(metadata: PersistenceMetadata): number {
    const remoteBackups = metadata.versions.filter(v => v.config.remoteBackup);
    return metadata.versions.length > 0 ? 
      remoteBackups.length / metadata.versions.length : 
      1;
  }

  private async createTimeSeriesData(
    metricsData: Array<{ metric: string; value: number }>
  ): Promise<void> {
    try {
      const timeSeries = metricsData.map(({ metric, value }) => ({
        metric: {
          type: metric,
          labels: {
            environment: this.env.NODE_ENV
          }
        },
        resource: {
          type: 'global',
          labels: {
            project_id: this.env.GCP_PROJECT_ID
          }
        },
        points: [{
          interval: {
            endTime: {
              seconds: Math.floor(Date.now() / 1000)
            }
          },
          value: {
            doubleValue: value
          }
        }]
      }));

      await this.monitoring.createTimeSeries({
        name: this.projectPath,
        timeSeries
      });
    } catch (error) {
      console.error('Failed to create time series:', error);
      throw new Error(`Failed to create time series: ${error.message}`);
    }
  }
} 