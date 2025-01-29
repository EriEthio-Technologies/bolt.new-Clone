export class CacheError extends Error {
  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message);
    this.name = 'CacheError';
  }
}

export class CacheSerializationError extends CacheError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, details);
    this.name = 'CacheSerializationError';
  }
}

export class CacheConnectionError extends CacheError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, details);
    this.name = 'CacheConnectionError';
  }
}

export class CacheOperationError extends CacheError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, details);
    this.name = 'CacheOperationError';
  }
}