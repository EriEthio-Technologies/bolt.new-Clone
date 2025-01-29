import { RequestHandler } from 'express';
import { metricsMiddleware } from './middleware/metrics.server';
import { loggingMiddleware } from './middleware/logging.server';
import { ResourceMetricsCollector } from './services/ResourceMetricsCollector';
import { SecurityMonitoringService } from './services/monitoring/SecurityMonitoringService';
import MonitoringService from './services/monitoring.server';
import PerformanceMonitor from './services/monitoring/PerformanceMonitor';

export function setupMonitoring(): RequestHandler[] {
  // Start collecting resource metrics
  ResourceMetricsCollector.getInstance().start();
  
  // Initialize performance monitoring
  const performanceMonitor = PerformanceMonitor.getInstance();
  performanceMonitor.onAlert((alert) => {
    console.error('PERFORMANCE ALERT:', alert.type, alert.data);
  });
  
  // Initialize security monitoring
  const securityMonitoring = SecurityMonitoringService.getInstance();
  setInterval(() => {
    securityMonitoring.monitorSecurityEvents();
  }, 60000); // Check security events every minute

  // Return middleware array
  // Initialize monitoring service and set up alert handlers
  const monitoringService = MonitoringService.getInstance();
  monitoringService.onAlert((alert) => {
    // Log alert to console
    console.error('ALERT:', alert.type, alert.data);
    
    // Send alert to configured channels
    if (process.env.ALERT_EMAIL_ENABLED === 'true') {
      // TODO: Implement email alerts
      console.log('Sending email alert:', alert);
    }
    
    if (process.env.ALERT_SLACK_ENABLED === 'true') {
      // TODO: Implement Slack alerts
      console.log('Sending Slack alert:', alert);
    }
  });

  // Create monitoring middleware
  const monitoringMiddleware: RequestHandler = (req, res, next) => {
    monitoringService.monitorRequest(req, res);
    next();
  };

  return [
    loggingMiddleware(),
    metricsMiddleware(),
    monitoringMiddleware,
    async (req, res, next) => {
      // Add security context to request
      req.securityContext = {
        monitoringService: securityMonitoring
      };
      next();
    }
  ];
}