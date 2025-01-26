import { Service } from 'typedi';
import { UIMonitor } from '../monitoring/UIMonitor';
import type { KeyboardShortcut, KeyboardShortcutsConfig, KeyboardEvent } from '~/types/keyboard';

@Service()
export class KeyboardService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private activeContext: string | null = null;
  private uiMonitor: UIMonitor;
  private config: KeyboardShortcutsConfig = {
    enabled: true,
    defaultPreventDefault: true,
    defaultStopPropagation: true,
    showInUI: true
  };

  constructor() {
    this.uiMonitor = new UIMonitor();
    this.handleKeyDown = this.handleKeyDown.bind(this);
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
    }
  }

  public registerShortcut(shortcut: KeyboardShortcut): void {
    if (this.shortcuts.has(shortcut.id)) {
      throw new Error(`Shortcut with id ${shortcut.id} already exists`);
    }
    this.shortcuts.set(shortcut.id, {
      ...shortcut,
      enabled: shortcut.enabled ?? true,
      preventDefault: shortcut.preventDefault ?? this.config.defaultPreventDefault,
      stopPropagation: shortcut.stopPropagation ?? this.config.defaultStopPropagation
    });
  }

  public unregisterShortcut(id: string): void {
    this.shortcuts.delete(id);
  }

  public setContext(context: string | null): void {
    this.activeContext = context;
  }

  public updateConfig(config: Partial<KeyboardShortcutsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getShortcuts(context?: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(shortcut => 
      (!context || shortcut.context === context) && shortcut.enabled
    );
  }

  private normalizeKey(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    if (event.metaKey) parts.push('cmd');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }

  private async handleKeyDown(event: KeyboardEvent): Promise<void> {
    if (!this.config.enabled) return;

    const normalizedKey = this.normalizeKey(event);
    const startTime = Date.now();

    try {
      for (const shortcut of this.shortcuts.values()) {
        if (
          shortcut.enabled &&
          shortcut.keys === normalizedKey &&
          (!shortcut.context || shortcut.context === this.activeContext)
        ) {
          if (shortcut.preventDefault) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }

          await shortcut.action();

          // Track shortcut usage
          await this.uiMonitor.trackLoadingState({
            component: 'KeyboardShortcut',
            duration: Date.now() - startTime,
            variant: shortcut.id,
            hasOverlay: false
          });

          break;
        }
      }
    } catch (error) {
      console.error('Error executing keyboard shortcut:', error);
      throw error;
    }
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
    }
  }
} 