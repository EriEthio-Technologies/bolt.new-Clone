import { Service } from 'typedi';
import { monitoring_v3, google } from 'googleapis';
import { DebugService } from '../debug/DebugService';
import { SecurityEvent } from './SecurityMonitoringService';

@Service()
export class CloudMonitoringService {
  private monitoring: monitoring_v3.Monitoring;
  private readonly projectId: string;
  private readonly metricPrefix = 'custom.googleapis.com/security';

  constructor(private debug: DebugService) {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || '';
    this.monitoring = new monitoring_v3.Monitoring({
      auth: new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/monitoring']
      })
    });
  }

  async sendSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const timeSeriesData = {
        metric: {
          type: `${this.metricPrefix}/${event.type}`,
          labels: {
            event_type: event.type,
            ...this.flattenDetails(event.details)
          }
        },
        resource: {
          type: 'global',
          labels: {
            project_id: this.projectId
          }
        },
        points: [{
          interval: {
            endTime: {
              seconds: Math.floor(event.timestamp.getTime() / 1000),
              nanos: (event.timestamp.getTime() % 1000) * 1e6
            }
          },
          value: {
            int64Value: '1'
          }
        }]
      };

      await this.monitoring.projects.timeSeries.create({
        name: `projects/${this.projectId}`,
        requestBody: {
          timeSeries: [timeSeriesData]
        }
      });

      this.debug.log('info', 'CloudMonitoringService', 'Security event sent to Cloud Monitoring', {
        eventType: event.type,
        timestamp: event.timestamp
      });
    } catch (error) {
      this.debug.log('error', 'CloudMonitoringService', 'Failed to send security event to Cloud Monitoring', { error });
      throw error;
    }
  }

  private flattenDetails(details: Record<string, any>, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(details)) {
      const fullKey = prefix ? `${prefix}_${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        Object.assign(result, this.flattenDetails(value, fullKey));
      } else {
        result[fullKey] = String(value);
      }
    }

    return result;
  }
} 