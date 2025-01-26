import { Service } from 'typedi';
import { Monitoring } from '@google-cloud/monitoring';
import { validateEnv } from '~/config/env.server';
import type { 
  DependencyAnalysis,
  DependencyMetrics,
  CircularDependency 
} from '~/types/dependencies';

@Service()
export class DependencyMonitor {
  private readonly monitoring: Monitoring;
  private readonly projectPath: string;
  private readonly env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
    this.monitoring = new Monitoring();
    this.projectPath = this.monitoring.projectPath(this.env.GCP_PROJECT_ID);
  }

  async trackDependencyMetrics(analysis: DependencyAnalysis): Promise<void> {
    try {
      await Promise.all([
        this.trackBasicMetrics(analysis.metrics),
        this.trackCircularDependencies(analysis.circularDependencies),
        this.trackClusterMetrics(analysis.clusters),
        this.trackDependencyGraph(analysis.graph)
      ]);
    } catch (error) {
      console.error('Failed to track dependency metrics:', error);
      throw new Error('Dependency monitoring failed');
    }
  }

  private async trackBasicMetrics(metrics: DependencyMetrics): Promise<void> {
    const timeSeriesData = [
      {
        metric: 'custom.googleapis.com/dependencies/total_files',
        value: metrics.totalFiles
      },
      {
        metric: 'custom.googleapis.com/dependencies/total_dependencies',
        value: metrics.totalDependencies
      },
      {
        metric: 'custom.googleapis.com/dependencies/average_dependencies',
        value: metrics.averageDependencies
      },
      {
        metric: 'custom.googleapis.com/dependencies/cohesion',
        value: metrics.dependencyCohesion
      },
      {
        metric: 'custom.googleapis.com/dependencies/stability',
        value: metrics.dependencyStability
      }
    ];

    await this.createTimeSeriesData(timeSeriesData);
  }

  private async trackCircularDependencies(
    circularDeps: CircularDependency[]
  ): Promise<void> {
    const timeSeriesData = [
      {
        metric: 'custom.googleapis.com/dependencies/circular_count',
        value: circularDeps.length
      },
      {
        metric: 'custom.googleapis.com/dependencies/circular_impact',
        value: circularDeps.reduce((sum, dep) => sum + dep.impact, 0)
      }
    ];

    await this.createTimeSeriesData(timeSeriesData);
  }

  private async trackClusterMetrics(
    clusters: Array<{ files: string[]; cohesion: number }>
  ): Promise<void> {
    const timeSeriesData = [
      {
        metric: 'custom.googleapis.com/dependencies/clusters',
        value: clusters.length
      },
      {
        metric: 'custom.googleapis.com/dependencies/cluster_cohesion',
        value: clusters.reduce((sum, c) => sum + c.cohesion, 0) / clusters.length
      }
    ];

    await this.createTimeSeriesData(timeSeriesData);
  }

  private async trackDependencyGraph(
    graph: { nodes: any[]; edges: any[] }
  ): Promise<void> {
    const timeSeriesData = [
      {
        metric: 'custom.googleapis.com/dependencies/graph_density',
        value: this.calculateGraphDensity(graph)
      },
      {
        metric: 'custom.googleapis.com/dependencies/max_depth',
        value: this.calculateMaxDepth(graph)
      }
    ];

    await this.createTimeSeriesData(timeSeriesData);
  }

  private calculateGraphDensity(
    graph: { nodes: any[]; edges: any[] }
  ): number {
    const maxEdges = graph.nodes.length * (graph.nodes.length - 1);
    return maxEdges === 0 ? 0 : graph.edges.length / maxEdges;
  }

  private calculateMaxDepth(
    graph: { nodes: any[]; edges: any[] }
  ): number {
    const adjacencyList = new Map<string, string[]>();
    graph.edges.forEach(edge => {
      if (!adjacencyList.has(edge.source)) {
        adjacencyList.set(edge.source, []);
      }
      adjacencyList.get(edge.source)!.push(edge.target);
    });

    let maxDepth = 0;
    const visited = new Set<string>();

    function dfs(node: string, depth: number): void {
      if (visited.has(node)) return;
      visited.add(node);
      maxDepth = Math.max(maxDepth, depth);

      const neighbors = adjacencyList.get(node) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, depth + 1);
      }
    }

    graph.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id, 0);
      }
    });

    return maxDepth;
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
} 