import prometheus from 'prom-client';
import { validateEnv } from '~/config/env.server';

const env = validateEnv();

// Initialize the Prometheus registry
const register = new prometheus.Registry();

// Add default metrics (CPU, memory, etc.)
prometheus.collectDefaultMetrics({ register });

// Define performance metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const memoryUsage = new prometheus.Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Process memory usage in bytes',
});

const cpuUsage = new prometheus.Gauge({
  name: 'process_cpu_usage_percent',
  help: 'Process CPU usage percentage',
});

register.registerMetric(httpRequestDuration);
register.registerMetric(memoryUsage);
register.registerMetric(cpuUsage);

// Define custom metrics
const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

const httpResponseTimeSeconds = new prometheus.Histogram({
  name: 'http_response_time_seconds',
  help: 'HTTP response time in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const rateLimitHitsTotal = new prometheus.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['path'],
});

const securityBlocksTotal = new prometheus.Counter({
  name: 'security_blocks_total',
  help: 'Total number of security blocks',
  labelNames: ['type', 'severity'],
});

const authFailuresTotal = new prometheus.Counter({
  name: 'auth_failures_total',
  help: 'Total number of authentication failures',
  labelNames: ['type'],
});

// Register custom metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpResponseTimeSeconds);
register.registerMetric(rateLimitHitsTotal);
register.registerMetric(securityBlocksTotal);
register.registerMetric(authFailuresTotal);

export class MetricsService {
  static async getMetrics(): Promise<string> {
    return register.metrics();
  }

  static recordRequest(method: string, path: string, status: number, duration: number): void {
    httpRequestsTotal.labels(method, path, status.toString()).inc();
    httpResponseTimeSeconds.labels(method, path, status.toString()).observe(duration);
    httpRequestDuration.labels(method, path, status.toString()).observe(duration);
  }

  static updateResourceMetrics(): void {
    const usage = process.memoryUsage();
    memoryUsage.set(usage.heapUsed);
    
    const startUsage = process.cpuUsage();
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage);
      const totalUsage = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
      cpuUsage.set(totalUsage);
    }, 100);
  }

  static recordRateLimit(path: string): void {
    rateLimitHitsTotal.labels(path).inc();
  }

  static recordSecurityBlock(type: string, severity: string): void {
    securityBlocksTotal.labels(type, severity).inc();
  }

  static recordAuthFailure(type: string): void {
    authFailuresTotal.labels(type).inc();
  }
}