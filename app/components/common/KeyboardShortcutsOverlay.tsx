import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from 'typedi';
import { KeyboardService } from '~/lib/services/keyboard/KeyboardService';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';
import type { KeyboardShortcut } from '~/types/keyboard';

interface KeyboardShortcutsOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Callback when overlay is dismissed */
  onDismiss: () => void;
  /** Context for filtering shortcuts */
  context?: string;
  /** Whether to show shortcuts in a compact mode */
  compact?: boolean;
  /** Custom styles for positioning */
  style?: React.CSSProperties;
  /** Additional CSS classes */
  className?: string;
}

export const KeyboardShortcutsOverlay: React.FC<KeyboardShortcutsOverlayProps> = ({
  isVisible,
  onDismiss,
  context,
  compact = false,
  style,
  className = ''
}) => {
  const keyboardService = Container.get(KeyboardService);
  const uiMonitor = useRef(new UIMonitor());
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (isVisible) {
      startTime.current = Date.now();
      uiMonitor.current.trackLoadingState({
        component: 'KeyboardShortcutsOverlay',
        duration: 0,
        variant: 'show',
        hasOverlay: true
      }).catch(console.error);
    } else {
      uiMonitor.current.trackLoadingState({
        component: 'KeyboardShortcutsOverlay',
        duration: Date.now() - startTime.current,
        variant: 'hide',
        hasOverlay: true
      }).catch(console.error);
    }
  }, [isVisible]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (isVisible && event.key === 'Escape') {
        onDismiss();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, onDismiss]);

  const shortcuts = keyboardService.getShortcuts(context);
  const groupedShortcuts = groupShortcutsByContext(shortcuts);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-25 backdrop-blur-sm ${className}`}
          onClick={onDismiss}
          role="dialog"
          aria-label="Keyboard shortcuts overlay"
          style={style}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className={`bg-white rounded-lg shadow-2xl ${compact ? 'p-4' : 'p-6'} max-w-2xl w-full max-h-[90vh] overflow-auto`}
          >
            {Object.entries(groupedShortcuts).map(([contextName, shortcuts]) => (
              <div key={contextName} className={compact ? 'mb-4' : 'mb-8'}>
                <h3 className={`font-semibold text-gray-700 ${compact ? 'text-sm mb-2' : 'text-lg mb-4'}`}>
                  {contextName || 'Global Shortcuts'}
                </h3>
                <div className={`grid ${compact ? 'gap-2' : 'gap-3'}`}>
                  {shortcuts.map(shortcut => (
                    <ShortcutItem
                      key={shortcut.id}
                      shortcut={shortcut}
                      compact={compact}
                    />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ShortcutItemProps {
  shortcut: KeyboardShortcut;
  compact: boolean;
}

const ShortcutItem: React.FC<ShortcutItemProps> = ({ shortcut, compact }) => (
  <div
    className={`flex justify-between items-center ${
      compact ? 'py-1' : 'py-2'
    } border-b border-gray-100 last:border-0`}
  >
    <span className={`text-gray-600 ${compact ? 'text-sm' : ''}`}>
      {shortcut.description}
    </span>
    <div className="flex items-center gap-2">
      {shortcut.keys.split('+').map((key, index) => (
        <React.Fragment key={key}>
          <kbd
            className={`
              px-2 py-1 bg-gray-100 rounded font-mono
              ${compact ? 'text-xs' : 'text-sm'}
            `}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </kbd>
          {index < shortcut.keys.split('+').length - 1 && (
            <span className="text-gray-400">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

function groupShortcutsByContext(shortcuts: KeyboardShortcut[]): Record<string, KeyboardShortcut[]> {
  return shortcuts.reduce((acc, shortcut) => {
    const context = shortcut.context || 'global';
    if (!acc[context]) {
      acc[context] = [];
    }
    acc[context].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);
} 