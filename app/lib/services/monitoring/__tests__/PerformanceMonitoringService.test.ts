import { PerformanceMonitoringService } from '../PerformanceMonitoringService';
import { UIMonitor } from '../UIMonitor';
import { DebugService } from '../../debug/DebugService';

jest.mock('../UIMonitor');
jest.mock('../../debug/DebugService');

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  let mockDebug: jest.Mocked<DebugService>;

  beforeEach(() => {
    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockDebug = {
      log: jest.fn()
    } as any;

    (UIMonitor as jest.Mock).mockImplementation(() => mockUIMonitor);
    (DebugService as jest.Mock).mockImplementation(() => mockDebug);

    jest.useFakeTimers();
    service = new PerformanceMonitoringService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('trackMetric', () => {
    const metricParams = {
      name: 'test.metric',
      value: 42,
      unit: 'ms' as const,
      tags: { service: 'test' }
    };

    it('tracks metric successfully', async () => {
      await service.trackMetric(metricParams);

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'PerformanceMonitoringService',
        duration: expect.any(Number),
        variant: 'trackMetric',
        hasOverlay: false
      });
    });

    it('handles tracking errors', async () => {
      const error = new Error('Failed to track');
      mockUIMonitor.trackLoadingState.mockRejectedValue(error);

      await expect(service.trackMetric(metricParams)).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'PerformanceMonitoringService',
        'Failed to track metric',
        { error }
      );
    });
  });

  describe('getMetrics', () => {
    const timeRange = {
      startTime: new Date('2024-01-01'),
      endTime: new Date('2024-01-02')
    };

    beforeEach(async () => {
      await service.trackMetric({
        name: 'test.metric',
        value: 42,
        unit: 'ms',
        tags: { service: 'test' }
      });
    });

    it('filters metrics by time range', async () => {
      const metrics = await service.getMetrics(timeRange);
      expect(metrics.length).toBe(1);
    });

    it('filters metrics by name', async () => {
      const metrics = await service.getMetrics({
        ...timeRange,
        name: 'test.metric'
      });
      expect(metrics.length).toBe(1);

      const noMetrics = await service.getMetrics({
        ...timeRange,
        name: 'nonexistent'
      });
      expect(noMetrics.length).toBe(0);
    });

    it('filters metrics by tags', async () => {
      const metrics = await service.getMetrics({
        ...timeRange,
        tags: { service: 'test' }
      });
      expect(metrics.length).toBe(1);

      const noMetrics = await service.getMetrics({
        ...timeRange,
        tags: { service: 'other' }
      });
      expect(noMetrics.length).toBe(0);
    });
  });

  describe('resource monitoring', () => {
    it('collects resource metrics periodically', async () => {
      jest.advanceTimersByTime(60000);

      expect(mockDebug.log).toHaveBeenCalledWith(
        'info',
        'PerformanceMonitoringService',
        'Tracking metric',
        expect.objectContaining({
          name: 'system.cpu.usage',
          unit: 'percent'
        })
      );
    });

    it('retrieves resource usage by time range', async () => {
      const timeRange = {
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: new Date()
      };

      jest.advanceTimersByTime(60000);

      const usage = await service.getResourceUsage(timeRange);
      expect(usage.length).toBeGreaterThan(0);
      expect(usage[0]).toMatchObject({
        cpu: expect.any(Number),
        memory: expect.any(Number),
        networkIn: expect.any(Number),
        networkOut: expect.any(Number),
        timestamp: expect.any(Date)
      });
    });
  });
}); 