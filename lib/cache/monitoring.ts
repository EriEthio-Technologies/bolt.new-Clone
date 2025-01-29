import { MetricsService } from '~/services/MetricsService';

export function trackCacheOperation(operation: string, success: boolean, duration: number): void {
  MetricsService.recordRequest(
    'CACHE',
    operation,
    success ? 200 : 500,
    duration
  );
}

export function trackCacheSize(memorySize: number, redisSize: number): void {
  MetricsService.recordGauge('cache.memory.size', memorySize);
  MetricsService.recordGauge('cache.redis.size', redisSize);
}