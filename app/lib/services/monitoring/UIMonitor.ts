import { Service } from 'typedi';
import { Monitoring } from '@google-cloud/monitoring';
import { validateEnv } from '~/config/env.server';

@Service()
export class UIMonitor {
  private readonly monitoring: Monitoring;
  private readonly projectPath: string;
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
    this.monitoring = new Monitoring();
    this.projectPath = this.monitoring.projectPath(this.env.GCP_PROJECT_ID);
  }

  async trackLoadingState(data: {
    component: string;
    duration: number;
    variant: string;
    hasOverlay: boolean;
  }): Promise<void> {
    try {
      const timeSeriesData = [
        {
          metric: 'custom.googleapis.com/ui/loading_duration',
          value: data.duration
        },
        {
          metric: 'custom.googleapis.com/ui/loading_count',
          value: 1
        }
      ];

      await this.createTimeSeriesData(timeSeriesData, {
        component: data.component,
        variant: data.variant,
        hasOverlay: data.hasOverlay.toString()
      });
    } catch (error) {
      console.error('Failed to track loading state:', error);
      throw new Error('UI monitoring failed');
    }
  }

  private async createTimeSeriesData(
    metricsData: Array<{ metric: string; value: number }>,
    labels: Record<string, string>
  ): Promise<void> {
    try {
      const timeSeries = metricsData.map(({ metric, value }) => ({
        metric: {
          type: metric,
          labels: {
            environment: this.env.NODE_ENV,
            ...labels
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