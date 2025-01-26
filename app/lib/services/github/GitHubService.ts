import { Service } from 'typedi';
import { Octokit } from '@octokit/rest';
import { UIMonitor } from '../monitoring/UIMonitor';
import { DebugService } from '../debug/DebugService';

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

@Service()
export class GitHubService {
  private octokit: Octokit;
  private config: GitHubConfig;
  private uiMonitor: UIMonitor;
  private debug: DebugService;

  constructor() {
    this.uiMonitor = new UIMonitor();
    this.debug = new DebugService();
    this.initializeClient();
  }

  private initializeClient(): void {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GitHub token not found in environment variables');
    }

    this.config = {
      token,
      owner: process.env.GITHUB_OWNER || '',
      repo: process.env.GITHUB_REPO || ''
    };

    this.octokit = new Octokit({
      auth: this.config.token
    });
  }

  async createPullRequest(params: {
    title: string;
    body: string;
    head: string;
    base: string;
  }): Promise<{ url: string; number: number }> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'GitHubService', 'Creating pull request', params);

      const response = await this.octokit.pulls.create({
        owner: this.config.owner,
        repo: this.config.repo,
        ...params
      });

      await this.uiMonitor.trackLoadingState({
        component: 'GitHubService',
        duration: Date.now() - startTime,
        variant: 'createPR',
        hasOverlay: false
      });

      return {
        url: response.data.html_url,
        number: response.data.number
      };
    } catch (error) {
      this.debug.log('error', 'GitHubService', 'Failed to create pull request', { error });
      throw error;
    }
  }

  async addComment(params: {
    issueNumber: number;
    body: string;
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'GitHubService', 'Adding comment', params);

      await this.octokit.issues.createComment({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: params.issueNumber,
        body: params.body
      });

      await this.uiMonitor.trackLoadingState({
        component: 'GitHubService',
        duration: Date.now() - startTime,
        variant: 'addComment',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'GitHubService', 'Failed to add comment', { error });
      throw error;
    }
  }

  async getWorkflowRuns(params: {
    workflow_id: string;
    branch?: string;
  }): Promise<any[]> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'GitHubService', 'Fetching workflow runs', params);

      const response = await this.octokit.actions.listWorkflowRuns({
        owner: this.config.owner,
        repo: this.config.repo,
        workflow_id: params.workflow_id,
        branch: params.branch
      });

      await this.uiMonitor.trackLoadingState({
        component: 'GitHubService',
        duration: Date.now() - startTime,
        variant: 'getWorkflowRuns',
        hasOverlay: false
      });

      return response.data.workflow_runs;
    } catch (error) {
      this.debug.log('error', 'GitHubService', 'Failed to fetch workflow runs', { error });
      throw error;
    }
  }
} 