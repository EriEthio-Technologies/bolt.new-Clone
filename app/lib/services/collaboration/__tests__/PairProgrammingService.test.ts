import { PairProgrammingService } from '../PairProgrammingService';
import { UIMonitor } from '../../monitoring/UIMonitor';
import { DebugService } from '../../debug/DebugService';
import { VSCodeExtensionService } from '../../vscode/VSCodeExtensionService';
import { TeamService } from '../../team/TeamService';

jest.mock('../../monitoring/UIMonitor');
jest.mock('../../debug/DebugService');
jest.mock('../../vscode/VSCodeExtensionService');
jest.mock('../../team/TeamService');

describe('PairProgrammingService', () => {
  let service: PairProgrammingService;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  let mockDebug: jest.Mocked<DebugService>;
  let mockVSCodeService: jest.Mocked<VSCodeExtensionService>;
  let mockTeamService: jest.Mocked<TeamService>;

  beforeEach(() => {
    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockDebug = {
      log: jest.fn()
    } as any;

    mockVSCodeService = {
      executeCommand: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockTeamService = {} as any;

    (UIMonitor as jest.Mock).mockImplementation(() => mockUIMonitor);
    (DebugService as jest.Mock).mockImplementation(() => mockDebug);
    (VSCodeExtensionService as jest.Mock).mockImplementation(() => mockVSCodeService);
    (TeamService as jest.Mock).mockImplementation(() => mockTeamService);

    service = new PairProgrammingService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    const startParams = {
      projectId: 'project1',
      participants: ['user1', 'user2'],
      initialDriver: 'user1'
    };

    it('starts pair session successfully', async () => {
      const session = await service.startSession(startParams);

      expect(session).toMatchObject({
        projectId: startParams.projectId,
        participants: expect.arrayContaining([
          expect.objectContaining({ userId: 'user1', isTyping: false }),
          expect.objectContaining({ userId: 'user2', isTyping: false })
        ]),
        driver: startParams.initialDriver,
        status: 'active'
      });

      expect(mockVSCodeService.executeCommand).toHaveBeenCalledTimes(2);
      expect(mockVSCodeService.executeCommand).toHaveBeenCalledWith(
        'gobeze.startPairSession',
        expect.objectContaining({
          projectId: startParams.projectId,
          isDriver: true
        })
      );

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'PairProgrammingService',
        duration: expect.any(Number),
        variant: 'startSession',
        hasOverlay: false
      });
    });

    it('handles session start errors', async () => {
      const error = new Error('Failed to start session');
      mockVSCodeService.executeCommand.mockRejectedValue(error);

      await expect(service.startSession(startParams)).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'PairProgrammingService',
        'Failed to start pair session',
        { error }
      );
    });
  });

  describe('updateParticipantState', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await service.startSession({
        projectId: 'project1',
        participants: ['user1', 'user2']
      });
      sessionId = session.id;
    });

    it('updates participant state successfully', async () => {
      const stateParams = {
        sessionId,
        userId: 'user1',
        file: 'test.ts',
        cursor: { line: 10, column: 5 },
        isTyping: true
      };

      await service.updateParticipantState(stateParams);

      expect(mockVSCodeService.executeCommand).toHaveBeenCalledWith(
        'gobeze.updateParticipantState',
        expect.objectContaining({
          participantState: expect.objectContaining({
            userId: 'user1',
            file: 'test.ts',
            cursor: { line: 10, column: 5 },
            isTyping: true
          })
        })
      );
    });

    it('throws error for invalid session', async () => {
      await expect(service.updateParticipantState({
        sessionId: 'invalid',
        userId: 'user1',
        isTyping: true
      })).rejects.toThrow('Pair session invalid not found');
    });
  });

  describe('switchDriver', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await service.startSession({
        projectId: 'project1',
        participants: ['user1', 'user2'],
        initialDriver: 'user1'
      });
      sessionId = session.id;
    });

    it('switches driver successfully', async () => {
      await service.switchDriver({
        sessionId,
        newDriver: 'user2'
      });

      expect(mockVSCodeService.executeCommand).toHaveBeenCalledWith(
        'gobeze.switchDriver',
        expect.objectContaining({
          newDriver: 'user2',
          isDriver: true
        })
      );
    });

    it('throws error for invalid participant', async () => {
      await expect(service.switchDriver({
        sessionId,
        newDriver: 'user3'
      })).rejects.toThrow('User user3 is not a participant in the session');
    });
  });

  describe('endSession', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await service.startSession({
        projectId: 'project1',
        participants: ['user1', 'user2']
      });
      sessionId = session.id;
    });

    it('ends session successfully', async () => {
      await service.endSession(sessionId);

      expect(mockVSCodeService.executeCommand).toHaveBeenCalledWith(
        'gobeze.endPairSession',
        { sessionId }
      );

      // Should throw error when trying to access ended session
      await expect(service.endSession(sessionId))
        .rejects.toThrow(`Pair session ${sessionId} not found`);
    });
  });
}); 