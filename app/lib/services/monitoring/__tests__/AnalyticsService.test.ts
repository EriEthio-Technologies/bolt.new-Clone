import { AnalyticsService } from '../AnalyticsService';
import { UIMonitor } from '../UIMonitor';
import { DebugService } from '../../debug/DebugService';

jest.mock('../UIMonitor');
jest.mock('../../debug/DebugService');

describe('AnalyticsService', () => {
  let service: AnalyticsService;
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

    service = new AnalyticsService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    const eventParams = {
      category: 'test',
      action: 'click',
      label: 'button',
      value: 1,
      metadata: { foo: 'bar' }
    };

    it('tracks event successfully', async () => {
      await service.trackEvent(eventParams);

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'AnalyticsService',
        duration: expect.any(Number),
        variant: 'trackEvent',
        hasOverlay: false
      });
    });

    it('handles tracking errors', async () => {
      const error = new Error('Failed to track');
      mockUIMonitor.trackLoadingState.mockRejectedValue(error);

      await expect(service.trackEvent(eventParams)).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'AnalyticsService',
        'Failed to track event',
        { error }
      );
    });
  });

  describe('session tracking', () => {
    const sessionParams = {
      sessionId: 'session1',
      participantCount: 2
    };

    it('starts session tracking successfully', async () => {
      await service.startSessionTracking(sessionParams);

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'AnalyticsService',
        duration: expect.any(Number),
        variant: 'startSessionTracking',
        hasOverlay: false
      });
    });

    it('updates session metrics successfully', async () => {
      await service.startSessionTracking(sessionParams);

      await service.updateSessionMetrics({
        sessionId: sessionParams.sessionId,
        driverSwitch: true,
        fileAccessed: 'test.ts'
      });

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'AnalyticsService',
        duration: expect.any(Number),
        variant: 'updateSessionMetrics',
        hasOverlay: false
      });
    });

    it('ends session tracking successfully', async () => {
      await service.startSessionTracking(sessionParams);

      const metrics = await service.endSessionTracking(sessionParams.sessionId);

      expect(metrics).toMatchObject({
        sessionId: sessionParams.sessionId,
        participantCount: sessionParams.participantCount,
        driverSwitches: 0,
        filesAccessed: [],
        eventCount: 0
      });

      expect(metrics.duration).toBeGreaterThanOrEqual(0);
      expect(metrics.endTime).toBeDefined();

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'AnalyticsService',
        duration: expect.any(Number),
        variant: 'endSessionTracking',
        hasOverlay: false
      });
    });

    it('throws error for invalid session', async () => {
      await expect(service.updateSessionMetrics({
        sessionId: 'invalid',
        driverSwitch: true
      })).rejects.toThrow('Session invalid not found');

      await expect(service.endSessionTracking('invalid'))
        .rejects.toThrow('Session invalid not found');
    });
  });
}); 