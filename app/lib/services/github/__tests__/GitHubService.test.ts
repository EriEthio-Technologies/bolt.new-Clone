import { GitHubService } from '../GitHubService';
import { UIMonitor } from '../../monitoring/UIMonitor';
import { DebugService } from '../../debug/DebugService';
import { Octokit } from '@octokit/rest';

jest.mock('@octokit/rest');
jest.mock('../../monitoring/UIMonitor');
jest.mock('../../debug/DebugService');

describe('GitHubService', () => {
  let service: GitHubService;
  let mockOctokit: jest.Mocked<Octokit>;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  let mockDebug: jest.Mocked<DebugService>;

  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_OWNER = 'test-owner';
    process.env.GITHUB_REPO = 'test-repo';

    mockOctokit = {
      pulls: {
        create: jest.fn()
      },
      issues: {
        createComment: jest.fn()
      },
      actions: {
        listWorkflowRuns: jest.fn()
      }
    } as any;

    (Octokit as jest.Mock).mockImplementation(() => mockOctokit);
    
    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockDebug = {
      log: jest.fn()
    } as any;

    (UIMonitor as jest.Mock).mockImplementation(() => mockUIMonitor);
    (DebugService as jest.Mock).mockImplementation(() => mockDebug);

    service = new GitHubService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_OWNER;
    delete process.env.GITHUB_REPO;
  });

  describe('createPullRequest', () => {
    it('creates a pull request successfully', async () => {
      const prParams = {
        title: 'Test PR',
        body: 'Test body',
        head: 'feature-branch',
        base: 'main'
      };

      const mockResponse = {
        data: {
          html_url: 'https://github.com/test/test/pull/1',
          number: 1
        }
      };

      mockOctokit.pulls.create.mockResolvedValue(mockResponse);

      const result = await service.createPullRequest(prParams);

      expect(result).toEqual({
        url: mockResponse.data.html_url,
        number: mockResponse.data.number
      });
      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalled();
      expect(mockDebug.log).toHaveBeenCalledWith('info', 'GitHubService', 'Creating pull request', prParams);
    });

    it('handles errors when creating pull request', async () => {
      const error = new Error('API error');
      mockOctokit.pulls.create.mockRejectedValue(error);

      await expect(service.createPullRequest({
        title: 'Test PR',
        body: 'Test body',
        head: 'feature-branch',
        base: 'main'
      })).rejects.toThrow(error);

      expect(mockDebug.log).toHaveBeenCalledWith('error', 'GitHubService', 'Failed to create pull request', { error });
    });
  });

  // Add more test cases for other methods...
}); 