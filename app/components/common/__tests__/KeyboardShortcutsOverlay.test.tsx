import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Container } from 'typedi';
import { KeyboardShortcutsOverlay } from '../KeyboardShortcutsOverlay';
import { KeyboardService } from '~/lib/services/keyboard/KeyboardService';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';

jest.mock('~/lib/services/keyboard/KeyboardService');
jest.mock('~/lib/services/monitoring/UIMonitor', () => ({
  UIMonitor: jest.fn().mockImplementation(() => ({
    trackLoadingState: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('KeyboardShortcutsOverlay', () => {
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

  it('renders when visible', () => {
    render(
      <KeyboardShortcutsOverlay
        isVisible={true}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Global Shortcuts')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(
      <KeyboardShortcutsOverlay
        isVisible={false}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('tracks visibility in monitoring', () => {
    const { rerender } = render(
      <KeyboardShortcutsOverlay
        isVisible={true}
        onDismiss={jest.fn()}
      />
    );

    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
      component: 'KeyboardShortcutsOverlay',
      duration: 0,
      variant: 'show',
      hasOverlay: true
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    rerender(
      <KeyboardShortcutsOverlay
        isVisible={false}
        onDismiss={jest.fn()}
      />
    );

    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
      component: 'KeyboardShortcutsOverlay',
      duration: expect.any(Number),
      variant: 'hide',
      hasOverlay: true
    });
  });

  it('calls onDismiss when clicking outside', () => {
    const onDismiss = jest.fn();
    render(
      <KeyboardShortcutsOverlay
        isVisible={true}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole('dialog'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('calls onDismiss when pressing Escape', () => {
    const onDismiss = jest.fn();
    render(
      <KeyboardShortcutsOverlay
        isVisible={true}
        onDismiss={onDismiss}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders in compact mode', () => {
    render(
      <KeyboardShortcutsOverlay
        isVisible={true}
        onDismiss={jest.fn()}
        compact={true}
      />
    );

    expect(screen.getByRole('dialog').querySelector('.p-4')).toBeInTheDocument();
  });

  it('applies custom styles', () => {
    const customStyle = { top: '20px' };
    render(
      <KeyboardShortcutsOverlay
        isVisible={true}
        onDismiss={jest.fn()}
        style={customStyle}
      />
    );

    expect(screen.getByRole('dialog')).toHaveStyle(customStyle);
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(
        <KeyboardShortcutsOverlay
          isVisible={true}
          onDismiss={jest.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Keyboard shortcuts overlay');
    });

    it('maintains focus trap when open', () => {
      render(
        <KeyboardShortcutsOverlay
          isVisible={true}
          onDismiss={jest.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(document.activeElement).toBe(dialog);
    });
  });
}); 