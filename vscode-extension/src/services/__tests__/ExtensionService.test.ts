import * as vscode from 'vscode';
import { ExtensionService } from '../ExtensionService';
import { DebugService } from '../../../../app/lib/services/debug/DebugService';

jest.mock('vscode');
jest.mock('../../../../app/lib/services/debug/DebugService');

describe('ExtensionService', () => {
  let service: ExtensionService;
  let mockDebug: jest.Mocked<DebugService>;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockDebug = {
      log: jest.fn()
    } as any;

    (DebugService as jest.Mock).mockImplementation(() => mockDebug);

    mockContext = {
      subscriptions: []
    } as any;

    service = new ExtensionService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('initializes service successfully', async () => {
      await service.initialize(mockContext);

      expect(mockDebug.log).toHaveBeenCalledWith(
        'info',
        'ExtensionService',
        'Service initialized'
      );
    });
  });

  describe('openFile', () => {
    it('opens file successfully', async () => {
      const mockUri = { fsPath: '/test/file.ts' } as vscode.Uri;
      const mockDocument = {} as vscode.TextDocument;

      (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);

      await service.openFile(mockUri);

      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri);
      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'info',
        'ExtensionService',
        'Opening file',
        { uri: mockUri }
      );
    });

    it('handles file open errors', async () => {
      const error = new Error('Failed to open file');
      const mockUri = { fsPath: '/test/file.ts' } as vscode.Uri;

      (vscode.workspace.openTextDocument as jest.Mock).mockRejectedValue(error);

      await expect(service.openFile(mockUri)).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'ExtensionService',
        'Failed to open file',
        { error }
      );
    });
  });

  describe('runTests', () => {
    it('runs tests with pattern', async () => {
      const mockTerminal = {
        sendText: jest.fn(),
        show: jest.fn()
      };

      (vscode.window.createTerminal as jest.Mock).mockReturnValue(mockTerminal);

      await service.runTests('test-pattern');

      expect(vscode.window.createTerminal).toHaveBeenCalledWith('Gobeze Tests');
      expect(mockTerminal.sendText).toHaveBeenCalledWith('npm test test-pattern');
      expect(mockTerminal.show).toHaveBeenCalled();
      expect(mockDebug.log).toHaveBeenCalledWith(
        'info',
        'ExtensionService',
        'Running tests',
        { testPattern: 'test-pattern' }
      );
    });

    it('handles test run errors', async () => {
      const error = new Error('Failed to run tests');

      (vscode.window.createTerminal as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(service.runTests()).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'ExtensionService',
        'Failed to run tests',
        { error }
      );
    });
  });

  describe('startDebug', () => {
    it('starts debugging with default config', async () => {
      await service.startDebug();

      expect(vscode.debug.startDebugging).toHaveBeenCalledWith(undefined, {
        type: 'node',
        request: 'launch',
        name: 'Debug Current File',
        program: '${file}'
      });
      expect(mockDebug.log).toHaveBeenCalledWith(
        'info',
        'ExtensionService',
        'Starting debug session',
        { config: undefined }
      );
    });

    it('starts debugging with custom config', async () => {
      const config = {
        type: 'node',
        request: 'attach',
        name: 'Custom Debug'
      };

      await service.startDebug(config);

      expect(vscode.debug.startDebugging).toHaveBeenCalledWith(undefined, config);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'info',
        'ExtensionService',
        'Starting debug session',
        { config }
      );
    });

    it('handles debug start errors', async () => {
      const error = new Error('Failed to start debugging');

      (vscode.debug.startDebugging as jest.Mock).mockRejectedValue(error);

      await expect(service.startDebug()).rejects.toThrow(error);
      expect(mockDebug.log).toHaveBeenCalledWith(
        'error',
        'ExtensionService',
        'Failed to start debug session',
        { error }
      );
    });
  });
}); 