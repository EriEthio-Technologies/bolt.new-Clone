import { RequestHandler } from 'express';
import { metricsMiddleware } from './middleware/metrics.server';
import { loggingMiddleware } from './middleware/logging.server';
import { ResourceMetricsCollector } from './services/ResourceMetricsCollector';

export function setupMonitoring(): RequestHandler[] {
  // Start collecting resource metrics
  ResourceMetricsCollector.getInstance().start();

  // Return middleware array
  return [
    loggingMiddleware(),
    metricsMiddleware()
  ];
}