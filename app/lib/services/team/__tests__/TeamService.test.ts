import { TeamService } from '../TeamService';
import { UIMonitor } from '../../monitoring/UIMonitor';
import { DebugService } from '../../debug/DebugService';
import { GitHubService } from '../../github/GitHubService';

jest.mock('../../monitoring/UIMonitor');
jest.mock('../../debug/DebugService');
jest.mock('../../github/GitHubService');

describe('TeamService', () => {
  let service: TeamService;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  let mockDebug: jest.Mocked<DebugService>;
  let mockGitHubService: jest.Mocked<GitHubService>;

  beforeEach(() => {
    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockDebug = {
      log: jest.fn()
    } as any;

    mockGitHubService = {
      addComment: jest.fn()
    } as any;

    (UIMonitor as jest.Mock).mockImplementation(() => mockUIMonitor);
    (DebugService as jest.Mock).mockImplementation(() => mockDebug);
    (GitHubService as jest.Mock).mockImplementation(() => mockGitHubService);

    service = new TeamService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTeam', () => {
    it('creates team successfully', async () => {
      const params = {
        name: 'Test Team',
        description: 'Test Description',
        initialMembers: [
          { email: 'test@example.com', role: 'admin' as const }
        ]
      };

      const result = await service.createTeam(params);

      expect(result).toMatchObject({
        name: params.name,
        description: params.description,
        members: expect.arrayContaining([
          expect.objectContaining({
            email: 'test@example.com',
            role: 'admin'
          })
        ])
      });

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'TeamService',
        duration: expect.any(Number),
        variant: 'createTeam',
        hasOverlay: false
      });
    });

    it('handles team creation errors', async () => {
      const error = new Error('Failed to create team');
      mockUIMonitor.trackLoadingState.mockRejectedValue(error);

      await expect(service.createTeam({ name: 'Test Team' })).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'TeamService',
        'Failed to create team',
        { error }
      );
    });
  });

  describe('addTeamMember', () => {
    it('adds team member successfully', async () => {
      const params = {
        teamId: 'team_1',
        email: 'test@example.com',
        role: 'developer' as const
      };

      const result = await service.addTeamMember(params);

      expect(result).toMatchObject({
        email: params.email,
        role: params.role
      });

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'TeamService',
        duration: expect.any(Number),
        variant: 'addTeamMember',
        hasOverlay: false
      });
    });
  });

  describe('addProjectToTeam', () => {
    it('adds project to team successfully', async () => {
      const params = {
        teamId: 'team_1',
        projectId: '123'
      };

      await service.addProjectToTeam(params);

      expect(mockGitHubService.addComment).toHaveBeenCalledWith({
        issueNumber: 123,
        body: expect.stringContaining('Project added to team')
      });

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'TeamService',
        duration: expect.any(Number),
        variant: 'addProjectToTeam',
        hasOverlay: false
      });
    });
  });
}); 