import { Service } from 'typedi';
import { Monitoring } from '@google-cloud/monitoring';
import { validateEnv } from '~/config/env.server';
import type { EmotionalAnalysis, EmotionalState } from '~/types/emotional';

@Service()
export class EmotionalMonitor {
  private readonly monitoring: Monitoring;
  private readonly projectPath: string;
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
    this.monitoring = new Monitoring();
    this.projectPath = this.monitoring.projectPath(this.env.GCP_PROJECT_ID);
  }

  async trackEmotionalAnalysis(analysis: EmotionalAnalysis): Promise<void> {
    try {
      const timeSeriesData = [
        {
          metric: 'custom.googleapis.com/emotional/valence',
          value: analysis.state.dimensions.valence
        },
        {
          metric: 'custom.googleapis.com/emotional/arousal',
          value: analysis.state.dimensions.arousal
        },
        {
          metric: 'custom.googleapis.com/emotional/dominance',
          value: analysis.state.dimensions.dominance
        },
        {
          metric: 'custom.googleapis.com/emotional/confidence',
          value: analysis.state.confidence
        },
        {
          metric: 'custom.googleapis.com/emotional/processing_time',
          value: analysis.metadata.processingTime
        }
      ];

      await this.createTimeSeriesData(timeSeriesData);
    } catch (error) {
      console.error('Failed to track emotional analysis:', error);
      throw new Error('Emotional monitoring failed');
    }
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