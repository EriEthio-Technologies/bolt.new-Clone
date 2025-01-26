import { Service } from 'typedi';
import { Monitoring } from '@google-cloud/monitoring';
import { validateEnv } from '~/config/env.server';
import type { CommonSenseInference, ConceptNode } from '~/types/commonsense';

@Service()
export class CommonSenseMonitor {
  private readonly monitoring: Monitoring;
  private readonly projectPath: string;
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
    this.monitoring = new Monitoring();
    this.projectPath = this.monitoring.projectPath(this.env.GCP_PROJECT_ID);
  }

  async trackInference(inference: CommonSenseInference): Promise<void> {
    try {
      const timeSeriesData = [
        {
          metric: 'custom.googleapis.com/commonsense/inference_confidence',
          value: inference.confidence
        },
        {
          metric: 'custom.googleapis.com/commonsense/reasoning_depth',
          value: inference.metadata.reasoningDepth
        },
        {
          metric: 'custom.googleapis.com/commonsense/processing_time',
          value: inference.metadata.processingTime
        },
        {
          metric: 'custom.googleapis.com/commonsense/supporting_facts_count',
          value: inference.supportingFacts.length
        },
        {
          metric: 'custom.googleapis.com/commonsense/alternatives_count',
          value: inference.alternatives.length
        }
      ];

      await this.createTimeSeriesData(timeSeriesData);
    } catch (error) {
      console.error('Failed to track inference:', error);
      throw new Error('Common sense monitoring failed');
    }
  }

  async trackConceptMetrics(concepts: ConceptNode[]): Promise<void> {
    try {
      const metrics = this.calculateConceptMetrics(concepts);
      const timeSeriesData = Object.entries(metrics).map(([key, value]) => ({
        metric: `custom.googleapis.com/commonsense/concept_${key}`,
        value
      }));

      await this.createTimeSeriesData(timeSeriesData);
    } catch (error) {
      console.error('Failed to track concept metrics:', error);
      throw new Error('Concept metric monitoring failed');
    }
  }

  private calculateConceptMetrics(
    concepts: ConceptNode[]
  ): Record<string, number> {
    const typeCount = concepts.reduce((acc, concept) => {
      acc[concept.type] = (acc[concept.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_count: concepts.length,
      average_confidence: concepts.reduce((sum, c) => sum + c.confidence, 0) / 
        concepts.length,
      entity_count: typeCount['entity'] || 0,
      action_count: typeCount['action'] || 0,
      state_count: typeCount['state'] || 0,
      relation_count: typeCount['relation'] || 0
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