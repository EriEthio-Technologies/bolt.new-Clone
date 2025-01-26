import { Service } from 'typedi';
import { Monitoring } from '@google-cloud/monitoring';
import { validateEnv } from '~/config/env.server';
import type { ExecutionPlan, PlanningStep } from '~/types/planning';

@Service()
export class PlanningMonitor {
  private readonly monitoring: Monitoring;
  private readonly projectPath: string;
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
    this.monitoring = new Monitoring();
    this.projectPath = this.monitoring.projectPath(this.env.GCP_PROJECT_ID);
  }

  async trackPlanGeneration(plan: ExecutionPlan): Promise<void> {
    try {
      const timeSeriesData = [
        {
          metric: 'custom.googleapis.com/planning/steps_count',
          value: plan.steps.length
        },
        {
          metric: 'custom.googleapis.com/planning/completion_time',
          value: plan.estimatedCompletion
        },
        {
          metric: 'custom.googleapis.com/planning/confidence',
          value: plan.confidence
        },
        {
          metric: 'custom.googleapis.com/planning/risks_count',
          value: plan.risks.length
        },
        {
          metric: 'custom.googleapis.com/planning/alternatives_count',
          value: plan.alternatives.length
        },
        {
          metric: 'custom.googleapis.com/planning/processing_time',
          value: plan.metadata.generationParams.processingTime
        }
      ];

      await this.createTimeSeriesData(timeSeriesData);
    } catch (error) {
      console.error('Failed to track plan generation:', error);
      throw new Error('Planning monitoring failed');
    }
  }

  async trackStepMetrics(steps: PlanningStep[]): Promise<void> {
    try {
      const metrics = this.calculateStepMetrics(steps);
      const timeSeriesData = Object.entries(metrics).map(([key, value]) => ({
        metric: `custom.googleapis.com/planning/step_${key}`,
        value
      }));

      await this.createTimeSeriesData(timeSeriesData);
    } catch (error) {
      console.error('Failed to track step metrics:', error);
      throw new Error('Step metric monitoring failed');
    }
  }

  private calculateStepMetrics(
    steps: PlanningStep[]
  ): Record<string, number> {
    return {
      average_duration: steps.reduce((sum, s) => sum + s.estimatedDuration, 0) / 
        steps.length,
      average_confidence: steps.reduce((sum, s) => sum + s.confidence, 0) / 
        steps.length,
      prerequisites_count: steps.reduce((sum, s) => sum + s.prerequisites.length, 0),
      outcomes_count: steps.reduce((sum, s) => sum + s.outcomes.length, 0),
      alternatives_count: steps.reduce(
        (sum, s) => sum + (s.alternatives?.length || 0),
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