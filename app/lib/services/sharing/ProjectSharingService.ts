import { Service } from 'typedi';
import { UIMonitor } from '../monitoring/UIMonitor';
import { DebugService } from '../debug/DebugService';
import { RBACService } from '../auth/RBACService';
import { TeamService } from '../team/TeamService';

interface ShareSettings {
  projectId: string;
  userId: string;
  role: 'viewer' | 'developer' | 'admin';
  expiresAt?: Date;
}

@Service()
export class ProjectSharingService {
  private uiMonitor: UIMonitor;
  private debug: DebugService;
  private rbacService: RBACService;
  private teamService: TeamService;

  constructor() {
    this.uiMonitor = new UIMonitor();
    this.debug = new DebugService();
    this.rbacService = new RBACService();
    this.teamService = new TeamService();
  }

  async shareProject(params: {
    projectId: string;
    userId: string;
    role: ShareSettings['role'];
    expiresAt?: Date;
  }): Promise<ShareSettings> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'ProjectSharingService', 'Sharing project', params);

      // Verify user has permission to share
      const hasPermission = await this.rbacService.checkPermission({
        userId: params.userId,
        roleId: 'admin',
        resource: `project:${params.projectId}`,
        action: 'share'
      });

      if (!hasPermission) {
        throw new Error('User does not have permission to share project');
      }

      const settings: ShareSettings = {
        projectId: params.projectId,
        userId: params.userId,
        role: params.role,
        expiresAt: params.expiresAt
      };

      // Here we would save the share settings to the database

      await this.uiMonitor.trackLoadingState({
        component: 'ProjectSharingService',
        duration: Date.now() - startTime,
        variant: 'shareProject',
        hasOverlay: false
      });

      return settings;
    } catch (error) {
      this.debug.log('error', 'ProjectSharingService', 'Failed to share project', { error });
      throw error;
    }
  }

  async revokeAccess(params: {
    projectId: string;
    userId: string;
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'ProjectSharingService', 'Revoking access', params);

      // Here we would remove the share settings from the database

      await this.uiMonitor.trackLoadingState({
        component: 'ProjectSharingService',
        duration: Date.now() - startTime,
        variant: 'revokeAccess',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'ProjectSharingService', 'Failed to revoke access', { error });
      throw error;
    }
  }

  async shareWithTeam(params: {
    projectId: string;
    teamId: string;
    role: ShareSettings['role'];
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'ProjectSharingService', 'Sharing with team', params);

      await this.teamService.addProjectToTeam({
        teamId: params.teamId,
        projectId: params.projectId
      });

      await this.uiMonitor.trackLoadingState({
        component: 'ProjectSharingService',
        duration: Date.now() - startTime,
        variant: 'shareWithTeam',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'ProjectSharingService', 'Failed to share with team', { error });
      throw error;
    }
  }
} 