import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SecurityMonitoringService } from '../SecurityMonitoringService';
import { AlertLevel } from '../../../types/monitoring';

describe('SecurityMonitoringService', () => {
  let securityMonitoring: SecurityMonitoringService;
  
  beforeEach(() => {
    securityMonitoring = SecurityMonitoringService.getInstance();
    // Reset metrics mock between tests
    jest.clearAllMocks();
  });

  describe('monitorSecurityEvents', () => {
    it('should check all security metrics', async () => {
      // Mock internal methods
      const checkFailedLoginsSpy = jest.spyOn(securityMonitoring as any, 'checkFailedLogins');
      const checkSuspiciousActivitiesSpy = jest.spyOn(securityMonitoring as any, 'checkSuspiciousActivities');
      const checkUnauthorizedAccessSpy = jest.spyOn(securityMonitoring as any, 'checkUnauthorizedAccess');

      await securityMonitoring.monitorSecurityEvents();

      expect(checkFailedLoginsSpy).toHaveBeenCalled();
      expect(checkSuspiciousActivitiesSpy).toHaveBeenCalled();
      expect(checkUnauthorizedAccessSpy).toHaveBeenCalled();
    });
  });

  describe('security checks', () => {
    it('should raise alert for high failed logins', async () => {
      const metrics = {
        getMetricValue: jest.fn().mockResolvedValue(6) // Above threshold of 5
      };
      (securityMonitoring as any).metrics = metrics;
      const raiseAlertSpy = jest.spyOn(securityMonitoring as any, 'raiseAlert');

      await (securityMonitoring as any).checkFailedLogins();

      expect(raiseAlertSpy).toHaveBeenCalledWith({
        level: AlertLevel.HIGH,
        message: expect.stringContaining('High number of failed logins'),
        source: 'security-monitoring',
        timestamp: expect.any(Date)
      });
    });

    it('should raise alert for suspicious activities', async () => {
      const metrics = {
        getMetricValue: jest.fn().mockResolvedValue(4) // Above threshold of 3
      };
      (securityMonitoring as any).metrics = metrics;
      const raiseAlertSpy = jest.spyOn(securityMonitoring as any, 'raiseAlert');

      await (securityMonitoring as any).checkSuspiciousActivities();

      expect(raiseAlertSpy).toHaveBeenCalledWith({
        level: AlertLevel.CRITICAL,
        message: expect.stringContaining('Suspicious activities detected'),
        source: 'security-monitoring',
        timestamp: expect.any(Date)
      });
    });

    it('should raise alert for unauthorized access', async () => {
      const metrics = {
        getMetricValue: jest.fn().mockResolvedValue(1) // At threshold of 1
      };
      (securityMonitoring as any).metrics = metrics;
      const raiseAlertSpy = jest.spyOn(securityMonitoring as any, 'raiseAlert');

      await (securityMonitoring as any).checkUnauthorizedAccess();

      expect(raiseAlertSpy).toHaveBeenCalledWith({
        level: AlertLevel.CRITICAL,
        message: expect.stringContaining('Unauthorized access attempts'),
        source: 'security-monitoring',
        timestamp: expect.any(Date)
      });
    });
  });
});