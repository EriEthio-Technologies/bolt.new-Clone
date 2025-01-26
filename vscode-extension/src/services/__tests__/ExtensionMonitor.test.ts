import * as vscode from 'vscode';
import { ExtensionMonitor } from '../ExtensionMonitor';
import { UIMonitor } from '../../../../app/lib/services/monitoring/UIMonitor';

jest.mock('vscode');
jest.mock('../../../../app/lib/services/monitoring/UIMonitor');

describe('ExtensionMonitor', () => {
  let monitor: ExtensionMonitor;
  let mockStatusBarItem: jest.Mocked<vscode.StatusBarItem>;

  beforeEach(() => {
    mockStatusBarItem = {
      text: '',
      show: jest.fn(),
      hide: jest.fn()
    } as any;

    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);
    (UIMonitor as unknown as jest.Mock).mockImplementation(() => ({
      trackLoadingState: jest.fn()
    }));

    monitor = new ExtensionMonitor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackLoadingState', () => {
    it('updates status bar and calls parent method', async () => {
      const params = {
        component: 'TestComponent',
        duration: 100,
        variant: 'test',
        hasOverlay: false
      };

      await monitor.trackLoadingState(params);

      expect(mockStatusBarItem.text).toBe('$(sync~spin) TestComponent: test');
      expect(mockStatusBarItem.show).toHaveBeenCalled();
      expect(UIMonitor.prototype.trackLoadingState).toHaveBeenCalledWith(params);
    });

    it('hides status bar after delay', async () => {
      jest.useFakeTimers();

      await monitor.trackLoadingState({
        component: 'TestComponent',
        duration: 100,
        variant: 'test',
        hasOverlay: false
      });

      expect(mockStatusBarItem.hide).not.toHaveBeenCalled();

      jest.advanceTimersByTime(3000);

      expect(mockStatusBarItem.hide).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
}); 