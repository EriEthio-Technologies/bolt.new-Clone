import { ErrorMonitoringService } from '../ErrorMonitoringService';
import { ErrorReporting } from '@google-cloud/error-reporting';
import { Monitoring } from '@google-cloud/monitoring';
import type { ErrorContext, ErrorMetrics } from '~/types/error';

jest.mock('@google-cloud/error-reporting');
jest.mock('@google-cloud/monitoring');

describe('ErrorMonitoringService', () => {
  let monitoringService: ErrorMonitoringService;
  let mockErrorReporting: jest.Mocked<ErrorReporting>;
  let mockMonitoring: jest.Mocked<Monitoring>;

  beforeEach(() => {
    mockErrorReporting = {
      report: jest.fn()
    } as any;

    mockMonitoring = {
      projectPath: jest.fn().mockReturnValue('test-project-path'),
      createTimeSeries: jest.fn()
    } as any;

    (ErrorReporting as jest.Mock).mockImplementation(() => mockErrorReporting);
    (Monitoring as jest.Mock).mockImplementation(() => mockMonitoring);

    monitoringService = new ErrorMonitoringService();
  });

  describe('reportError', () => {
    it('should report errors to Error Reporting', async () => {
      const error = new Error('Test error');
      const context: ErrorContext = {
        operation: 'test_operation',
        userId: 'test-user'
      };

      await monitoringService.reportError(error, context);

      expect(mockErrorReporting.report).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          user: 'test-user',
          service: 'gobeze-ai',
          operation: 'test_operation'
        })
      );
    });

    it('should handle reporting failures gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockErrorReporting.report.mockRejectedValueOnce(new Error('Report failed'));

      await monitoringService.reportError(new Error('Test'));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error reporting failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('updateErrorMetrics', () => {
    const mockMetrics: ErrorMetrics = {
      totalErrors: 5,
      errorsByType: new Map([['Error', 3], ['TypeError', 2]]),
      errorsByOperation: new Map([['op1', 2], ['op2', 3]])
    };

    it('should create time series for all metric types', async () => {
      await monitoringService.updateErrorMetrics(mockMetrics);

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-project-path',
          timeSeries: expect.arrayContaining([
            expect.objectContaining({
              metric: {
                type: 'custom.googleapis.com/error/total'
              }
            }),
            expect.objectContaining({
              metric: {
                type: 'custom.googleapis.com/error/by_type'
              }
            }),
            expect.objectContaining({
              metric: {
                type: 'custom.googleapis.com/error/by_operation'
              }
            })
          ])
        })
      );
    });

    it('should include environment labels', async () => {
      await monitoringService.updateErrorMetrics(mockMetrics);

      const createTimeSeriesCall = mockMonitoring.createTimeSeries.mock.calls[0][0];
      const timeSeries = createTimeSeriesCall.timeSeries;

      timeSeries.forEach((series: any) => {
        expect(series.metric.labels.environment).toBeDefined();
      });
    });

    it('should handle metric update failures', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMonitoring.createTimeSeries.mockRejectedValueOnce(
        new Error('Metrics update failed')
      );

      await monitoringService.updateErrorMetrics(mockMetrics);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error metrics update failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('createErrorMetrics', () => {
    it('should create occurrence metrics with correct labels', async () => {
      const error = new TypeError('Test error');
      const context: ErrorContext = {
        operation: 'test_op',
        userId: 'test-user'
      };

      await (monitoringService as any).createErrorMetrics(error, context);

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          timeSeries: [
            expect.objectContaining({
              metric: {
                type: 'custom.googleapis.com/error/occurrence',
                labels: expect.objectContaining({
                  error_type: 'TypeError',
                  operation: 'test_op'
                })
              }
            })
          ]
        })
      );
    });
  });
}); 