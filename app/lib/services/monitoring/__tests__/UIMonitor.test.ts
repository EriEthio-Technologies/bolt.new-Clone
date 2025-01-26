import { UIMonitor } from '../UIMonitor';
import { Monitoring } from '@google-cloud/monitoring';

jest.mock('@google-cloud/monitoring');

describe('UIMonitor', () => {
  let monitor: UIMonitor;
  let mockMonitoring: jest.Mocked<Monitoring>;

  beforeEach(() => {
    (Monitoring as jest.Mock).mockClear();
    mockMonitoring = {
      projectPath: jest.fn().mockReturnValue('projects/test-project'),
      createTimeSeries: jest.fn().mockResolvedValue(undefined)
    } as any;
    (Monitoring as jest.Mock).mockImplementation(() => mockMonitoring);
    monitor = new UIMonitor();
  });

  describe('trackLoadingState', () => {
    it('creates time series for loading state metrics', async () => {
      const data = {
        component: 'ProgressIndicator',
        duration: 1000,
        variant: 'linear',
        hasOverlay: false
      };

      await monitor.trackLoadingState(data);

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledWith({
        name: 'projects/test-project',
        timeSeries: expect.arrayContaining([
          expect.objectContaining({
            metric: {
              type: 'custom.googleapis.com/ui/loading_duration',
              labels: expect.objectContaining({
                component: 'ProgressIndicator',
                variant: 'linear'
              })
            }
          }),
          expect.objectContaining({
            metric: {
              type: 'custom.googleapis.com/ui/loading_count',
              labels: expect.objectContaining({
                component: 'ProgressIndicator',
                variant: 'linear'
              })
            }
          })
        ])
      });
    });

    it('handles errors gracefully', async () => {
      mockMonitoring.createTimeSeries.mockRejectedValueOnce(new Error('API Error'));

      await expect(monitor.trackLoadingState({
        component: 'ProgressIndicator',
        duration: 1000,
        variant: 'linear',
        hasOverlay: false
      })).rejects.toThrow('Failed to create time series: API Error');
    });
  });

  describe('error handling', () => {
    it('validates input parameters', async () => {
      await expect(monitor.trackLoadingState({
        component: '',
        duration: -1,
        variant: 'invalid',
        hasOverlay: false
      })).rejects.toThrow();
    });

    it('retries failed requests', async () => {
      mockMonitoring.createTimeSeries
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(undefined);

      await monitor.trackLoadingState({
        component: 'ProgressIndicator',
        duration: 1000,
        variant: 'linear',
        hasOverlay: false
      });

      expect(mockMonitoring.createTimeSeries).toHaveBeenCalledTimes(2);
    });
  });
}); 