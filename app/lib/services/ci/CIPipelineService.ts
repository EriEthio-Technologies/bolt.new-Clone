import { Service } from 'typedi';
import { GitHubService } from '../github/GitHubService';
import { UIMonitor } from '../monitoring/UIMonitor';
import { DebugService } from '../debug/DebugService';

interface PipelineConfig {
  enabled: boolean;
  autoMerge: boolean;
  requiredChecks: string[];
  notificationChannels: string[];
}

interface PipelineStatus {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failure';
  checks: Array<{
    name: string;
    status: 'pending' | 'success' | 'failure';
    url: string;
  }>;
}

@Service()
export class CIPipelineService {
  private config: PipelineConfig;
  private uiMonitor: UIMonitor;
  private debug: DebugService;
  private githubService: GitHubService;

  constructor() {
    this.uiMonitor = new UIMonitor();
    this.debug = new DebugService();
    this.githubService = new GitHubService();
    this.loadConfig();
  }

  private loadConfig(): void {
    this.config = {
      enabled: process.env.CI_ENABLED === 'true',
      autoMerge: process.env.CI_AUTO_MERGE === 'true',
      requiredChecks: (process.env.CI_REQUIRED_CHECKS || '').split(',').filter(Boolean),
      notificationChannels: (process.env.CI_NOTIFICATION_CHANNELS || '').split(',').filter(Boolean)
    };
  }

  async triggerPipeline(params: {
    branch: string;
    commitSha: string;
    workflow: string;
  }): Promise<{ id: string; url: string }> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'CIPipelineService', 'Triggering pipeline', params);

      const runs = await this.githubService.getWorkflowRuns({
        workflow_id: params.workflow,
        branch: params.branch
      });

      await this.uiMonitor.trackLoadingState({
        component: 'CIPipelineService',
        duration: Date.now() - startTime,
        variant: 'triggerPipeline',
        hasOverlay: false
      });

      const latestRun = runs[0];
      return {
        id: latestRun.id,
        url: latestRun.html_url
      };
    } catch (error) {
      this.debug.log('error', 'CIPipelineService', 'Failed to trigger pipeline', { error });
      throw error;
    }
  }

  async getPipelineStatus(pipelineId: string): Promise<PipelineStatus> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'CIPipelineService', 'Getting pipeline status', { pipelineId });

      const runs = await this.githubService.getWorkflowRuns({
        workflow_id: pipelineId
      });

      const run = runs.find(r => r.id === pipelineId);
      if (!run) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      await this.uiMonitor.trackLoadingState({
        component: 'CIPipelineService',
        duration: Date.now() - startTime,
        variant: 'getPipelineStatus',
        hasOverlay: false
      });

      return {
        id: run.id,
        status: this.mapGitHubStatus(run.status),
        checks: run.check_runs.map(check => ({
          name: check.name,
          status: this.mapGitHubStatus(check.status),
          url: check.html_url
        }))
      };
    } catch (error) {
      this.debug.log('error', 'CIPipelineService', 'Failed to get pipeline status', { error });
      throw error;
    }
  }

  async autoMergePipeline(pipelineId: string): Promise<void> {
    if (!this.config.autoMerge) {
      this.debug.log('info', 'CIPipelineService', 'Auto-merge disabled', { pipelineId });
      return;
    }

    const startTime = Date.now();

    try {
      const status = await this.getPipelineStatus(pipelineId);
      
      const allChecksPass = status.checks.every(check => 
        check.status === 'success' && 
        this.config.requiredChecks.includes(check.name)
      );

      if (allChecksPass) {
        await this.githubService.addComment({
          issueNumber: parseInt(pipelineId),
          body: '✅ All checks passed - Auto-merging'
        });

        // Additional merge logic here...
      }

      await this.uiMonitor.trackLoadingState({
        component: 'CIPipelineService',
        duration: Date.now() - startTime,
        variant: 'autoMergePipeline',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'CIPipelineService', 'Failed to auto-merge pipeline', { error });
      throw error;
    }
  }

  private mapGitHubStatus(status: string): PipelineStatus['status'] {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'running';
      case 'queued':
        return 'pending';
      default:
        return 'failure';
    }
  }
} 