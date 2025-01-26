import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Container } from 'typedi';
import { KeyboardShortcutsCheatsheet } from '../KeyboardShortcutsCheatsheet';
import { KeyboardService } from '~/lib/services/keyboard/KeyboardService';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';

jest.mock('~/lib/services/keyboard/KeyboardService');
jest.mock('~/lib/services/monitoring/UIMonitor', () => ({
  UIMonitor: jest.fn().mockImplementation(() => ({
    trackLoadingState: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('KeyboardShortcutsCheatsheet', () => {
  let mockKeyboardService: jest.Mocked<KeyboardService>;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  const originalPrint = window.print;

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
    mockKeyboardService = {
      getShortcuts: jest.fn().mockReturnValue(mockShortcuts)
    } as any;

    (KeyboardService as jest.Mock).mockImplementation(() => mockKeyboardService);
    Container.set(KeyboardService, mockKeyboardService);
    
    mockUIMonitor = (UIMonitor as jest.Mock).mock.results[0].value;
    window.print = jest.fn();
  });

  afterEach(() => {
    Container.reset();
    jest.clearAllMocks();
    window.print = originalPrint;
  });

  it('renders shortcuts grouped by context', () => {
    render(<KeyboardShortcutsCheatsheet />);

    expect(screen.getByText('Global Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(screen.getByText('Save changes')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('handles print action', () => {
    render(<KeyboardShortcutsCheatsheet />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Print cheatsheet' }));
    
    expect(window.print).toHaveBeenCalled();
    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
      component: 'KeyboardShortcutsCheatsheet',
      duration: 0,
      variant: 'print',
      hasOverlay: false
    });
  });

  it('renders in compact mode', () => {
    render(<KeyboardShortcutsCheatsheet compact={true} />);

    expect(screen.getByText('Global Shortcuts').className).toContain('text-sm');
  });

  it('applies custom className', () => {
    const { container } = render(
      <KeyboardShortcutsCheatsheet className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('filters shortcuts by context', () => {
    mockKeyboardService.getShortcuts.mockImplementation((context) => 
      mockShortcuts.filter(s => s.context === context)
    );

    render(<KeyboardShortcutsCheatsheet context="editor" />);

    expect(screen.queryByText('Save changes')).not.toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('formats shortcut keys correctly', () => {
    render(<KeyboardShortcutsCheatsheet />);

    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  describe('print styles', () => {
    it('includes print-specific classes', () => {
      render(<KeyboardShortcutsCheatsheet />);

      const container = screen.getByRole('button').parentElement;
      expect(container).toHaveClass('print:hidden');
    });

    it('includes generation date', () => {
      render(<KeyboardShortcutsCheatsheet />);

      expect(screen.getByText(/Generated on/)).toBeInTheDocument();
    });
  });
}); 