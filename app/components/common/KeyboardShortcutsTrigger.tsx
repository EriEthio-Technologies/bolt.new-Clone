import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Container } from 'typedi';
import { KeyboardService } from '~/lib/services/keyboard/KeyboardService';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';

interface KeyboardShortcutsTriggerProps {
  /** Custom trigger button content */
  children?: React.ReactNode;
  /** Context for filtering shortcuts */
  context?: string;
  /** Position of the trigger button */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Whether to show the keyboard icon */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const KeyboardShortcutsTrigger: React.FC<KeyboardShortcutsTriggerProps> = ({
  children,
  context,
  position = 'bottom-right',
  showIcon = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const uiMonitor = useRef(new UIMonitor());
  const keyboardService = Container.get(KeyboardService);

  useEffect(() => {
    const shortcut = {
      id: 'show-keyboard-shortcuts',
      keys: '?',
      description: 'Show keyboard shortcuts',
      action: () => setIsOpen(true)
    };

    keyboardService.registerShortcut(shortcut);

    return () => {
      keyboardService.unregisterShortcut(shortcut.id);
    };
  }, []);

  const handleClick = () => {
    uiMonitor.current.trackLoadingState({
      component: 'KeyboardShortcutsTrigger',
      duration: 0,
      variant: 'click',
      hasOverlay: false
    }).catch(console.error);
    setIsOpen(true);
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className={`fixed ${positionClasses[position]} flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow ${className}`}
        aria-label="Show keyboard shortcuts"
      >
        {showIcon && (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        )}
        {children || 'Keyboard Shortcuts'}
      </motion.button>

      <KeyboardShortcutsDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        context={context}
      />
    </>
  );
}; 