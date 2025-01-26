export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string;
  /** Key combination (e.g., 'ctrl+s', 'cmd+shift+p') */
  keys: string;
  /** Action to execute when shortcut is triggered */
  action: () => void;
  /** Description of what the shortcut does */
  description: string;
  /** Component or context where shortcut is active */
  context?: string;
  /** Whether shortcut is currently enabled */
  enabled?: boolean;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether to stop event propagation */
  stopPropagation?: boolean;
}

export interface KeyboardShortcutsConfig {
  /** Whether keyboard shortcuts are globally enabled */
  enabled: boolean;
  /** Default prevent default behavior */
  defaultPreventDefault: boolean;
  /** Default stop propagation behavior */
  defaultStopPropagation: boolean;
  /** Whether to show keyboard shortcuts in UI */
  showInUI: boolean;
}

export interface KeyboardEvent {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
} 