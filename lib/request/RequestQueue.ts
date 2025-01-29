import { Service } from 'typedi';
import PQueue from 'p-queue';
import { PerformanceMonitoringService } from '~/services/monitoring/PerformanceMonitoringService';

@Service()
export class RequestQueue {
  private readonly queues: Map<string, PQueue> = new Map();
  private readonly defaultOptions = {
    concurrency: 5,
    intervalCap: 100,
    interval: 1000,
    carryoverConcurrencyCount: true
  };

  constructor(private readonly monitoring: PerformanceMonitoringService) {}

  async enqueue<T>(
    queueName: string,
    operation: () => Promise<T>,
    options: Partial<typeof this.defaultOptions> = {}
  ): Promise<T> {
    const queue = this.getQueue(queueName, options);
    const startTime = Date.now();

    try {
      const result = await queue.add(operation);
      
      this.monitoring.trackMetric({
        name: 'request.queue.execution_time',
        value: Date.now() - startTime,
        unit: 'ms',
        tags: { queue: queueName }
      });

      return result;
    } catch (error) {
      this.monitoring.trackMetric({
        name: 'request.queue.errors',
        value: 1,
        unit: 'count',
        tags: { queue: queueName, error: error.message }
      });
      throw error;
    }
  }

  private getQueue(queueName: string, options: Partial<typeof this.defaultOptions>): PQueue {
    if (!this.queues.has(queueName)) {
      const queueOptions = { ...this.defaultOptions, ...options };
      const queue = new PQueue(queueOptions);
      
      // Monitor queue size
      setInterval(() => {
        this.monitoring.trackMetric({
          name: 'request.queue.size',
          value: queue.size,
          unit: 'count',
          tags: { queue: queueName }
        });
      }, 5000);

      this.queues.set(queueName, queue);
    }

    return this.queues.get(queueName)!;
  }
}