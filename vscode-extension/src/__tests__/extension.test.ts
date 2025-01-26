import * as vscode from 'vscode';
import { Container } from 'typedi';
import { activate, deactivate } from '../extension';
import { ExtensionService } from '../services/ExtensionService';
import { ExtensionMonitor } from '../services/ExtensionMonitor';
import { DebugService } from '../../../app/lib/services/debug/DebugService';

jest.mock('vscode');
jest.mock('../services/ExtensionService');
jest.mock('../services/ExtensionMonitor');
jest.mock('../../../app/lib/services/debug/DebugService');

describe('Extension', () => {
  let mockContext: vscode.ExtensionContext;
  let mockExtensionService: jest.Mocked<ExtensionService>;
  let mockMonitor: jest.Mocked<ExtensionMonitor>;
  let mockDebug: jest.Mocked<DebugService>;

  beforeEach(() => {
    mockContext = {
      subscriptions: []
    } as any;

    mockExtensionService = {
      initialize: jest.fn(),
      openFile: jest.fn(),
      runTests: jest.fn(),
      startDebug: jest.fn()
    } as any;

    mockMonitor = {
      trackLoadingState: jest.fn()
    } as any;

    mockDebug = {
      log: jest.fn()
    } as any;

    (ExtensionService as jest.Mock).mockImplementation(() => mockExtensionService);
    (ExtensionMonitor as jest.Mock).mockImplementation(() => mockMonitor);
    (DebugService as jest.Mock).mockImplementation(() => mockDebug);

    Container.set(ExtensionService, mockExtensionService);
  });

  afterEach(() => {
    Container.reset();
    jest.clearAllMocks();
  });

  describe('activate', () => {
    it('initializes extension successfully', async () => {
      await activate(mockContext);

      expect(mockExtensionService.initialize).toHaveBeenCalledWith(mockContext);
      expect(mockMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'Extension',
        duration: expect.any(Number),
        variant: 'activate',
        hasOverlay: false
      });
      expect(mockDebug.log).toHaveBeenCalledWith(
        'info',
        'Extension',
        'Extension activated successfully'
      );
    });

    it('registers commands', async () => {
      await activate(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(3);
      expect(mockContext.subscriptions).toHaveLength(3);
    });

    it('handles activation errors', async () => {
      const error = new Error('Activation failed');
      mockExtensionService.initialize.mockRejectedValue(error);

      await expect(activate(mockContext)).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'Extension',
        'Failed to activate extension',
        { error }
      );
    });
  });

  describe('deactivate', () => {
    it('logs deactivation', () => {
      deactivate();

      expect(mockDebug.log).toHaveBeenCalledWith(
        'info',
        'Extension',
        'Extension deactivated'
      );
    });
  });
}); 