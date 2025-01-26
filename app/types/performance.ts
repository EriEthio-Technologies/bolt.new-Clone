export interface PerformanceAnalysisResult {
  resourceMetrics: ResourceMetrics;
  loadTestResults: LoadTestResult;
  runtimeMetrics: RuntimeMetrics;
  memoryProfile: MemoryProfile | null;
  timestamp: Date;
}

export interface ResourceMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
    utilization: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  eventLoop: {
    latency: number;
    utilization: number;
  };
  gc: {
    totalCollections: number;
    totalPause: number;
    averagePause: number;
  };
}

export interface LoadTestResult {
  requests: {
    total: number;
    average: number;
    p95: number;
    p99: number;
  };
  throughput: {
    average: number;
    peak: number;
    total: number;
  };
  errors: number;
  timeouts: number;
  duration: number;
}

export interface RuntimeMetrics {
  timing: {
    startup: number;
    firstByte: number;
    fullyLoaded: number;
  };
  marks: Array<{
    name: string;
    timestamp: number;
  }>;
  measures: Array<{
    name: string;
    duration: number;
    startTime: number;
  }>;
}

export interface MemoryProfile {
  snapshot: string;
  summary: {
    totalSize: number;
    totalObjects: number;
    gcRoots: number;
  };
  leaks: Array<{
    type: string;
    size: number;
    retainedSize: number;
    path: string;
  }>;
  distribution: Array<{
    type: string;
    count: number;
    size: number;
  }>;
} 