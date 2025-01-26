import { Service } from 'typedi';
import { Monitoring } from '@google-cloud/monitoring';
import { validateEnv } from '~/config/env.server';
import type { 
  ContextVersion,
  VersionMetadata,
  VersionMergeResult 
} from '~/types/versioning';

@Service()
export class VersioningMonitor {
  private readonly monitoring: Monitoring;
  private readonly projectPath: string;
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
    this.monitoring = new Monitoring();
    this.projectPath = this.monitoring.projectPath(this.env.GCP_PROJECT_ID);
  }

  async trackVersionCreation(version: ContextVersion): Promise<void> {
    try {
      const timeSeriesData = [
        {
          metric: 'custom.googleapis.com/versioning/versions_count',
          value: 1
        },
        {
          metric: 'custom.googleapis.com/versioning/changes_count',
          value: this.countChanges(version)
        },
        {
          metric: 'custom.googleapis.com/versioning/branch_depth',
          value: await this.calculateBranchDepth(version)
        }
      ];

      await this.createTimeSeriesData(timeSeriesData);
    } catch (error) {
      console.error('Failed to track version creation:', error);
      throw new Error('Version monitoring failed');
    }
  }

  async trackMergeOperation(result: VersionMergeResult): Promise<void> {
    try {
      const timeSeriesData = [
        {
          metric: 'custom.googleapis.com/versioning/merge_success',
          value: result.success ? 1 : 0
        },
        {
          metric: 'custom.googleapis.com/versioning/merge_conflicts',
          value: result.conflicts.length
        }
      ];

      await this.createTimeSeriesData(timeSeriesData);
    } catch (error) {
      console.error('Failed to track merge operation:', error);
      throw new Error('Merge monitoring failed');
    }
  }

  async trackBranchMetrics(metadata: VersionMetadata): Promise<void> {
    try {
      const timeSeriesData = [
        {
          metric: 'custom.googleapis.com/versioning/branch_count',
          value: Object.keys(metadata.branches).length
        },
        {
          metric: 'custom.googleapis.com/versioning/tag_count',
          value: Object.keys(metadata.tags).length
        }
      ];

      await this.createTimeSeriesData(timeSeriesData);
    } catch (error) {
      console.error('Failed to track branch metrics:', error);
      throw new Error('Branch monitoring failed');
    }
  }

  private countChanges(version: ContextVersion): number {
    if (!version.diff) return 0;

    return (
      version.diff.entities.added.length +
      version.diff.entities.modified.length +
      version.diff.entities.removed.length +
      version.diff.services.added.length +
      version.diff.services.modified.length +
      version.diff.services.removed.length +
      version.diff.dependencies.added.length +
      version.diff.dependencies.removed.length
    );
  }

  private async calculateBranchDepth(version: ContextVersion): Promise<number> {
    let depth = 0;
    let current = version;

    while (current.metadata.parent) {
      depth++;
      try {
        const content = await readFile(
          join(process.cwd(), '.context/versions', `${current.metadata.parent}.json`),
          'utf-8'
        );
        current = JSON.parse(content);
      } catch {
        break;
      }
    }

    return depth;
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