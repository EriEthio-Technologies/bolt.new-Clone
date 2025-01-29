import { MonitoringService } from '../../services/monitoring.server';
import { AppError } from '../../utils/errorHandler';
import { CacheManager } from '../cache/CacheManager';
import RequestQueue from './RequestQueue';

interface AggregatedRequest {
  id: string;
  type: string;
  data: any[];
  count: number;
  firstTimestamp: number;
  lastTimestamp: number;
}

export class RequestAggregator {
  private static instance: RequestAggregator;
  private readonly monitoring: MonitoringService;
  private readonly cache: CacheManager;
  private readonly queue: RequestQueue;
  private aggregationWindow: number;
  private batchSize: number;
  private aggregatedRequests: Map<string, AggregatedRequest>;

  private constructor() {
    this.monitoring = MonitoringService.getInstance();
    this.cache = CacheManager.getInstance();
    this.queue = RequestQueue.getInstance();
    this.aggregationWindow = 5000; // 5 seconds
    this.batchSize = 100;
    this.aggregatedRequests = new Map();
    this.initialize();
  }

  public static getInstance(): RequestAggregator {
    if (!RequestAggregator.instance) {
      RequestAggregator.instance = new RequestAggregator();
    }
    return RequestAggregator.instance;
  }

  private initialize(): void {
    // Process aggregated requests periodically
    setInterval(() => this.processAggregatedRequests(), this.aggregationWindow);

    // Monitor aggregation metrics
    setInterval(() => {
      this.monitoring.emitAlert('aggregationStats', {
        activeAggregations: this.aggregatedRequests.size,
        timestamp: new Date().toISOString()
      });
    }, 10000);
  }

  public async addRequest(type: string, data: any): Promise<string> {
    try {
      const now = Date.now();
      const key = this.getAggregationKey(type);
      
      let aggregated = this.aggregatedRequests.get(key);
      
      if (!aggregated) {
        aggregated = {
          id: Math.random().toString(36).substring(7),
          type,
          data: [],
          count: 0,
          firstTimestamp: now,
          lastTimestamp: now
        };
        this.aggregatedRequests.set(key, aggregated);
      }

      aggregated.data.push(data);
      aggregated.count++;
      aggregated.lastTimestamp = now;

      this.monitoring.emitAlert('requestAggregated', {
        type,
        aggregationId: aggregated.id,
        count: aggregated.count
      });

      // Process immediately if batch size reached
      if (aggregated.count >= this.batchSize) {
        await this.processAggregation(key, aggregated);
      }

      return aggregated.id;
    } catch (error) {
      this.handleError('Failed to aggregate request', error);
      throw error;
    }
  }

  private async processAggregatedRequests(): Promise<void> {
    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, aggregated] of this.aggregatedRequests.entries()) {
        if (now - aggregated.lastTimestamp >= this.aggregationWindow) {
          await this.processAggregation(key, aggregated);
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach(key => this.aggregatedRequests.delete(key));
    } catch (error) {
      this.handleError('Failed to process aggregated requests', error);
    }
  }

  private async processAggregation(key: string, aggregated: AggregatedRequest): Promise<void> {
    try {
      await this.queue.enqueue({
        id: aggregated.id,
        type: aggregated.type,
        data: aggregated.data,
        metadata: {
          count: aggregated.count,
          timespan: aggregated.lastTimestamp - aggregated.firstTimestamp
        }
      });

      this.monitoring.emitAlert('aggregationProcessed', {
        id: aggregated.id,
        type: aggregated.type,
        count: aggregated.count,
        timespan: aggregated.lastTimestamp - aggregated.firstTimestamp
      });
    } catch (error) {
      this.handleError('Failed to process aggregation', error);
    }
  }

  private getAggregationKey(type: string): string {
    return `aggregation:${type}:${Math.floor(Date.now() / this.aggregationWindow)}`;
  }

  public setAggregationWindow(ms: number): void {
    this.aggregationWindow = ms;
  }

  public setBatchSize(size: number): void {
    this.batchSize = size;
  }

  private handleError(message: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.monitoring.emitAlert('aggregationError', { message, error: errorMessage });
    throw new AppError(500, `${message}: ${errorMessage}`);
  }
}

export default RequestAggregator.getInstance();