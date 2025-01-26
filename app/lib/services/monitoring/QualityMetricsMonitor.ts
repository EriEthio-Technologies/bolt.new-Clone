import { Service } from 'typedi';
import { Monitoring } from '@google-cloud/monitoring';
import { validateEnv } from '~/config/env.server';
import type { CodeQualityResult } from '~/types/quality';

@Service()
export class QualityMetricsMonitor {
  private readonly monitoring: Monitoring;
  private readonly projectPath: string;
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
    this.monitoring = new Monitoring();
    this.projectPath = this.monitoring.projectPath(this.env.GCP_PROJECT_ID);
  }

  async trackQualityMetrics(result: CodeQualityResult): Promise<void> {
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid quality metrics result');
    }

    try {
      await Promise.all([
        this.trackComplexityMetrics(result),
        this.trackCoverageMetrics(result),
        this.trackDuplicationMetrics(result),
        this.trackTechnicalDebtMetrics(result)
      ]);
    } catch (error) {
      console.error('Failed to track quality metrics:', error);
      throw new Error('Quality metrics monitoring failed');
    }
  }

  private async trackComplexityMetrics(result: CodeQualityResult): Promise<void> {
    const timeSeriesData = [
      {
        metric: 'custom.googleapis.com/code_quality/complexity/cyclomatic',
        value: result.metrics.complexity.cyclomatic
      },
      {
        metric: 'custom.googleapis.com/code_quality/complexity/cognitive',
        value: result.metrics.complexity.cognitive
      },
      {
        metric: 'custom.googleapis.com/code_quality/complexity/halstead_bugs',
        value: result.metrics.complexity.halstead.bugs
      }
    ];

    await this.createTimeSeriesData(timeSeriesData);
  }

  private async trackCoverageMetrics(result: CodeQualityResult): Promise<void> {
    const timeSeriesData = [
      {
        metric: 'custom.googleapis.com/code_quality/coverage/lines',
        value: result.coverage.lines.percentage
      },
      {
        metric: 'custom.googleapis.com/code_quality/coverage/functions',
        value: result.coverage.functions.percentage
      },
      {
        metric: 'custom.googleapis.com/code_quality/coverage/branches',
        value: result.coverage.branches.percentage
      }
    ];

    await this.createTimeSeriesData(timeSeriesData);
  }

  private async trackDuplicationMetrics(result: CodeQualityResult): Promise<void> {
    await this.createTimeSeriesData([
      {
        metric: 'custom.googleapis.com/code_quality/duplication/percentage',
        value: result.duplication.percentage
      }
    ]);
  }

  private async trackTechnicalDebtMetrics(result: CodeQualityResult): Promise<void> {
    const debtRatingValue = this.convertRatingToNumber(result.technicalDebt.rating);
    
    const timeSeriesData = [
      {
        metric: 'custom.googleapis.com/code_quality/technical_debt/rating',
        value: debtRatingValue
      },
      {
        metric: 'custom.googleapis.com/code_quality/technical_debt/ratio',
        value: result.technicalDebt.ratio
      },
      {
        metric: 'custom.googleapis.com/code_quality/technical_debt/effort',
        value: result.technicalDebt.effort
      }
    ];

    await this.createTimeSeriesData(timeSeriesData);
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
            doubleValue: Number.isFinite(value) ? value : 0
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

  private convertRatingToNumber(rating: 'A' | 'B' | 'C' | 'D' | 'E'): number {
    const ratingMap: Record<string, number> = {
      'A': 1,
      'B': 2,
      'C': 3,
      'D': 4,
      'E': 5
    };
    return ratingMap[rating];
  }
} 