import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Container } from 'typedi';
import { KeyboardShortcutsTrigger } from '../KeyboardShortcutsTrigger';
import { KeyboardService } from '~/lib/services/keyboard/KeyboardService';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';

jest.mock('~/lib/services/keyboard/KeyboardService');
jest.mock('~/lib/services/monitoring/UIMonitor', () => ({
  UIMonitor: jest.fn().mockImplementation(() => ({
    trackLoadingState: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('KeyboardShortcutsTrigger', () => {
  let mockKeyboardService: jest.Mocked<KeyboardService>;
  let mockUIMonitor: jest.Mocked<UIMonitor>;

  beforeEach(() => {
    mockKeyboardService = {
      registerShortcut: jest.fn(),
      unregisterShortcut: jest.fn(),
      getShortcuts: jest.fn().mockReturnValue([])
    } as any;

    (KeyboardService as jest.Mock).mockImplementation(() => mockKeyboardService);
    Container.set(KeyboardService, mockKeyboardService);
    
    mockUIMonitor = (UIMonitor as jest.Mock).mock.results[0].value;
  });

  afterEach(() => {
    Container.reset();
    jest.clearAllMocks();
  });

  it('renders trigger button with default content', () => {
    render(<KeyboardShortcutsTrigger />);
    
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Show keyboard shortcuts');
  });

  it('renders custom trigger content', () => {
    render(
      <KeyboardShortcutsTrigger>
        <span>Custom Trigger</span>
      </KeyboardShortcutsTrigger>
    );
    
    expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
  });

  it('applies correct position classes', () => {
    const { rerender } = render(<KeyboardShortcutsTrigger position="top-left" />);
    expect(screen.getByRole('button')).toHaveClass('top-4 left-4');

    rerender(<KeyboardShortcutsTrigger position="bottom-right" />);
    expect(screen.getByRole('button')).toHaveClass('bottom-4 right-4');
  });

  it('registers and unregisters keyboard shortcut', () => {
    const { unmount } = render(<KeyboardShortcutsTrigger />);

    expect(mockKeyboardService.registerShortcut).toHaveBeenCalledWith({
      id: 'show-keyboard-shortcuts',
      keys: '?',
      description: 'Show keyboard shortcuts',
      action: expect.any(Function)
    });

    unmount();
    expect(mockKeyboardService.unregisterShortcut).toHaveBeenCalledWith('show-keyboard-shortcuts');
  });

  it('opens dialog on button click', () => {
    render(<KeyboardShortcutsTrigger />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('tracks trigger usage in monitoring', async () => {
    render(<KeyboardShortcutsTrigger />);
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
      component: 'KeyboardShortcutsTrigger',
      duration: 0,
      variant: 'click',
      hasOverlay: false
    });
  });

  it('shows/hides keyboard icon based on prop', () => {
    const { rerender } = render(<KeyboardShortcutsTrigger showIcon={true} />);
    expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();

    rerender(<KeyboardShortcutsTrigger showIcon={false} />);
    expect(screen.getByRole('button').querySelector('svg')).not.toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<KeyboardShortcutsTrigger />);
      
      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-label', 'Show keyboard shortcuts');
    });

    it('supports keyboard navigation', () => {
      render(<KeyboardShortcutsTrigger />);
      
      const trigger = screen.getByRole('button');
      trigger.focus();
      fireEvent.keyDown(trigger, { key: 'Enter' });
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
}); 