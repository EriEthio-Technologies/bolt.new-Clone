export class MetricsCollector {
  private metrics: Map<string, Metric>;

  constructor(private readonly monitoring: Monitoring) {
    this.initializeMetrics();
  }

  trackCodeGeneration(data: CodeGenerationMetrics) {
    this.metrics.get('code_generation_latency').record(data.latency);
    this.metrics.get('code_generation_success').increment();
  }
} 