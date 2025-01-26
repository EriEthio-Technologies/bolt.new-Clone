import { Service } from 'typedi';
import { UIMonitor } from './UIMonitor';
import { DebugService } from '../debug/DebugService';

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface SessionMetrics {
  sessionId: string;
  duration: number;
  participantCount: number;
  driverSwitches: number;
  filesAccessed: string[];
  eventCount: number;
  startTime: Date;
  endTime?: Date;
}

@Service()
export class AnalyticsService {
  private uiMonitor: UIMonitor;
  private debug: DebugService;
  private events: AnalyticsEvent[] = [];
  private sessionMetrics: Map<string, SessionMetrics> = new Map();

  constructor() {
    this.uiMonitor = new UIMonitor();
    this.debug = new DebugService();
  }

  async trackEvent(params: {
    category: string;
    action: string;
    label?: string;
    value?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'AnalyticsService', 'Tracking event', params);

      const event: AnalyticsEvent = {
        ...params,
        timestamp: new Date()
      };

      this.events.push(event);

      // Here we would send the event to Google Analytics or other analytics service

      await this.uiMonitor.trackLoadingState({
        component: 'AnalyticsService',
        duration: Date.now() - startTime,
        variant: 'trackEvent',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'AnalyticsService', 'Failed to track event', { error });
      throw error;
    }
  }

  async startSessionTracking(params: {
    sessionId: string;
    participantCount: number;
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'AnalyticsService', 'Starting session tracking', params);

      const metrics: SessionMetrics = {
        sessionId: params.sessionId,
        duration: 0,
        participantCount: params.participantCount,
        driverSwitches: 0,
        filesAccessed: [],
        eventCount: 0,
        startTime: new Date()
      };

      this.sessionMetrics.set(params.sessionId, metrics);

      await this.uiMonitor.trackLoadingState({
        component: 'AnalyticsService',
        duration: Date.now() - startTime,
        variant: 'startSessionTracking',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'AnalyticsService', 'Failed to start session tracking', { error });
      throw error;
    }
  }

  async updateSessionMetrics(params: {
    sessionId: string;
    driverSwitch?: boolean;
    fileAccessed?: string;
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'AnalyticsService', 'Updating session metrics', params);

      const metrics = this.sessionMetrics.get(params.sessionId);
      if (!metrics) {
        throw new Error(`Session ${params.sessionId} not found`);
      }

      if (params.driverSwitch) {
        metrics.driverSwitches++;
      }

      if (params.fileAccessed && !metrics.filesAccessed.includes(params.fileAccessed)) {
        metrics.filesAccessed.push(params.fileAccessed);
      }

      metrics.eventCount++;

      await this.uiMonitor.trackLoadingState({
        component: 'AnalyticsService',
        duration: Date.now() - startTime,
        variant: 'updateSessionMetrics',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'AnalyticsService', 'Failed to update session metrics', { error });
      throw error;
    }
  }

  async endSessionTracking(sessionId: string): Promise<SessionMetrics> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'AnalyticsService', 'Ending session tracking', { sessionId });

      const metrics = this.sessionMetrics.get(sessionId);
      if (!metrics) {
        throw new Error(`Session ${sessionId} not found`);
      }

      metrics.endTime = new Date();
      metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();

      // Here we would send the final metrics to our analytics service

      this.sessionMetrics.delete(sessionId);

      await this.uiMonitor.trackLoadingState({
        component: 'AnalyticsService',
        duration: Date.now() - startTime,
        variant: 'endSessionTracking',
        hasOverlay: false
      });

      return metrics;
    } catch (error) {
      this.debug.log('error', 'AnalyticsService', 'Failed to end session tracking', { error });
      throw error;
    }
  }
} 