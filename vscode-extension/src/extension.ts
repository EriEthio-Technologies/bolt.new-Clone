import * as vscode from 'vscode';
import { Container } from 'typedi';
import { ExtensionService } from './services/ExtensionService';
import { ExtensionMonitor } from './services/ExtensionMonitor';
import { DebugService } from '../../app/lib/services/debug/DebugService';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const monitor = new ExtensionMonitor();
  const debug = new DebugService();
  const startTime = Date.now();

  try {
    debug.log('info', 'Extension', 'Activating extension');

    const extensionService = Container.get(ExtensionService);
    await extensionService.initialize(context);

    registerCommands(context, extensionService, monitor, debug);

    await monitor.trackLoadingState({
      component: 'Extension',
      duration: Date.now() - startTime,
      variant: 'activate',
      hasOverlay: false
    });

    debug.log('info', 'Extension', 'Extension activated successfully');
  } catch (error) {
    debug.log('error', 'Extension', 'Failed to activate extension', { error });
    throw error;
  }
}

function registerCommands(
  context: vscode.ExtensionContext,
  service: ExtensionService,
  monitor: ExtensionMonitor,
  debug: DebugService
): void {
  const commands = [
    {
      id: 'gobeze.openFile',
      handler: service.openFile.bind(service)
    },
    {
      id: 'gobeze.runTests',
      handler: service.runTests.bind(service)
    },
    {
      id: 'gobeze.startDebug',
      handler: service.startDebug.bind(service)
    }
  ];

  for (const { id, handler } of commands) {
    const disposable = vscode.commands.registerCommand(id, async (...args: any[]) => {
      const startTime = Date.now();

      try {
        debug.log('info', 'Extension', `Executing command: ${id}`, { args });
        await handler(...args);

        await monitor.trackLoadingState({
          component: 'Extension',
          duration: Date.now() - startTime,
          variant: `command_${id}`,
          hasOverlay: false
        });
      } catch (error) {
        debug.log('error', 'Extension', `Command ${id} failed`, { error });
        throw error;
      }
    });

    context.subscriptions.push(disposable);
  }
}

export function deactivate(): void {
  const debug = new DebugService();
  debug.log('info', 'Extension', 'Extension deactivated');
} 