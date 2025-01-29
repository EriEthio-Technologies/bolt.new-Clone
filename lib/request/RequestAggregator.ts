import { Service } from 'typedi';
import LRUCache from 'lru-cache';

interface AggregatedPromise<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

@Service()
export class RequestAggregator {
  private readonly pendingRequests = new LRUCache<string, AggregatedPromise<any>>({
    max: 1000,
    ttl: 1000 * 30 // 30 seconds
  });

  private readonly requestBatches = new Map<string, any[]>();
  private readonly batchTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly MAX_BATCH_SIZE = 50;
  private readonly BATCH_WAIT_TIME = 50; // 50ms

  async aggregate<T>(
    key: string,
    operation: (params: any[]) => Promise<T[]>,
    params: any
  ): Promise<T> {
    const existing = this.pendingRequests.get(key);
    if (existing && Date.now() - existing.timestamp < 100) {
      return existing.promise;
    }

    return new Promise((resolve, reject) => {
      const promise: AggregatedPromise<T> = {
        promise: null!,
        resolve,
        reject,
        timestamp: Date.now()
      };
      promise.promise = new Promise((res, rej) => {
        this.addToBatch(key, params, promise as AggregatedPromise<any>);
      });
      this.pendingRequests.set(key, promise);
    });
  }

  private addToBatch(
    key: string,
    params: any,
    promise: AggregatedPromise<any>
  ): void {
    if (!this.requestBatches.has(key)) {
      this.requestBatches.set(key, []);
    }
    
    const batch = this.requestBatches.get(key)!;
    batch.push({ params, promise });

    if (batch.length >= this.MAX_BATCH_SIZE) {
      // Execute immediately if batch is full
      this.executeBatch(key);
    } else if (!this.batchTimeouts.has(key)) {
      // Set timeout for executing small batches
      const timeout = setTimeout(() => {
        this.executeBatch(key);
      }, this.BATCH_WAIT_TIME);
      this.batchTimeouts.set(key, timeout);
    }
  }

  private async executeBatch(key: string): Promise<void> {
    const batch = this.requestBatches.get(key) || [];
    this.requestBatches.delete(key);
    
    const timeout = this.batchTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.batchTimeouts.delete(key);
    }

    if (batch.length === 0) return;

    try {
      const params = batch.map(item => item.params);
      const results = await this.operation(params);
      
      batch.forEach((item, index) => {
        item.promise.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(item => {
        item.promise.reject(error);
      });
    }
  }
}