import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
      getShortcuts: jest.fn().mockReturnValue([
        { key: 'ctrl+s', description: 'Save' },
        { key: 'ctrl+p', description: 'Open file' }
      ])
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

  it('shows shortcuts modal when clicked', () => {
    render(<KeyboardShortcutsTrigger />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Open file')).toBeInTheDocument();
    expect(screen.getByText('ctrl+s')).toBeInTheDocument();
    expect(screen.getByText('ctrl+p')).toBeInTheDocument();
  });

  it('tracks modal open in analytics', () => {
    render(<KeyboardShortcutsTrigger />);
    
    fireEvent.click(screen.getByRole('button'));

    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
      component: 'KeyboardShortcutsTrigger',
      duration: expect.any(Number),
      variant: 'showShortcuts',
      hasOverlay: true
    });
  });

  it('closes modal when escape is pressed', () => {
    render(<KeyboardShortcutsTrigger />);
    
    fireEvent.click(screen.getByRole('button'));
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });
}); 