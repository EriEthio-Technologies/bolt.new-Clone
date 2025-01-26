import { Service } from 'typedi';
import { UIMonitor } from './UIMonitor';
import { DebugService } from '../debug/DebugService';

interface SecurityEvent {
  type: 'scan_started' | 'scan_completed' | 'vulnerability_detected' | 'risk_level_changed';
  timestamp: Date;
  details: Record<string, any>;
}

@Service()
export class SecurityMonitoringService {
  private events: SecurityEvent[] = [];

  constructor(
    private uiMonitor: UIMonitor,
    private debug: DebugService
  ) {}

  async trackSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    const startTime = Date.now();

    try {
      const fullEvent: SecurityEvent = {
        ...event,
        timestamp: new Date()
      };

      this.events.push(fullEvent);

      // Send to monitoring service (e.g., Cloud Monitoring)
      await this.sendToMonitoring(fullEvent);

      await this.uiMonitor.trackLoadingState({
        component: 'SecurityMonitoring',
        duration: Date.now() - startTime,
        variant: 'trackEvent',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'SecurityMonitoringService', 'Failed to track security event', { error });
      throw error;
    }
  }

  async getSecurityEvents(params: {
    startTime: Date;
    endTime: Date;
    type?: SecurityEvent['type'];
  }): Promise<SecurityEvent[]> {
    const startTime = Date.now();

    try {
      let filteredEvents = this.events.filter(event =>
        event.timestamp >= params.startTime &&
        event.timestamp <= params.endTime
      );

      if (params.type) {
        filteredEvents = filteredEvents.filter(event => event.type === params.type);
      }

      await this.uiMonitor.trackLoadingState({
        component: 'SecurityMonitoring',
        duration: Date.now() - startTime,
        variant: 'getEvents',
        hasOverlay: false
      });

      return filteredEvents;
    } catch (error) {
      this.debug.log('error', 'SecurityMonitoringService', 'Failed to get security events', { error });
      throw error;
    }
  }

  private async sendToMonitoring(event: SecurityEvent): Promise<void> {
    // Implementation for sending to Cloud Monitoring
  }
} 