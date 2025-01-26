import { ErrorHandler } from '../ErrorHandler';
import { ProcessingError } from '~/errors/ProcessingError';
import type { ErrorContext } from '~/types/error';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('error handling', () => {
    it('should handle recoverable errors', () => {
      const error = new ProcessingError('Cache miss', null, 'CACHE_MISS');
      const context: ErrorContext = {
        operation: 'cache_fetch',
        userId: 'test-user'
      };

      errorHandler.handle(error, context);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ProcessingError',
          message: 'Cache miss',
          metadata: expect.objectContaining({
            code: 'CACHE_MISS'
          })
        })
      );
    });

    it('should handle critical errors', () => {
      const error = new Error('Critical system failure');
      const context: ErrorContext = {
        operation: 'system_boot',
        critical: true
      };

      errorHandler.handle(error, context);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Error',
          message: 'Critical system failure',
          context: expect.objectContaining({
            critical: true
          })
        })
      );
    });
  });

  describe('metrics tracking', () => {
    it('should track error counts by type', () => {
      const error1 = new ProcessingError('Error 1');
      const error2 = new Error('Error 2');

      errorHandler.handle(error1);
      errorHandler.handle(error2);

      const metrics = errorHandler.getMetrics();
      expect(metrics.totalErrors).toBe(2);
      expect(metrics.errorsByType.get('ProcessingError')).toBe(1);
      expect(metrics.errorsByType.get('Error')).toBe(1);
    });

    it('should track error counts by operation', () => {
      const error = new Error('Operation error');
      
      errorHandler.handle(error, { operation: 'test_op' });
      errorHandler.handle(error, { operation: 'test_op' });

      const metrics = errorHandler.getMetrics();
      expect(metrics.errorsByOperation.get('test_op')).toBe(2);
    });

    it('should reset metrics correctly', () => {
      errorHandler.handle(new Error('Test error'));
      errorHandler.resetMetrics();

      const metrics = errorHandler.getMetrics();
      expect(metrics.totalErrors).toBe(0);
      expect(metrics.errorsByType.size).toBe(0);
      expect(metrics.errorsByOperation.size).toBe(0);
    });
  });
}); 