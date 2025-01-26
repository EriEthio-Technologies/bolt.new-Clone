import { KeyboardService } from '../KeyboardService';
import { UIMonitor } from '../../monitoring/UIMonitor';
import type { KeyboardEvent } from '~/types/keyboard';

jest.mock('../../monitoring/UIMonitor', () => ({
  UIMonitor: jest.fn().mockImplementation(() => ({
    trackLoadingState: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('KeyboardService', () => {
  let service: KeyboardService;
  let mockUIMonitor: jest.Mocked<UIMonitor>;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new KeyboardService();
    mockUIMonitor = (UIMonitor as jest.Mock).mock.results[0].value;
  });

  afterEach(() => {
    jest.useRealTimers();
    service.destroy();
  });

  const createKeyboardEvent = (key: string, modifiers: Partial<KeyboardEvent> = {}): KeyboardEvent => ({
    key,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    ...modifiers
  });

  describe('shortcut registration', () => {
    it('registers shortcuts correctly', () => {
      const action = jest.fn();
      service.registerShortcut({
        id: 'test',
        keys: 'ctrl+s',
        action,
        description: 'Test shortcut'
      });

      expect(service.getShortcuts()).toHaveLength(1);
      expect(service.getShortcuts()[0].keys).toBe('ctrl+s');
    });

    it('prevents duplicate shortcut ids', () => {
      service.registerShortcut({
        id: 'test',
        keys: 'ctrl+s',
        action: jest.fn(),
        description: 'Test shortcut'
      });

      expect(() => {
        service.registerShortcut({
          id: 'test',
          keys: 'ctrl+a',
          action: jest.fn(),
          description: 'Another shortcut'
        });
      }).toThrow('Shortcut with id test already exists');
    });
  });

  describe('shortcut execution', () => {
    it('executes shortcuts when correct keys are pressed', async () => {
      const action = jest.fn();
      service.registerShortcut({
        id: 'test',
        keys: 'ctrl+s',
        action,
        description: 'Test shortcut'
      });

      await service['handleKeyDown'](createKeyboardEvent('s', { ctrlKey: true }));
      expect(action).toHaveBeenCalled();
    });

    it('respects context when executing shortcuts', async () => {
      const action = jest.fn();
      service.registerShortcut({
        id: 'test',
        keys: 'ctrl+s',
        action,
        description: 'Test shortcut',
        context: 'editor'
      });

      await service['handleKeyDown'](createKeyboardEvent('s', { ctrlKey: true }));
      expect(action).not.toHaveBeenCalled();

      service.setContext('editor');
      await service['handleKeyDown'](createKeyboardEvent('s', { ctrlKey: true }));
      expect(action).toHaveBeenCalled();
    });

    it('tracks shortcut usage in monitoring', async () => {
      const action = jest.fn();
      service.registerShortcut({
        id: 'test',
        keys: 'ctrl+s',
        action,
        description: 'Test shortcut'
      });

      await service['handleKeyDown'](createKeyboardEvent('s', { ctrlKey: true }));
      
      expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
        component: 'KeyboardShortcut',
        duration: expect.any(Number),
        variant: 'test',
        hasOverlay: false
      });
    });
  });

  describe('configuration', () => {
    it('updates configuration correctly', () => {
      service.updateConfig({ enabled: false });
      const action = jest.fn();
      service.registerShortcut({
        id: 'test',
        keys: 'ctrl+s',
        action,
        description: 'Test shortcut'
      });

      service['handleKeyDown'](createKeyboardEvent('s', { ctrlKey: true }));
      expect(action).not.toHaveBeenCalled();
    });

    it('handles default prevent and stop settings', async () => {
      const preventDefault = jest.fn();
      const stopPropagation = jest.fn();
      const action = jest.fn();

      service.registerShortcut({
        id: 'test',
        keys: 'ctrl+s',
        action,
        description: 'Test shortcut'
      });

      await service['handleKeyDown']({
        ...createKeyboardEvent('s', { ctrlKey: true }),
        preventDefault,
        stopPropagation
      });

      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles action errors gracefully', async () => {
      const error = new Error('Test error');
      const action = jest.fn().mockRejectedValue(error);
      
      service.registerShortcut({
        id: 'test',
        keys: 'ctrl+s',
        action,
        description: 'Test shortcut'
      });

      await expect(
        service['handleKeyDown'](createKeyboardEvent('s', { ctrlKey: true }))
      ).rejects.toThrow(error);
    });
  });
}); 