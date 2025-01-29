import { MetricsService } from './MetricsService';

export class ResourceMetricsCollector {
  private static instance: ResourceMetricsCollector;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly updateInterval = 30000; // 30 seconds

  private constructor() {
    // Private constructor to enforce singleton
  }

  static getInstance(): ResourceMetricsCollector {
    if (!ResourceMetricsCollector.instance) {
      ResourceMetricsCollector.instance = new ResourceMetricsCollector();
    }
    return ResourceMetricsCollector.instance;
  }

  start(): void {
    if (this.intervalId) {
      return; // Already running
    }

    // Initial collection
    MetricsService.updateResourceMetrics();

    // Set up periodic collection
    this.intervalId = setInterval(() => {
      MetricsService.updateResourceMetrics();
    }, this.updateInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}