export class ProcessingError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ProcessingError';
  }
} 