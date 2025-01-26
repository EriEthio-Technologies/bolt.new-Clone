import { Service } from 'typedi';
import { DebugService } from '../debug/DebugService';
import { UIMonitor } from './UIMonitor';

interface LoadTestMetrics {
  vus: number;
  http_reqs: number;
  http_req_duration: {
    p95: number;
    median: number;
  };
  ws_sessions: number;
  ws_messages: number;
  errors: number;
}

@Service()
export class LoadTestDashboard {
  constructor(
    private debug: DebugService,
    private uiMonitor: UIMonitor
  ) {}

  async updateMetrics(metrics: LoadTestMetrics): Promise<void> {
    try {
      await this.uiMonitor.trackLoadingState({
        component: 'LoadTestDashboard',
        duration: 0,
        variant: 'updateMetrics',
        hasOverlay: false
      });

      // Send metrics to monitoring service
      await this.sendToCloudMonitoring(metrics);
    } catch (error) {
      this.debug.log('error', 'LoadTestDashboard', 'Failed to update metrics', { error });
      throw error;
    }
  }

  private async sendToCloudMonitoring(metrics: LoadTestMetrics): Promise<void> {
    // Implementation for sending metrics to Google Cloud Monitoring
  }
} 