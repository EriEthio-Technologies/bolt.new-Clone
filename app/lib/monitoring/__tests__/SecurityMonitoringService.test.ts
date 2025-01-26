import { SecurityMonitoringService } from '../SecurityMonitoringService';
import { UIMonitor } from '../UIMonitor';
import { DebugService } from '../../debug/DebugService';
import { Container } from 'typedi';

jest.mock('../UIMonitor');
jest.mock('../../debug/DebugService');

describe('SecurityMonitoringService', () => {
  let service: SecurityMonitoringService;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  let mockDebug: jest.Mocked<DebugService>;

  beforeEach(() => {
    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockDebug = {
      log: jest.fn()
    } as any;

    service = new SecurityMonitoringService(mockUIMonitor, mockDebug);
  });

  afterEach(() => {
    Container.reset();
    jest.clearAllMocks();
  });

  describe('trackSecurityEvent', () => {
    it('tracks security events successfully', async () => {
      const event = {
        type: 'vulnerability_detected' as const,
        details: {
          severity: 'high',
          component: 'test-package'
        }
      };

      await service.trackSecurityEvent(event);

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'SecurityMonitoring',
        duration: expect.any(Number),
        variant: 'trackEvent',
        hasOverlay: false
      });
    });

    it('handles tracking errors', async () => {
      const error = new Error('Tracking failed');
      mockUIMonitor.trackLoadingState.mockRejectedValueOnce(error);

      const event = {
        type: 'scan_started' as const,
        details: {}
      };

      await expect(service.trackSecurityEvent(event)).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'SecurityMonitoringService',
        'Failed to track security event',
        { error }
      );
    });
  });

  describe('getSecurityEvents', () => {
    beforeEach(async () => {
      // Add some test events
      await service.trackSecurityEvent({
        type: 'vulnerability_detected',
        details: { severity: 'high' }
      });
      await service.trackSecurityEvent({
        type: 'scan_completed',
        details: { duration: 1000 }
      });
    });

    it('filters events by time range', async () => {
      const startTime = new Date(Date.now() - 1000);
      const endTime = new Date();

      const events = await service.getSecurityEvents({ startTime, endTime });

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('vulnerability_detected');
      expect(events[1].type).toBe('scan_completed');
    });

    it('filters events by type', async () => {
      const startTime = new Date(Date.now() - 1000);
      const endTime = new Date();

      const events = await service.getSecurityEvents({
        startTime,
        endTime,
        type: 'vulnerability_detected'
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('vulnerability_detected');
    });

    it('handles query errors', async () => {
      const error = new Error('Query failed');
      mockUIMonitor.trackLoadingState.mockRejectedValueOnce(error);

      await expect(service.getSecurityEvents({
        startTime: new Date(),
        endTime: new Date()
      })).rejects.toThrow(error);

      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'SecurityMonitoringService',
        'Failed to get security events',
        { error }
      );
    });
  });
}); 