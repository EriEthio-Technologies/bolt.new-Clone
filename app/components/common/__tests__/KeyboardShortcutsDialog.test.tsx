import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Container } from 'typedi';
import { KeyboardShortcutsDialog } from '../KeyboardShortcutsDialog';
import { KeyboardService } from '~/lib/services/keyboard/KeyboardService';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';

jest.mock('~/lib/services/keyboard/KeyboardService');
jest.mock('~/lib/services/monitoring/UIMonitor', () => ({
  UIMonitor: jest.fn().mockImplementation(() => ({
    trackLoadingState: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('KeyboardShortcutsDialog', () => {
  let mockKeyboardService: jest.Mocked<KeyboardService>;
  let mockUIMonitor: jest.Mocked<UIMonitor>;

  const mockShortcuts = [
    {
      id: 'save',
      keys: 'ctrl+s',
      description: 'Save changes',
      action: jest.fn()
    },
    {
      id: 'undo',
      keys: 'ctrl+z',
      description: 'Undo',
      action: jest.fn(),
      context: 'editor'
    }
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    mockKeyboardService = {
      getShortcuts: jest.fn().mockReturnValue(mockShortcuts)
    } as any;

    (KeyboardService as jest.Mock).mockImplementation(() => mockKeyboardService);
    Container.set(KeyboardService, mockKeyboardService);
    
    mockUIMonitor = (UIMonitor as jest.Mock).mock.results[0].value;
  });

  afterEach(() => {
    Container.reset();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders when open', () => {
    render(
      <KeyboardShortcutsDialog
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <KeyboardShortcutsDialog
        isOpen={false}
        onClose={jest.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays shortcuts grouped by context', () => {
    render(
      <KeyboardShortcutsDialog
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('Global Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(screen.getByText('Save changes')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('formats shortcut keys correctly', () => {
    render(
      <KeyboardShortcutsDialog
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('Ctrl + S')).toBeInTheDocument();
    expect(screen.getByText('Ctrl + Z')).toBeInTheDocument();
  });

  it('calls onClose when clicking outside', () => {
    const onClose = jest.fn();
    render(
      <KeyboardShortcutsDialog
        isOpen={true}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalled();
  });

  it('tracks dialog usage in monitoring', () => {
    const { rerender } = render(
      <KeyboardShortcutsDialog
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    rerender(
      <KeyboardShortcutsDialog
        isOpen={false}
        onClose={jest.fn()}
      />
    );

    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
      component: 'KeyboardShortcutsDialog',
      duration: expect.any(Number),
      variant: 'dialog',
      hasOverlay: true
    });
  });

  it('filters shortcuts by context when provided', () => {
    mockKeyboardService.getShortcuts.mockImplementation((context) => 
      mockShortcuts.filter(s => s.context === context)
    );

    render(
      <KeyboardShortcutsDialog
        isOpen={true}
        onClose={jest.fn()}
        context="editor"
      />
    );

    expect(screen.queryByText('Save changes')).not.toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(
        <KeyboardShortcutsDialog
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Keyboard shortcuts');
    });

    it('close button has accessible label', () => {
      render(
        <KeyboardShortcutsDialog
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
    });
  });
}); 