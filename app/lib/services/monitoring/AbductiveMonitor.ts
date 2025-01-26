import { Service } from 'typedi';
import { Monitoring } from '@google-cloud/monitoring';
import { validateEnv } from '~/config/env.server';
import type { AbductiveAnalysis, Hypothesis } from '~/types/abductive';

@Service()
export class AbductiveMonitor {
  private readonly monitoring: Monitoring;
  private readonly projectPath: string;
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
    this.monitoring = new Monitoring();
    this.projectPath = this.monitoring.projectPath(this.env.GCP_PROJECT_ID);
  }

  async trackAbductiveAnalysis(analysis: AbductiveAnalysis): Promise<void> {
    try {
      const timeSeriesData = [
        {
          metric: 'custom.googleapis.com/abductive/observation_count',
          value: analysis.observations.length
        },
        {
          metric: 'custom.googleapis.com/abductive/hypothesis_count',
          value: analysis.hypotheses.length
        },
        {
          metric: 'custom.googleapis.com/abductive/confidence',
          value: analysis.metadata.confidence
        },
        {
          metric: 'custom.googleapis.com/abductive/processing_time',
          value: analysis.metadata.processingTime
        },
        {
          metric: 'custom.googleapis.com/abductive/uncertainty_count',
          value: analysis.insights.uncertainties.length
        }
      ];

      await this.createTimeSeriesData(timeSeriesData);
    } catch (error) {
      console.error('Failed to track abductive analysis:', error);
      throw new Error('Abductive monitoring failed');
    }
  }

  async trackHypothesisMetrics(hypotheses: Hypothesis[]): Promise<void> {
    try {
      const metrics = this.calculateHypothesisMetrics(hypotheses);
      const timeSeriesData = Object.entries(metrics).map(([key, value]) => ({
        metric: `custom.googleapis.com/abductive/hypothesis_${key}`,
        value
      }));

      await this.createTimeSeriesData(timeSeriesData);
    } catch (error) {
      console.error('Failed to track hypothesis metrics:', error);
      throw new Error('Hypothesis metric monitoring failed');
    }
  }

  private calculateHypothesisMetrics(
    hypotheses: Hypothesis[]
  ): Record<string, number> {
    return {
      average_confidence: hypotheses.reduce((sum, h) => sum + h.confidence, 0) / 
        hypotheses.length,
      evidence_ratio: hypotheses.reduce(
        (sum, h) => 
          sum + (h.supportingEvidence.length / 
            (h.contradictingEvidence.length || 1)),
        0
      ) / hypotheses.length,
      assumption_count: hypotheses.reduce(
        (sum, h) => sum + h.assumptions.length,
        0
      ),
      implication_count: hypotheses.reduce(
        (sum, h) => sum + h.implications.length,
        0
      )
    };
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