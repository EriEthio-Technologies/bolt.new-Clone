import { useEffect, useCallback } from 'react';
import { Container } from 'typedi';
import { KeyboardService } from '~/lib/services/keyboard/KeyboardService';
import type { KeyboardShortcut } from '~/types/keyboard';

export function useKeyboardShortcuts(
  shortcuts: Omit<KeyboardShortcut, 'id'>[],
  context?: string
): void {
  const registerShortcuts = useCallback(() => {
    const service = Container.get(KeyboardService);
    
    shortcuts.forEach((shortcut, index) => {
      service.registerShortcut({
        ...shortcut,
        id: `${context || 'global'}-${index}`,
        context
      });
    });
  }, [shortcuts, context]);

  useEffect(() => {
    registerShortcuts();

    return () => {
      const service = Container.get(KeyboardService);
      shortcuts.forEach((_, index) => {
        service.unregisterShortcut(`${context || 'global'}-${index}`);
      });
    };
  }, [registerShortcuts, shortcuts, context]);

  useEffect(() => {
    const service = Container.get(KeyboardService);
    service.setContext(context || null);
    
    return () => {
      if (context) {
        service.setContext(null);
      }
    };
  }, [context]);
} 