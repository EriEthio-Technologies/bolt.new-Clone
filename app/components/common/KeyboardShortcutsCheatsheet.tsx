import React, { useRef } from 'react';
import { Container } from 'typedi';
import { KeyboardService } from '~/lib/services/keyboard/KeyboardService';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';
import type { KeyboardShortcut } from '~/types/keyboard';

interface KeyboardShortcutsCheatsheetProps {
  /** Context for filtering shortcuts */
  context?: string;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const KeyboardShortcutsCheatsheet: React.FC<KeyboardShortcutsCheatsheetProps> = ({
  context,
  compact = false,
  className = ''
}) => {
  const keyboardService = Container.get(KeyboardService);
  const uiMonitor = useRef(new UIMonitor());
  const shortcuts = keyboardService.getShortcuts(context);
  const groupedShortcuts = groupShortcutsByContext(shortcuts);

  const handlePrint = () => {
    uiMonitor.current.trackLoadingState({
      component: 'KeyboardShortcutsCheatsheet',
      duration: 0,
      variant: 'print',
      hasOverlay: false
    }).catch(console.error);
    window.print();
  };

  return (
    <div className={`print:p-0 ${className}`}>
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h2 className="text-2xl font-bold text-gray-800">Keyboard Shortcuts Cheatsheet</h2>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          aria-label="Print cheatsheet"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </div>
        </button>
      </div>

      <div className={`grid ${compact ? 'gap-4' : 'gap-8'} print:gap-4`}>
        {Object.entries(groupedShortcuts).map(([contextName, shortcuts]) => (
          <section key={contextName} className="break-inside-avoid">
            <h3 className={`
              font-semibold text-gray-700 border-b border-gray-200 
              ${compact ? 'text-sm mb-2 pb-1' : 'text-lg mb-4 pb-2'}
              print:text-sm print:mb-2 print:pb-1
            `}>
              {contextName || 'Global Shortcuts'}
            </h3>
            <div className={`grid ${compact ? 'gap-1' : 'gap-2'} print:gap-1`}>
              {shortcuts.map(shortcut => (
                <ShortcutItem
                  key={shortcut.id}
                  shortcut={shortcut}
                  compact={compact}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 text-sm text-gray-500 print:text-xs">
        Generated on {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

interface ShortcutItemProps {
  shortcut: KeyboardShortcut;
  compact: boolean;
}

const ShortcutItem: React.FC<ShortcutItemProps> = ({ shortcut, compact }) => (
  <div className={`
    flex justify-between items-center py-1 border-b border-gray-100 last:border-0
    ${compact ? 'text-sm' : ''}
    print:text-sm print:py-0.5
  `}>
    <span className="text-gray-600">{shortcut.description}</span>
    <div className="flex items-center gap-2">
      {shortcut.keys.split('+').map((key, index) => (
        <React.Fragment key={key}>
          <kbd className={`
            px-2 py-0.5 bg-gray-100 rounded font-mono
            ${compact ? 'text-xs' : 'text-sm'}
            print:text-xs print:px-1.5 print:py-0.5
          `}>
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