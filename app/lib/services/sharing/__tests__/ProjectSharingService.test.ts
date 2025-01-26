import { ProjectSharingService } from '../ProjectSharingService';
import { UIMonitor } from '../../monitoring/UIMonitor';
import { DebugService } from '../../debug/DebugService';
import { RBACService } from '../../auth/RBACService';
import { TeamService } from '../../team/TeamService';

jest.mock('../../monitoring/UIMonitor');
jest.mock('../../debug/DebugService');
jest.mock('../../auth/RBACService');
jest.mock('../../team/TeamService');

describe('ProjectSharingService', () => {
  let service: ProjectSharingService;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  let mockDebug: jest.Mocked<DebugService>;
  let mockRBACService: jest.Mocked<RBACService>;
  let mockTeamService: jest.Mocked<TeamService>;

  beforeEach(() => {
    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockDebug = {
      log: jest.fn()
    } as any;

    mockRBACService = {
      checkPermission: jest.fn().mockResolvedValue(true)
    } as any;

    mockTeamService = {
      addProjectToTeam: jest.fn()
    } as any;

    (UIMonitor as jest.Mock).mockImplementation(() => mockUIMonitor);
    (DebugService as jest.Mock).mockImplementation(() => mockDebug);
    (RBACService as jest.Mock).mockImplementation(() => mockRBACService);
    (TeamService as jest.Mock).mockImplementation(() => mockTeamService);

    service = new ProjectSharingService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('shareProject', () => {
    const shareParams = {
      projectId: 'project1',
      userId: 'user1',
      role: 'developer' as const,
      expiresAt: new Date('2024-12-31')
    };

    it('shares project successfully', async () => {
      const result = await service.shareProject(shareParams);

      expect(result).toEqual(shareParams);
      expect(mockRBACService.checkPermission).toHaveBeenCalledWith({
        userId: shareParams.userId,
        roleId: 'admin',
        resource: 'project:project1',
        action: 'share'
      });
      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'ProjectSharingService',
        duration: expect.any(Number),
        variant: 'shareProject',
        hasOverlay: false
      });
    });

    it('throws error when user lacks permission', async () => {
      mockRBACService.checkPermission.mockResolvedValue(false);

      await expect(service.shareProject(shareParams))
        .rejects.toThrow('User does not have permission to share project');

      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'ProjectSharingService',
        'Failed to share project',
        expect.any(Object)
      );
    });

    it('handles sharing errors', async () => {
      const error = new Error('Failed to share');
      mockUIMonitor.trackLoadingState.mockRejectedValue(error);

      await expect(service.shareProject(shareParams)).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'ProjectSharingService',
        'Failed to share project',
        { error }
      );
    });
  });

  describe('revokeAccess', () => {
    const revokeParams = {
      projectId: 'project1',
      userId: 'user1'
    };

    it('revokes access successfully', async () => {
      await service.revokeAccess(revokeParams);

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'ProjectSharingService',
        duration: expect.any(Number),
        variant: 'revokeAccess',
        hasOverlay: false
      });
    });

    it('handles revoke errors', async () => {
      const error = new Error('Failed to revoke');
      mockUIMonitor.trackLoadingState.mockRejectedValue(error);

      await expect(service.revokeAccess(revokeParams)).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'ProjectSharingService',
        'Failed to revoke access',
        { error }
      );
    });
  });

  describe('shareWithTeam', () => {
    const teamShareParams = {
      projectId: 'project1',
      teamId: 'team1',
      role: 'developer' as const
    };

    it('shares with team successfully', async () => {
      await service.shareWithTeam(teamShareParams);

      expect(mockTeamService.addProjectToTeam).toHaveBeenCalledWith({
        teamId: teamShareParams.teamId,
        projectId: teamShareParams.projectId
      });
      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'ProjectSharingService',
        duration: expect.any(Number),
        variant: 'shareWithTeam',
        hasOverlay: false
      });
    });

    it('handles team sharing errors', async () => {
      const error = new Error('Failed to share with team');
      mockTeamService.addProjectToTeam.mockRejectedValue(error);

      await expect(service.shareWithTeam(teamShareParams)).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'ProjectSharingService',
        'Failed to share with team',
        { error }
      );
    });
  });
}); 