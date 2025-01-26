import * as vscode from 'vscode';
import { Service } from 'typedi';
import { DebugService } from '../../../app/lib/services/debug/DebugService';

@Service()
export class ExtensionService {
  private context!: vscode.ExtensionContext;
  private debug: DebugService;

  constructor() {
    this.debug = new DebugService();
  }

  async initialize(context: vscode.ExtensionContext): Promise<void> {
    this.context = context;
    this.debug.log('info', 'ExtensionService', 'Service initialized');
  }

  async openFile(uri: vscode.Uri): Promise<void> {
    try {
      this.debug.log('info', 'ExtensionService', 'Opening file', { uri });
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      this.debug.log('error', 'ExtensionService', 'Failed to open file', { error });
      throw error;
    }
  }

  async runTests(testPattern?: string): Promise<void> {
    try {
      this.debug.log('info', 'ExtensionService', 'Running tests', { testPattern });
      
      const terminal = vscode.window.createTerminal('Gobeze Tests');
      terminal.sendText(`npm test ${testPattern || ''}`);
      terminal.show();
    } catch (error) {
      this.debug.log('error', 'ExtensionService', 'Failed to run tests', { error });
      throw error;
    }
  }

  async startDebug(config?: vscode.DebugConfiguration): Promise<void> {
    try {
      this.debug.log('info', 'ExtensionService', 'Starting debug session', { config });
      
      if (!config) {
        await vscode.debug.startDebugging(undefined, {
          type: 'node',
          request: 'launch',
          name: 'Debug Current File',
          program: '${file}'
        });
      } else {
        await vscode.debug.startDebugging(undefined, config);
      }
    } catch (error) {
      this.debug.log('error', 'ExtensionService', 'Failed to start debug session', { error });
      throw error;
    }
  }
} 