import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from 'typedi';
import { KeyboardService } from '~/lib/services/keyboard/KeyboardService';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';
import type { KeyboardShortcut } from '~/types/keyboard';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
}

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  isOpen,
  onClose,
  context
}) => {
  const keyboardService = Container.get(KeyboardService);
  const uiMonitor = useRef(new UIMonitor());
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (isOpen) {
      startTime.current = Date.now();
    } else {
      uiMonitor.current.trackLoadingState({
        component: 'KeyboardShortcutsDialog',
        duration: Date.now() - startTime.current,
        variant: 'dialog',
        hasOverlay: true
      }).catch(console.error);
    }
  }, [isOpen]);

  const shortcuts = keyboardService.getShortcuts(context);
  const groupedShortcuts = groupShortcutsByContext(shortcuts);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={onClose}
          role="dialog"
          aria-label="Keyboard shortcuts"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close dialog"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {Object.entries(groupedShortcuts).map(([contextName, shortcuts]) => (
              <div key={contextName} className="mb-8 last:mb-0">
                <h3 className="text-lg font-semibold mb-4 text-gray-700">
                  {contextName || 'Global Shortcuts'}
                </h3>
                <div className="space-y-3">
                  {shortcuts.map(shortcut => (
                    <div
                      key={shortcut.id}
                      className="flex justify-between items-center py-2 border-b border-gray-100"
                    >
                      <span className="text-gray-600">{shortcut.description}</span>
                      <kbd className="px-3 py-1 bg-gray-100 rounded text-sm font-mono">
                        {formatShortcut(shortcut.keys)}
                      </kbd>
                    </div>
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

function formatShortcut(keys: string): string {
  return keys
    .split('+')
    .map(key => key.charAt(0).toUpperCase() + key.slice(1))
    .join(' + ');
} 