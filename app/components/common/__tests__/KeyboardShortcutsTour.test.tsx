import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Container } from 'typedi';
import { KeyboardShortcutsTour } from '../KeyboardShortcutsTour';
import { KeyboardService } from '~/lib/services/keyboard/KeyboardService';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';

jest.mock('~/lib/services/keyboard/KeyboardService');
jest.mock('~/lib/services/monitoring/UIMonitor', () => ({
  UIMonitor: jest.fn().mockImplementation(() => ({
    trackLoadingState: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('KeyboardShortcutsTour', () => {
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

  it('renders first shortcut when active', () => {
    render(
      <KeyboardShortcutsTour
        isActive={true}
        onComplete={jest.fn()}
      />
    );

    expect(screen.getByText('Save changes')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcut 1 of 2')).toBeInTheDocument();
  });

  it('does not render when inactive', () => {
    render(
      <KeyboardShortcutsTour
        isActive={false}
        onComplete={jest.fn()}
      />
    );

    expect(screen.queryByText('Save changes')).not.toBeInTheDocument();
  });

  it('navigates through shortcuts', async () => {
    render(
      <KeyboardShortcutsTour
        isActive={true}
        onComplete={jest.fn()}
      />
    );

    expect(screen.getByText('Save changes')).toBeInTheDocument();
    
    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Context: editor')).toBeInTheDocument();
  });

  it('calls onComplete when finished', async () => {
    const onComplete = jest.fn();
    render(
      <KeyboardShortcutsTour
        isActive={true}
        onComplete={onComplete}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Finish'));
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('tracks tour progress in monitoring', async () => {
    render(
      <KeyboardShortcutsTour
        isActive={true}
        onComplete={jest.fn()}
      />
    );

    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
      component: 'KeyboardShortcutsTour',
      duration: 0,
      variant: 'start',
      hasOverlay: true
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
      component: 'KeyboardShortcutsTour',
      duration: 0,
      variant: 'next',
      hasOverlay: true
    });
  });

  it('handles keyboard navigation', () => {
    const onComplete = jest.fn();
    render(
      <KeyboardShortcutsTour
        isActive={true}
        onComplete={onComplete}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onComplete).toHaveBeenCalled();
  });

  it('disables previous button on first step', () => {
    render(
      <KeyboardShortcutsTour
        isActive={true}
        onComplete={jest.fn()}
      />
    );

    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();
    expect(previousButton).toHaveClass('text-gray-400', 'cursor-not-allowed');
  });

  describe('accessibility', () => {
    it('maintains focus management', () => {
      render(
        <KeyboardShortcutsTour
          isActive={true}
          onComplete={jest.fn()}
        />
      );

      const nextButton = screen.getByText('Next');
      nextButton.focus();
      expect(document.activeElement).toBe(nextButton);
    });
  });
}); 