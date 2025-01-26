import { Service } from 'typedi';
import { CIPipelineService } from './CIPipelineService';
import { UIMonitor } from '../monitoring/UIMonitor';
import { DebugService } from '../debug/DebugService';

interface WorkflowConfig {
  workflows: {
    [key: string]: {
      path: string;
      triggers: string[];
      requiredChecks: string[];
    };
  };
}

@Service()
export class WorkflowService {
  private config: WorkflowConfig;
  private uiMonitor: UIMonitor;
  private debug: DebugService;
  private ciPipeline: CIPipelineService;

  constructor() {
    this.uiMonitor = new UIMonitor();
    this.debug = new DebugService();
    this.ciPipeline = new CIPipelineService();
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      this.config = {
        workflows: {
          build: {
            path: '.github/workflows/build.yml',
            triggers: ['push', 'pull_request'],
            requiredChecks: ['build', 'test', 'lint']
          },
          deploy: {
            path: '.github/workflows/deploy.yml',
            triggers: ['release'],
            requiredChecks: ['build', 'security-scan']
          }
        }
      };
    } catch (error) {
      this.debug.log('error', 'WorkflowService', 'Failed to load workflow config', { error });
      throw error;
    }
  }

  async triggerWorkflow(params: {
    name: string;
    branch: string;
    commitSha: string;
  }): Promise<{ id: string; url: string }> {
    const startTime = Date.now();

    try {
      const workflow = this.config.workflows[params.name];
      if (!workflow) {
        throw new Error(`Workflow ${params.name} not found`);
      }

      this.debug.log('info', 'WorkflowService', 'Triggering workflow', { ...params, workflow });

      const result = await this.ciPipeline.triggerPipeline({
        workflow: workflow.path,
        branch: params.branch,
        commitSha: params.commitSha
      });

      await this.uiMonitor.trackLoadingState({
        component: 'WorkflowService',
        duration: Date.now() - startTime,
        variant: 'triggerWorkflow',
        hasOverlay: false
      });

      return result;
    } catch (error) {
      this.debug.log('error', 'WorkflowService', 'Failed to trigger workflow', { error });
      throw error;
    }
  }

  async monitorWorkflow(workflowId: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'WorkflowService', 'Monitoring workflow', { workflowId });

      const status = await this.ciPipeline.getPipelineStatus(workflowId);
      
      if (status.status === 'success') {
        await this.ciPipeline.autoMergePipeline(workflowId);
      }

      await this.uiMonitor.trackLoadingState({
        component: 'WorkflowService',
        duration: Date.now() - startTime,
        variant: 'monitorWorkflow',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'WorkflowService', 'Failed to monitor workflow', { error });
      throw error;
    }
  }
} 