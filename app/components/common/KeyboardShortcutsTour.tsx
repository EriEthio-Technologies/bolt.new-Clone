import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from 'typedi';
import { KeyboardService } from '~/lib/services/keyboard/KeyboardService';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';
import type { KeyboardShortcut } from '~/types/keyboard';

interface KeyboardShortcutsTourProps {
  /** Whether the tour is active */
  isActive: boolean;
  /** Callback when tour is completed or dismissed */
  onComplete: () => void;
  /** Context for filtering shortcuts */
  context?: string;
  /** Additional CSS classes */
  className?: string;
}

export const KeyboardShortcutsTour: React.FC<KeyboardShortcutsTourProps> = ({
  isActive,
  onComplete,
  context,
  className = ''
}) => {
  const keyboardService = Container.get(KeyboardService);
  const uiMonitor = useRef(new UIMonitor());
  const [currentStep, setCurrentStep] = useState(0);
  const shortcuts = keyboardService.getShortcuts(context);
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (isActive) {
      startTime.current = Date.now();
      uiMonitor.current.trackLoadingState({
        component: 'KeyboardShortcutsTour',
        duration: 0,
        variant: 'start',
        hasOverlay: true
      }).catch(console.error);
    } else {
      uiMonitor.current.trackLoadingState({
        component: 'KeyboardShortcutsTour',
        duration: Date.now() - startTime.current,
        variant: 'end',
        hasOverlay: true
      }).catch(console.error);
    }
  }, [isActive]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (isActive && event.key === 'Escape') {
        onComplete();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isActive, onComplete]);

  const handleNext = () => {
    if (currentStep < shortcuts.length - 1) {
      setCurrentStep(prev => prev + 1);
      uiMonitor.current.trackLoadingState({
        component: 'KeyboardShortcutsTour',
        duration: 0,
        variant: 'next',
        hasOverlay: true
      }).catch(console.error);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      uiMonitor.current.trackLoadingState({
        component: 'KeyboardShortcutsTour',
        duration: 0,
        variant: 'previous',
        hasOverlay: true
      }).catch(console.error);
    }
  };

  if (!isActive || shortcuts.length === 0) return null;

  const currentShortcut = shortcuts[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${className}`}
        onClick={onComplete}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Keyboard Shortcut {currentStep + 1} of {shortcuts.length}
            </h3>
            <p className="text-sm text-gray-500">
              {currentShortcut.context ? `Context: ${currentShortcut.context}` : 'Global Shortcut'}
            </p>
          </div>

          <div className="mb-6">
            <p className="text-gray-700 mb-3">{currentShortcut.description}</p>
            <div className="flex items-center gap-2">
              {currentShortcut.keys.split('+').map((key, index) => (
                <React.Fragment key={key}>
                  <kbd className="px-3 py-1.5 bg-gray-100 rounded text-sm font-mono">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </kbd>
                  {index < currentShortcut.keys.split('+').length - 1 && (
                    <span className="text-gray-400">+</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`px-4 py-2 rounded ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              Previous
            </button>
            <div className="flex gap-2">
              <button
                onClick={onComplete}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {currentStep === shortcuts.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}; 