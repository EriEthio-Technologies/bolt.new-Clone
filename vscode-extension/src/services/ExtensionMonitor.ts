import { Service } from 'typedi';
import * as vscode from 'vscode';
import { UIMonitor } from '../../../app/lib/services/monitoring/UIMonitor';

@Service()
export class ExtensionMonitor extends UIMonitor {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    super();
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right
    );
  }

  async trackLoadingState(params: {
    component: string;
    duration: number;
    variant: string;
    hasOverlay: boolean;
  }): Promise<void> {
    await super.trackLoadingState(params);

    // Update VS Code status bar
    this.statusBarItem.text = `$(sync~spin) ${params.component}: ${params.variant}`;
    this.statusBarItem.show();

    setTimeout(() => {
      this.statusBarItem.hide();
    }, 3000);
  }
} 