import { CollaborativeDebugService } from '../CollaborativeDebugService';
import { UIMonitor } from '../../monitoring/UIMonitor';
import { DebugService } from '../DebugService';
import { VSCodeExtensionService } from '../../vscode/VSCodeExtensionService';
import { TeamService } from '../../team/TeamService';

jest.mock('../../monitoring/UIMonitor');
jest.mock('../DebugService');
jest.mock('../../vscode/VSCodeExtensionService');
jest.mock('../../team/TeamService');

describe('CollaborativeDebugService', () => {
  let service: CollaborativeDebugService;
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

    service = new CollaborativeDebugService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    const startParams = {
      projectId: 'project1',
      participants: ['user1', 'user2'],
      initialBreakpoints: [{ file: 'test.ts', line: 10 }]
    };

    it('starts debug session successfully', async () => {
      const session = await service.startSession(startParams);

      expect(session).toMatchObject({
        projectId: startParams.projectId,
        participants: startParams.participants,
        breakpoints: startParams.initialBreakpoints,
        status: 'active'
      });

      expect(mockVSCodeService.executeCommand).toHaveBeenCalledTimes(2);
      expect(mockVSCodeService.executeCommand).toHaveBeenCalledWith(
        'gobeze.startDebug',
        expect.objectContaining({
          projectId: startParams.projectId
        })
      );

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'CollaborativeDebugService',
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
        'CollaborativeDebugService',
        'Failed to start debug session',
        { error }
      );
    });
  });

  describe('addBreakpoint', () => {
    const breakpointParams = {
      sessionId: 'debug_123',
      file: 'test.ts',
      line: 15,
      condition: 'x > 0'
    };

    beforeEach(async () => {
      // Create an active session first
      await service.startSession({
        projectId: 'project1',
        participants: ['user1', 'user2']
      });
    });

    it('adds breakpoint successfully', async () => {
      await service.addBreakpoint(breakpointParams);

      expect(mockVSCodeService.executeCommand).toHaveBeenCalledWith(
        'gobeze.addBreakpoint',
        breakpointParams
      );

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'CollaborativeDebugService',
        duration: expect.any(Number),
        variant: 'addBreakpoint',
        hasOverlay: false
      });
    });

    it('throws error for invalid session', async () => {
      await expect(service.addBreakpoint({
        ...breakpointParams,
        sessionId: 'invalid'
      })).rejects.toThrow('Debug session invalid not found');
    });
  });

  describe('updateVariables', () => {
    const variables = [
      { name: 'x', value: 42, scope: 'local' }
    ];

    beforeEach(async () => {
      await service.startSession({
        projectId: 'project1',
        participants: ['user1']
      });
    });

    it('updates variables successfully', async () => {
      await service.updateVariables({
        sessionId: expect.any(String),
        variables
      });

      expect(mockVSCodeService.executeCommand).toHaveBeenCalledWith(
        'gobeze.updateVariables',
        expect.objectContaining({ variables })
      );

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'CollaborativeDebugService',
        duration: expect.any(Number),
        variant: 'updateVariables',
        hasOverlay: false
      });
    });
  });

  describe('endSession', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await service.startSession({
        projectId: 'project1',
        participants: ['user1']
      });
      sessionId = session.id;
    });

    it('ends session successfully', async () => {
      await service.endSession(sessionId);

      expect(mockVSCodeService.executeCommand).toHaveBeenCalledWith(
        'gobeze.endDebug',
        { sessionId }
      );

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'CollaborativeDebugService',
        duration: expect.any(Number),
        variant: 'endSession',
        hasOverlay: false
      });

      // Should throw error when trying to access ended session
      await expect(service.endSession(sessionId))
        .rejects.toThrow(`Debug session ${sessionId} not found`);
    });
  });
}); 