import { Service } from 'typedi';
import { Monitoring } from '@google-cloud/monitoring';
import { validateEnv } from '~/config/env.server';
import type { APIMetrics } from '~/types/api';

@Service()
export class APIMetricsService {
  private monitoring: Monitoring;
  private projectPath: string;

  constructor() {
    const env = validateEnv();
    this.monitoring = new Monitoring();
    this.projectPath = this.monitoring.projectPath(env.GCP_PROJECT_ID);
  }

  async recordAPICall(metrics: APIMetrics): Promise<void> {
    const timeSeriesData = {
      metric: {
        type: 'custom.googleapis.com/api/request',
        labels: {
          method: metrics.method,
          endpoint: metrics.endpoint,
          status: metrics.status.toString()
        }
      },
      resource: {
        type: 'global',
        labels: {
          project_id: validateEnv().GCP_PROJECT_ID
        }
      },
      points: [
        {
          interval: {
            endTime: {
              seconds: Date.now() / 1000
            }
          },
          value: {
            int64Value: 1
          }
        }
      ]
    };

    await this.monitoring.createTimeSeries({
      name: this.projectPath,
      timeSeries: [timeSeriesData]
    });
  }
} 