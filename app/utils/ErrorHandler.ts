import { ProcessingError } from '~/errors/ProcessingError';
import type { ErrorContext, ErrorMetrics } from '~/types/error';
import { ErrorMonitoringService } from '~/lib/services/monitoring/ErrorMonitoringService';

export class ErrorHandler {
  private metrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByType: new Map(),
    errorsByOperation: new Map()
  };

  constructor(private readonly monitoringService: ErrorMonitoringService) {
    this.metrics = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsByOperation: new Map()
    };
  }

  async handle(error: Error, context?: ErrorContext): Promise<void> {
    this.updateMetrics(error, context);
    this.logError(error, context);

    // Report to monitoring service
    await this.monitoringService.reportError(error, context);
    await this.monitoringService.updateErrorMetrics(this.metrics);

    if (this.isRecoverable(error)) {
      this.handleRecoverableError(error, context);
    } else {
      this.handleCriticalError(error, context);
    }
  }

  private updateMetrics(error: Error, context?: ErrorContext): void {
    this.metrics.totalErrors++;
    
    // Update error type count
    const errorType = error.constructor.name;
    this.metrics.errorsByType.set(
      errorType,
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );

    // Update operation count
    if (context?.operation) {
      this.metrics.errorsByOperation.set(
        context.operation,
        (this.metrics.errorsByOperation.get(context.operation) || 0) + 1
      );
    }
  }

  private logError(error: Error, context?: ErrorContext): void {
    const timestamp = new Date().toISOString();
    const errorType = error.constructor.name;
    
    console.error({
      timestamp,
      type: errorType,
      message: error.message,
      stack: error.stack,
      context,
      metadata: error instanceof ProcessingError ? {
        code: error.code,
        originalError: error.originalError
      } : undefined
    });
  }

  private isRecoverable(error: Error): boolean {
    if (error instanceof ProcessingError) {
      // Define recoverable error codes
      const recoverableCodes = [
        'CACHE_MISS',
        'RETRY_NEEDED',
        'VALIDATION_ERROR'
      ];
      return recoverableCodes.includes(error.code || '');
    }
    return false;
  }

  private handleRecoverableError(error: Error, context?: ErrorContext): void {
    // Implement recovery strategies
    if (error instanceof ProcessingError) {
      switch (error.code) {
        case 'CACHE_MISS':
          // Handle cache misses
          break;
        case 'RETRY_NEEDED':
          // Implement retry logic
          break;
        case 'VALIDATION_ERROR':
          // Handle validation errors
          break;
      }
    }
  }

  private handleCriticalError(error: Error, context?: ErrorContext): void {
    // Handle critical errors
    // Could include:
    // - Alerting
    // - Emergency logging
    // - System shutdown if necessary
    if (context?.critical) {
      // Implement critical error handling
    }
  }

  getMetrics(): ErrorMetrics {
    return {
      totalErrors: this.metrics.totalErrors,
      errorsByType: new Map(this.metrics.errorsByType),
      errorsByOperation: new Map(this.metrics.errorsByOperation)
    };
  }

  resetMetrics(): void {
    this.metrics = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsByOperation: new Map()
    };
  }
} 