import { Service } from 'typedi';
import { UIMonitor } from '../monitoring/UIMonitor';
import { DebugService } from './DebugService';
import { VSCodeExtensionService } from '../vscode/VSCodeExtensionService';
import { TeamService } from '../team/TeamService';

interface DebugSession {
  id: string;
  projectId: string;
  participants: string[];
  breakpoints: Array<{
    file: string;
    line: number;
    condition?: string;
  }>;
  variables: Array<{
    name: string;
    value: any;
    scope: string;
  }>;
  status: 'active' | 'paused' | 'ended';
  createdAt: Date;
  updatedAt: Date;
}

@Service()
export class CollaborativeDebugService {
  private uiMonitor: UIMonitor;
  private debug: DebugService;
  private vscodeService: VSCodeExtensionService;
  private teamService: TeamService;
  private activeSessions: Map<string, DebugSession>;

  constructor() {
    this.uiMonitor = new UIMonitor();
    this.debug = new DebugService();
    this.vscodeService = new VSCodeExtensionService();
    this.teamService = new TeamService();
    this.activeSessions = new Map();
  }

  async startSession(params: {
    projectId: string;
    participants: string[];
    initialBreakpoints?: DebugSession['breakpoints'];
  }): Promise<DebugSession> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'CollaborativeDebugService', 'Starting debug session', params);

      const session: DebugSession = {
        id: `debug_${Date.now()}`,
        projectId: params.projectId,
        participants: params.participants,
        breakpoints: params.initialBreakpoints || [],
        variables: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.activeSessions.set(session.id, session);

      // Notify all participants
      await Promise.all(params.participants.map(userId => 
        this.vscodeService.executeCommand('gobeze.startDebug', {
          sessionId: session.id,
          projectId: params.projectId
        })
      ));

      await this.uiMonitor.trackLoadingState({
        component: 'CollaborativeDebugService',
        duration: Date.now() - startTime,
        variant: 'startSession',
        hasOverlay: false
      });

      return session;
    } catch (error) {
      this.debug.log('error', 'CollaborativeDebugService', 'Failed to start debug session', { error });
      throw error;
    }
  }

  async addBreakpoint(params: {
    sessionId: string;
    file: string;
    line: number;
    condition?: string;
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'CollaborativeDebugService', 'Adding breakpoint', params);

      const session = this.activeSessions.get(params.sessionId);
      if (!session) {
        throw new Error(`Debug session ${params.sessionId} not found`);
      }

      session.breakpoints.push({
        file: params.file,
        line: params.line,
        condition: params.condition
      });

      session.updatedAt = new Date();

      // Notify all participants
      await Promise.all(session.participants.map(userId =>
        this.vscodeService.executeCommand('gobeze.addBreakpoint', params)
      ));

      await this.uiMonitor.trackLoadingState({
        component: 'CollaborativeDebugService',
        duration: Date.now() - startTime,
        variant: 'addBreakpoint',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'CollaborativeDebugService', 'Failed to add breakpoint', { error });
      throw error;
    }
  }

  async updateVariables(params: {
    sessionId: string;
    variables: DebugSession['variables'];
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'CollaborativeDebugService', 'Updating variables', params);

      const session = this.activeSessions.get(params.sessionId);
      if (!session) {
        throw new Error(`Debug session ${params.sessionId} not found`);
      }

      session.variables = params.variables;
      session.updatedAt = new Date();

      // Notify all participants
      await Promise.all(session.participants.map(userId =>
        this.vscodeService.executeCommand('gobeze.updateVariables', params)
      ));

      await this.uiMonitor.trackLoadingState({
        component: 'CollaborativeDebugService',
        duration: Date.now() - startTime,
        variant: 'updateVariables',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'CollaborativeDebugService', 'Failed to update variables', { error });
      throw error;
    }
  }

  async endSession(sessionId: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'CollaborativeDebugService', 'Ending debug session', { sessionId });

      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Debug session ${sessionId} not found`);
      }

      session.status = 'ended';
      session.updatedAt = new Date();

      // Notify all participants
      await Promise.all(session.participants.map(userId =>
        this.vscodeService.executeCommand('gobeze.endDebug', { sessionId })
      ));

      this.activeSessions.delete(sessionId);

      await this.uiMonitor.trackLoadingState({
        component: 'CollaborativeDebugService',
        duration: Date.now() - startTime,
        variant: 'endSession',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'CollaborativeDebugService', 'Failed to end debug session', { error });
      throw error;
    }
  }
} 