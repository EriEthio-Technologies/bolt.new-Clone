import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PerformanceMonitoringService } from '../PerformanceMonitoringService';
import { AlertLevel } from '../../../types/monitoring';

describe('PerformanceMonitoringService', () => {
  let performanceMonitoring: PerformanceMonitoringService;
  
  beforeEach(() => {
    performanceMonitoring = PerformanceMonitoringService.getInstance();
    // Reset metrics mock between tests
    jest.clearAllMocks();
  });

  describe('monitorPerformance', () => {
    it('should check all performance metrics concurrently', async () => {
      // Mock internal methods
      const checkCPUSpy = jest.spyOn(performanceMonitoring as any, 'checkCPUUsage');
      const checkMemorySpy = jest.spyOn(performanceMonitoring as any, 'checkMemoryUsage');
      const checkResponseSpy = jest.spyOn(performanceMonitoring as any, 'checkResponseTimes');
      const checkErrorSpy = jest.spyOn(performanceMonitoring as any, 'checkErrorRates');

      await performanceMonitoring.monitorPerformance();

      expect(checkCPUSpy).toHaveBeenCalled();
      expect(checkMemorySpy).toHaveBeenCalled();
      expect(checkResponseSpy).toHaveBeenCalled();
      expect(checkErrorSpy).toHaveBeenCalled();
    });
  });

  describe('performance checks', () => {
    it('should raise alert for high CPU usage', async () => {
      const metrics = {
        getMetricValue: jest.fn().mockResolvedValue(85) // Above threshold of 80
      };
      (performanceMonitoring as any).metrics = metrics;
      const raiseAlertSpy = jest.spyOn(performanceMonitoring as any, 'raiseAlert');

      await (performanceMonitoring as any).checkCPUUsage();

      expect(raiseAlertSpy).toHaveBeenCalledWith({
        level: AlertLevel.HIGH,
        message: expect.stringContaining('High CPU usage'),
        source: 'performance-monitoring',
        timestamp: expect.any(Date)
      });
    });

    it('should raise alert for high memory usage', async () => {
      const metrics = {
        getMetricValue: jest.fn().mockResolvedValue(90) // Above threshold of 85
      };
      (performanceMonitoring as any).metrics = metrics;
      const raiseAlertSpy = jest.spyOn(performanceMonitoring as any, 'raiseAlert');

      await (performanceMonitoring as any).checkMemoryUsage();

      expect(raiseAlertSpy).toHaveBeenCalledWith({
        level: AlertLevel.HIGH,
        message: expect.stringContaining('High memory usage'),
        source: 'performance-monitoring',
        timestamp: expect.any(Date)
      });
    });

    it('should raise alert for high response times', async () => {
      const metrics = {
        getMetricValue: jest.fn().mockResolvedValue(1200) // Above threshold of 1000
      };
      (performanceMonitoring as any).metrics = metrics;
      const raiseAlertSpy = jest.spyOn(performanceMonitoring as any, 'raiseAlert');

      await (performanceMonitoring as any).checkResponseTimes();

      expect(raiseAlertSpy).toHaveBeenCalledWith({
        level: AlertLevel.MEDIUM,
        message: expect.stringContaining('High average response time'),
        source: 'performance-monitoring',
        timestamp: expect.any(Date)
      });
    });

    it('should raise alert for high error rates', async () => {
      const metrics = {
        getMetricValue: jest.fn().mockResolvedValue(6) // Above threshold of 5
      };
      (performanceMonitoring as any).metrics = metrics;
      const raiseAlertSpy = jest.spyOn(performanceMonitoring as any, 'raiseAlert');

      await (performanceMonitoring as any).checkErrorRates();

      expect(raiseAlertSpy).toHaveBeenCalledWith({
        level: AlertLevel.HIGH,
        message: expect.stringContaining('High error rate'),
        source: 'performance-monitoring',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('singleton pattern', () => {
    it('should always return the same instance', () => {
      const instance1 = PerformanceMonitoringService.getInstance();
      const instance2 = PerformanceMonitoringService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});