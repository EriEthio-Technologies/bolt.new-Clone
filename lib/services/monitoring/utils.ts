import type { PerformanceMetric } from '~/lib/types/monitoring';

export function pruneOldMetrics(
  metrics: PerformanceMetric[],
  retentionPeriod: number
): PerformanceMetric[] {
  const cutoff = new Date(Date.now() - retentionPeriod);
  return metrics.filter(m => m.timestamp >= cutoff);
}

export function groupMetricsByName(
  metrics: PerformanceMetric[]
): Record<string, PerformanceMetric[]> {
  return metrics.reduce((acc, metric) => {
    if (!acc[metric.name]) {
      acc[metric.name] = [];
    }
    acc[metric.name].push(metric);
    return acc;
  }, {} as Record<string, PerformanceMetric[]>);
}

export function calculateMetricStats(metrics: PerformanceMetric[]): {
  avg: number;
  min: number;
  max: number;
  p95: number;
  count: number;
} {
  if (!metrics.length) {
    return { avg: 0, min: 0, max: 0, p95: 0, count: 0 };
  }

  const values = metrics.map(m => m.value).sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const p95Index = Math.floor(values.length * 0.95);

  return {
    avg: sum / values.length,
    min: values[0],
    max: values[values.length - 1],
    p95: values[p95Index],
    count: values.length,
  };
}