import { MonitoringService } from '../../services/monitoring.server';
import { AppError } from '../../utils/errorHandler';
import EventEmitter from 'events';

interface QueuedRequest {
  id: string;
  data: any;
  priority: number;
  timestamp: number;
}

export class RequestQueue {
  private static instance: RequestQueue;
  private readonly monitoring: MonitoringService;
  private queue: QueuedRequest[];
  private readonly eventEmitter: EventEmitter;
  private processing: boolean;
  private readonly maxSize: number;

  private constructor() {
    this.monitoring = MonitoringService.getInstance();
    this.queue = [];
    this.eventEmitter = new EventEmitter();
    this.processing = false;
    this.maxSize = 1000; // Maximum queue size
    this.initialize();
  }

  public static getInstance(): RequestQueue {
    if (!RequestQueue.instance) {
      RequestQueue.instance = new RequestQueue();
    }
    return RequestQueue.instance;
  }

  private initialize(): void {
    // Monitor queue size
    setInterval(() => {
      const size = this.queue.length;
      this.monitoring.emitAlert('queueSize', { size });
      if (size > this.maxSize * 0.8) {
        this.monitoring.emitAlert('queueNearCapacity', { 
          size,
          maxSize: this.maxSize,
          timestamp: new Date().toISOString()
        });
      }
    }, 5000);
  }

  public async enqueue(data: any, priority: number = 1): Promise<string> {
    try {
      if (this.queue.length >= this.maxSize) {
        throw new AppError(503, 'Queue is at capacity');
      }

      const request: QueuedRequest = {
        id: Math.random().toString(36).substring(7),
        data,
        priority,
        timestamp: Date.now()
      };

      this.queue.push(request);
      this.queue.sort((a, b) => b.priority - a.priority);
      
      this.monitoring.emitAlert('requestEnqueued', {
        id: request.id,
        priority,
        queueSize: this.queue.length
      });

      this.eventEmitter.emit('itemAdded');
      return request.id;
    } catch (error) {
      this.handleError('Failed to enqueue request', error);
      throw error;
    }
  }

  public async dequeue(): Promise<QueuedRequest | null> {
    if (this.queue.length === 0) return null;
    const request = this.queue.shift()!;
    
    this.monitoring.emitAlert('requestDequeued', {
      id: request.id,
      queueSize: this.queue.length,
      timeInQueue: Date.now() - request.timestamp
    });

    return request;
  }

  public async startProcessing(handler: (data: any) => Promise<void>): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.processing) {
        const request = await this.dequeue();
        if (!request) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        try {
          await handler(request.data);
        } catch (error) {
          this.monitoring.emitAlert('requestProcessingError', {
            id: request.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } catch (error) {
      this.handleError('Queue processing failed', error);
    }
  }

  public stopProcessing(): void {
    this.processing = false;
  }

  public getSize(): number {
    return this.queue.length;
  }

  public clear(): void {
    const size = this.queue.length;
    this.queue = [];
    this.monitoring.emitAlert('queueCleared', { 
      clearedItems: size,
      timestamp: new Date().toISOString()
    });
  }

  private handleError(message: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.monitoring.emitAlert('queueError', { message, error: errorMessage });
    throw new AppError(500, `${message}: ${errorMessage}`);
  }
}

export default RequestQueue.getInstance();