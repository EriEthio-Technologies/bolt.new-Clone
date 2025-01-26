import { Service } from 'typedi';
import { UIMonitor } from '../monitoring/UIMonitor';
import { DebugService } from '../debug/DebugService';
import { VSCodeExtensionService } from '../vscode/VSCodeExtensionService';
import { TeamService } from '../team/TeamService';

interface CursorPosition {
  line: number;
  column: number;
}

interface Selection {
  start: CursorPosition;
  end: CursorPosition;
}

interface ParticipantState {
  userId: string;
  file?: string;
  cursor?: CursorPosition;
  selection?: Selection;
  isTyping: boolean;
}

interface PairSession {
  id: string;
  projectId: string;
  participants: ParticipantState[];
  driver?: string; // userId of current driver
  status: 'active' | 'paused' | 'ended';
  createdAt: Date;
  updatedAt: Date;
}

@Service()
export class PairProgrammingService {
  private uiMonitor: UIMonitor;
  private debug: DebugService;
  private vscodeService: VSCodeExtensionService;
  private teamService: TeamService;
  private activeSessions: Map<string, PairSession>;

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
    initialDriver?: string;
  }): Promise<PairSession> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'PairProgrammingService', 'Starting pair session', params);

      const session: PairSession = {
        id: `pair_${Date.now()}`,
        projectId: params.projectId,
        participants: params.participants.map(userId => ({
          userId,
          isTyping: false
        })),
        driver: params.initialDriver,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.activeSessions.set(session.id, session);

      // Notify all participants
      await Promise.all(params.participants.map(userId =>
        this.vscodeService.executeCommand('gobeze.startPairSession', {
          sessionId: session.id,
          projectId: params.projectId,
          isDriver: userId === params.initialDriver
        })
      ));

      await this.uiMonitor.trackLoadingState({
        component: 'PairProgrammingService',
        duration: Date.now() - startTime,
        variant: 'startSession',
        hasOverlay: false
      });

      return session;
    } catch (error) {
      this.debug.log('error', 'PairProgrammingService', 'Failed to start pair session', { error });
      throw error;
    }
  }

  async updateParticipantState(params: {
    sessionId: string;
    userId: string;
    file?: string;
    cursor?: CursorPosition;
    selection?: Selection;
    isTyping?: boolean;
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'PairProgrammingService', 'Updating participant state', params);

      const session = this.activeSessions.get(params.sessionId);
      if (!session) {
        throw new Error(`Pair session ${params.sessionId} not found`);
      }

      const participant = session.participants.find(p => p.userId === params.userId);
      if (!participant) {
        throw new Error(`Participant ${params.userId} not found in session`);
      }

      Object.assign(participant, {
        file: params.file ?? participant.file,
        cursor: params.cursor ?? participant.cursor,
        selection: params.selection ?? participant.selection,
        isTyping: params.isTyping ?? participant.isTyping
      });

      session.updatedAt = new Date();

      // Notify other participants
      await Promise.all(
        session.participants
          .filter(p => p.userId !== params.userId)
          .map(p => this.vscodeService.executeCommand('gobeze.updateParticipantState', {
            sessionId: params.sessionId,
            participantState: participant
          }))
      );

      await this.uiMonitor.trackLoadingState({
        component: 'PairProgrammingService',
        duration: Date.now() - startTime,
        variant: 'updateParticipantState',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'PairProgrammingService', 'Failed to update participant state', { error });
      throw error;
    }
  }

  async switchDriver(params: {
    sessionId: string;
    newDriver: string;
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'PairProgrammingService', 'Switching driver', params);

      const session = this.activeSessions.get(params.sessionId);
      if (!session) {
        throw new Error(`Pair session ${params.sessionId} not found`);
      }

      if (!session.participants.some(p => p.userId === params.newDriver)) {
        throw new Error(`User ${params.newDriver} is not a participant in the session`);
      }

      session.driver = params.newDriver;
      session.updatedAt = new Date();

      // Notify all participants
      await Promise.all(session.participants.map(p =>
        this.vscodeService.executeCommand('gobeze.switchDriver', {
          sessionId: params.sessionId,
          newDriver: params.newDriver,
          isDriver: p.userId === params.newDriver
        })
      ));

      await this.uiMonitor.trackLoadingState({
        component: 'PairProgrammingService',
        duration: Date.now() - startTime,
        variant: 'switchDriver',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'PairProgrammingService', 'Failed to switch driver', { error });
      throw error;
    }
  }

  async endSession(sessionId: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'PairProgrammingService', 'Ending pair session', { sessionId });

      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Pair session ${sessionId} not found`);
      }

      session.status = 'ended';
      session.updatedAt = new Date();

      // Notify all participants
      await Promise.all(session.participants.map(p =>
        this.vscodeService.executeCommand('gobeze.endPairSession', { sessionId })
      ));

      this.activeSessions.delete(sessionId);

      await this.uiMonitor.trackLoadingState({
        component: 'PairProgrammingService',
        duration: Date.now() - startTime,
        variant: 'endSession',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'PairProgrammingService', 'Failed to end pair session', { error });
      throw error;
    }
  }
} 