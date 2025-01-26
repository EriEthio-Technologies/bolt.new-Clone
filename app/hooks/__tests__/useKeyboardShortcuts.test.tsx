import { renderHook } from '@testing-library/react-hooks';
import { Container } from 'typedi';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { KeyboardService } from '~/lib/services/keyboard/KeyboardService';

jest.mock('~/lib/services/keyboard/KeyboardService');

describe('useKeyboardShortcuts', () => {
  let mockKeyboardService: jest.Mocked<KeyboardService>;

  beforeEach(() => {
    mockKeyboardService = {
      registerShortcut: jest.fn(),
      unregisterShortcut: jest.fn(),
      setContext: jest.fn(),
      destroy: jest.fn()
    } as any;

    (KeyboardService as jest.Mock).mockImplementation(() => mockKeyboardService);
    Container.set(KeyboardService, mockKeyboardService);
  });

  afterEach(() => {
    Container.reset();
    jest.clearAllMocks();
  });

  it('registers shortcuts on mount', () => {
    const shortcuts = [
      {
        keys: 'ctrl+s',
        action: jest.fn(),
        description: 'Save'
      }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    expect(mockKeyboardService.registerShortcut).toHaveBeenCalledWith({
      ...shortcuts[0],
      id: 'global-0',
      context: undefined
    });
  });

  it('unregisters shortcuts on unmount', () => {
    const shortcuts = [
      {
        keys: 'ctrl+s',
        action: jest.fn(),
        description: 'Save'
      }
    ];

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));
    unmount();

    expect(mockKeyboardService.unregisterShortcut).toHaveBeenCalledWith('global-0');
  });

  it('handles context changes', () => {
    const context = 'editor';
    const shortcuts = [
      {
        keys: 'ctrl+s',
        action: jest.fn(),
        description: 'Save'
      }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts, context));

    expect(mockKeyboardService.setContext).toHaveBeenCalledWith(context);
  });

  it('updates shortcuts when they change', () => {
    const shortcuts = [
      {
        keys: 'ctrl+s',
        action: jest.fn(),
        description: 'Save'
      }
    ];

    const { rerender } = renderHook(
      (props) => useKeyboardShortcuts(props.shortcuts),
      { initialProps: { shortcuts } }
    );

    const newShortcuts = [
      {
        keys: 'ctrl+a',
        action: jest.fn(),
        description: 'Select All'
      }
    ];

    rerender({ shortcuts: newShortcuts });

    expect(mockKeyboardService.unregisterShortcut).toHaveBeenCalledWith('global-0');
    expect(mockKeyboardService.registerShortcut).toHaveBeenCalledWith({
      ...newShortcuts[0],
      id: 'global-0',
      context: undefined
    });
  });
}); 