import { Service } from 'typedi';
import { ErrorReporting } from '@google-cloud/error-reporting';
import { Monitoring } from '@google-cloud/monitoring';
import { validateEnv } from '~/config/env.server';
import type { ErrorContext, ErrorMetrics } from '~/types/error';

@Service()
export class ErrorMonitoringService {
  private errorReporting: ErrorReporting;
  private monitoring: Monitoring;
  private readonly projectPath: string;

  constructor() {
    const env = validateEnv();
    
    this.errorReporting = new ErrorReporting({
      projectId: env.GCP_PROJECT_ID,
      keyFilename: env.GCP_KEY_FILE,
      reportMode: env.NODE_ENV === 'production' ? 'production' : 'debug'
    });

    this.monitoring = new Monitoring({
      projectId: env.GCP_PROJECT_ID,
      keyFilename: env.GCP_KEY_FILE
    });

    this.projectPath = this.monitoring.projectPath(env.GCP_PROJECT_ID);
  }

  async reportError(error: Error, context?: ErrorContext): Promise<void> {
    try {
      // Report to Error Reporting
      this.errorReporting.report(error, {
        user: context?.userId,
        service: 'gobeze-ai',
        version: process.env.npm_package_version,
        ...context
      });

      // Create custom metrics
      await this.createErrorMetrics(error, context);
    } catch (reportingError) {
      console.error('Error reporting failed:', reportingError);
    }
  }

  async updateErrorMetrics(metrics: ErrorMetrics): Promise<void> {
    try {
      const now = Date.now();
      const timeSeriesData = [];

      // Total errors metric
      timeSeriesData.push({
        metric: {
          type: 'custom.googleapis.com/error/total',
          labels: {
            environment: process.env.NODE_ENV || 'development'
          }
        },
        points: [{
          interval: {
            endTime: { seconds: now / 1000 }
          },
          value: { int64Value: metrics.totalErrors }
        }]
      });

      // Error by type metrics
      metrics.errorsByType.forEach((count, type) => {
        timeSeriesData.push({
          metric: {
            type: 'custom.googleapis.com/error/by_type',
            labels: {
              error_type: type,
              environment: process.env.NODE_ENV || 'development'
            }
          },
          points: [{
            interval: {
              endTime: { seconds: now / 1000 }
            },
            value: { int64Value: count }
          }]
        });
      });

      // Error by operation metrics
      metrics.errorsByOperation.forEach((count, operation) => {
        timeSeriesData.push({
          metric: {
            type: 'custom.googleapis.com/error/by_operation',
            labels: {
              operation,
              environment: process.env.NODE_ENV || 'development'
            }
          },
          points: [{
            interval: {
              endTime: { seconds: now / 1000 }
            },
            value: { int64Value: count }
          }]
        });
      });

      await this.monitoring.createTimeSeries({
        name: this.projectPath,
        timeSeries: timeSeriesData
      });
    } catch (error) {
      console.error('Error metrics update failed:', error);
    }
  }

  private async createErrorMetrics(
    error: Error,
    context?: ErrorContext
  ): Promise<void> {
    const now = Date.now();
    const timeSeriesData = {
      metric: {
        type: 'custom.googleapis.com/error/occurrence',
        labels: {
          error_type: error.constructor.name,
          operation: context?.operation || 'unknown',
          environment: process.env.NODE_ENV || 'development'
        }
      },
      resource: {
        type: 'global',
        labels: {
          project_id: process.env.GCP_PROJECT_ID
        }
      },
      points: [{
        interval: {
          endTime: {
            seconds: now / 1000
          }
        },
        value: {
          int64Value: 1
        }
      }]
    };

    await this.monitoring.createTimeSeries({
      name: this.projectPath,
      timeSeries: [timeSeriesData]
    });
  }
} 