export class MonitoringError extends Error {
  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message);
    this.name = 'MonitoringError';
  }
}

export class MetricValidationError extends MonitoringError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, details);
    this.name = 'MetricValidationError';
  }
}

export class BatchProcessingError extends MonitoringError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, details);
    this.name = 'BatchProcessingError';
  }
}

export class ResourceCollectionError extends MonitoringError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, details);
    this.name = 'ResourceCollectionError';
  }
}