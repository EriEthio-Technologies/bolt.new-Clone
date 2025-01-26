import { Service } from 'typedi';
import { Monitoring } from '@google-cloud/monitoring';
import { validateEnv } from '~/config/env.server';
import type { CausalChain, CausalAnalysis } from '~/types/causal';

@Service()
export class CausalMonitor {
  private readonly monitoring: Monitoring;
  private readonly projectPath: string;
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
    this.monitoring = new Monitoring();
    this.projectPath = this.monitoring.projectPath(this.env.GCP_PROJECT_ID);
  }

  async trackCausalAnalysis(analysis: CausalAnalysis): Promise<void> {
    try {
      const timeSeriesData = [
        {
          metric: 'custom.googleapis.com/causal/chain_size',
          value: analysis.chain.nodes.length
        },
        {
          metric: 'custom.googleapis.com/causal/chain_confidence',
          value: analysis.chain.confidence
        },
        {
          metric: 'custom.googleapis.com/causal/critical_paths',
          value: analysis.insights.criticalPaths.length
        },
        {
          metric: 'custom.googleapis.com/causal/uncertainty_count',
          value: analysis.insights.uncertainties.length
        },
        {
          metric: 'custom.googleapis.com/causal/recommendation_count',
          value: analysis.recommendations.length
        }
      ];

      await this.createTimeSeriesData(timeSeriesData);
    } catch (error) {
      console.error('Failed to track causal analysis:', error);
      throw new Error('Causal monitoring failed');
    }
  }

  async trackChainMetrics(chain: CausalChain): Promise<void> {
    try {
      const metrics = this.calculateChainMetrics(chain);
      const timeSeriesData = Object.entries(metrics).map(([key, value]) => ({
        metric: `custom.googleapis.com/causal/chain_${key}`,
        value
      }));

      await this.createTimeSeriesData(timeSeriesData);
    } catch (error) {
      console.error('Failed to track chain metrics:', error);
      throw new Error('Chain metric monitoring failed');
    }
  }

  private calculateChainMetrics(chain: CausalChain): Record<string, number> {
    const linkTypes = chain.links.reduce((acc, link) => {
      acc[link.type] = (acc[link.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      node_count: chain.nodes.length,
      link_count: chain.links.length,
      average_confidence: chain.nodes.reduce((sum, n) => sum + n.confidence, 0) / chain.nodes.length,
      causes_count: linkTypes['causes'] || 0,
      influences_count: linkTypes['influences'] || 0,
      prevents_count: linkTypes['prevents'] || 0,
      enables_count: linkTypes['enables'] || 0
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