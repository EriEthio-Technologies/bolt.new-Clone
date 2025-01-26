import { CIPipelineService } from '../CIPipelineService';
import { GitHubService } from '../../github/GitHubService';
import { UIMonitor } from '../../monitoring/UIMonitor';
import { DebugService } from '../../debug/DebugService';

jest.mock('../../github/GitHubService');
jest.mock('../../monitoring/UIMonitor');
jest.mock('../../debug/DebugService');

describe('CIPipelineService', () => {
  let service: CIPipelineService;
  let mockGitHubService: jest.Mocked<GitHubService>;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  let mockDebug: jest.Mocked<DebugService>;

  beforeEach(() => {
    process.env.CI_ENABLED = 'true';
    process.env.CI_AUTO_MERGE = 'true';
    process.env.CI_REQUIRED_CHECKS = 'test,lint,build';
    process.env.CI_NOTIFICATION_CHANNELS = 'slack,email';

    mockGitHubService = {
      getWorkflowRuns: jest.fn(),
      addComment: jest.fn()
    } as any;

    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockDebug = {
      log: jest.fn()
    } as any;

    (GitHubService as jest.Mock).mockImplementation(() => mockGitHubService);
    (UIMonitor as jest.Mock).mockImplementation(() => mockUIMonitor);
    (DebugService as jest.Mock).mockImplementation(() => mockDebug);

    service = new CIPipelineService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.CI_ENABLED;
    delete process.env.CI_AUTO_MERGE;
    delete process.env.CI_REQUIRED_CHECKS;
    delete process.env.CI_NOTIFICATION_CHANNELS;
  });

  describe('triggerPipeline', () => {
    it('triggers pipeline successfully', async () => {
      const mockRun = {
        id: 'test-id',
        html_url: 'https://github.com/test/test/actions/runs/1'
      };

      mockGitHubService.getWorkflowRuns.mockResolvedValue([mockRun]);

      const result = await service.triggerPipeline({
        branch: 'main',
        commitSha: 'abc123',
        workflow: 'test.yml'
      });

      expect(result).toEqual({
        id: mockRun.id,
        url: mockRun.html_url
      });
      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalled();
      expect(mockDebug.log).toHaveBeenCalledWith(
        'info',
        'CIPipelineService',
        'Triggering pipeline',
        expect.any(Object)
      );
    });

    it('handles pipeline trigger errors', async () => {
      const error = new Error('API error');
      mockGitHubService.getWorkflowRuns.mockRejectedValue(error);

      await expect(service.triggerPipeline({
        branch: 'main',
        commitSha: 'abc123',
        workflow: 'test.yml'
      })).rejects.toThrow(error);

      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'CIPipelineService',
        'Failed to trigger pipeline',
        { error }
      );
    });
  });

  describe('autoMergePipeline', () => {
    it('auto-merges when all checks pass', async () => {
      const mockStatus = {
        id: 'test-id',
        status: 'success',
        checks: [
          { name: 'test', status: 'success', url: 'test-url' },
          { name: 'lint', status: 'success', url: 'lint-url' },
          { name: 'build', status: 'success', url: 'build-url' }
        ]
      };

      mockGitHubService.getWorkflowRuns.mockResolvedValue([{
        id: 'test-id',
        status: 'completed',
        check_runs: mockStatus.checks
      }]);

      await service.autoMergePipeline('test-id');

      expect(mockGitHubService.addComment).toHaveBeenCalled();
      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalled();
    });
  });
}); 