import { VSCodeExtensionService } from '../VSCodeExtensionService';
import { UIMonitor } from '../../monitoring/UIMonitor';
import { DebugService } from '../../debug/DebugService';

jest.mock('../../monitoring/UIMonitor');
jest.mock('../../debug/DebugService');

describe('VSCodeExtensionService', () => {
  let service: VSCodeExtensionService;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  let mockDebug: jest.Mocked<DebugService>;

  beforeEach(() => {
    process.env.VSCODE_EXTENSION_ENABLED = 'true';

    mockUIMonitor = {
      trackLoadingState: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockDebug = {
      log: jest.fn()
    } as any;

    (UIMonitor as jest.Mock).mockImplementation(() => mockUIMonitor);
    (DebugService as jest.Mock).mockImplementation(() => mockDebug);

    service = new VSCodeExtensionService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.VSCODE_EXTENSION_ENABLED;
  });

  describe('executeCommand', () => {
    it('executes command successfully', async () => {
      await service.executeCommand('openFile', 'test.ts');

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'VSCodeExtensionService',
        duration: expect.any(Number),
        variant: 'executeCommand',
        hasOverlay: false
      });
      expect(mockDebug.log).toHaveBeenCalledWith(
        'info',
        'VSCodeExtensionService',
        'Executing command',
        expect.any(Object)
      );
    });

    it('handles non-existent command', async () => {
      await expect(service.executeCommand('nonExistent'))
        .rejects.toThrow('Command nonExistent not found');

      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'VSCodeExtensionService',
        'Failed to execute command',
        expect.any(Object)
      );
    });
  });

  describe('registerCommand', () => {
    it('registers command successfully', async () => {
      const command = {
        id: 'testCommand',
        title: 'Test Command',
        shortcut: 'ctrl+shift+t'
      };

      await service.registerCommand(command);

      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'VSCodeExtensionService',
        duration: expect.any(Number),
        variant: 'registerCommand',
        hasOverlay: false
      });
      expect(mockDebug.log).toHaveBeenCalledWith(
        'info',
        'VSCodeExtensionService',
        'Registering command',
        command
      );
    });

    it('handles registration errors', async () => {
      jest.spyOn(service as any, 'registerWithExtension')
        .mockRejectedValue(new Error('Registration failed'));

      await expect(service.registerCommand({
        id: 'testCommand',
        title: 'Test Command'
      })).rejects.toThrow('Registration failed');

      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'VSCodeExtensionService',
        'Failed to register command',
        expect.any(Object)
      );
    });
  });
}); 