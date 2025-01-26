import { Service } from 'typedi';
import { UIMonitor } from '../monitoring/UIMonitor';
import { DebugService } from '../debug/DebugService';
import { GitHubService } from '../github/GitHubService';

interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
  permissions: string[];
}

interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  projects: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Service()
export class TeamService {
  private uiMonitor: UIMonitor;
  private debug: DebugService;
  private githubService: GitHubService;

  constructor() {
    this.uiMonitor = new UIMonitor();
    this.debug = new DebugService();
    this.githubService = new GitHubService();
  }

  async createTeam(params: {
    name: string;
    description?: string;
    initialMembers?: Partial<TeamMember>[];
  }): Promise<Team> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'TeamService', 'Creating team', params);

      // Here we would integrate with a database
      const team: Team = {
        id: `team_${Date.now()}`,
        name: params.name,
        description: params.description,
        members: params.initialMembers?.map(member => ({
          id: `member_${Date.now()}`,
          email: member.email!,
          role: member.role || 'viewer',
          permissions: member.permissions || []
        })) || [],
        projects: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.uiMonitor.trackLoadingState({
        component: 'TeamService',
        duration: Date.now() - startTime,
        variant: 'createTeam',
        hasOverlay: false
      });

      return team;
    } catch (error) {
      this.debug.log('error', 'TeamService', 'Failed to create team', { error });
      throw error;
    }
  }

  async addTeamMember(params: {
    teamId: string;
    email: string;
    role?: TeamMember['role'];
    permissions?: string[];
  }): Promise<TeamMember> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'TeamService', 'Adding team member', params);

      const member: TeamMember = {
        id: `member_${Date.now()}`,
        email: params.email,
        role: params.role || 'viewer',
        permissions: params.permissions || []
      };

      // Here we would update the database

      await this.uiMonitor.trackLoadingState({
        component: 'TeamService',
        duration: Date.now() - startTime,
        variant: 'addTeamMember',
        hasOverlay: false
      });

      return member;
    } catch (error) {
      this.debug.log('error', 'TeamService', 'Failed to add team member', { error });
      throw error;
    }
  }

  async updateMemberRole(params: {
    teamId: string;
    memberId: string;
    role: TeamMember['role'];
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'TeamService', 'Updating member role', params);

      // Here we would update the database

      await this.uiMonitor.trackLoadingState({
        component: 'TeamService',
        duration: Date.now() - startTime,
        variant: 'updateMemberRole',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'TeamService', 'Failed to update member role', { error });
      throw error;
    }
  }

  async addProjectToTeam(params: {
    teamId: string;
    projectId: string;
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'TeamService', 'Adding project to team', params);

      // Here we would update the database and GitHub repository permissions
      await this.githubService.addComment({
        issueNumber: parseInt(params.projectId),
        body: `Project added to team ${params.teamId}`
      });

      await this.uiMonitor.trackLoadingState({
        component: 'TeamService',
        duration: Date.now() - startTime,
        variant: 'addProjectToTeam',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'TeamService', 'Failed to add project to team', { error });
      throw error;
    }
  }
} 