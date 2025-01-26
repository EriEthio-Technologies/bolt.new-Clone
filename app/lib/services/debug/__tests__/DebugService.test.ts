import { DebugService } from '../DebugService';
import { UIMonitor } from '../../monitoring/UIMonitor';

jest.mock('../../monitoring/UIMonitor', () => ({
  UIMonitor: jest.fn().mockImplementation(() => ({
    trackLoadingState: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('DebugService', () => {
  let service: DebugService;
  let mockUIMonitor: jest.Mocked<UIMonitor>;
  let mockConsole: jest.SpyInstance[];

  beforeEach(() => {
    localStorage.clear();
    mockUIMonitor = (UIMonitor as jest.Mock).mock.results[0].value;
    
    mockConsole = [
      jest.spyOn(console, 'error').mockImplementation(),
      jest.spyOn(console, 'warn').mockImplementation(),
      jest.spyOn(console, 'info').mockImplementation(),
      jest.spyOn(console, 'debug').mockImplementation()
    ];

    service = new DebugService();
  });

  afterEach(() => {
    mockConsole.forEach(mock => mock.mockRestore());
  });

  it('loads config from localStorage', () => {
    const config = { enabled: true, logLevel: 'debug' as const };
    localStorage.setItem('debug_config', JSON.stringify(config));
    
    service = new DebugService();
    service.log('debug', 'test', 'message');
    
    expect(console.debug).toHaveBeenCalled();
  });

  it('persists config changes to localStorage', () => {
    service.setConfig({ logLevel: 'warn' });
    
    const savedConfig = JSON.parse(localStorage.getItem('debug_config') || '{}');
    expect(savedConfig.logLevel).toBe('warn');
  });

  it('respects log level hierarchy', () => {
    service.setConfig({ enabled: true, logLevel: 'warn' });

    service.log('error', 'test', 'error message');
    service.log('warn', 'test', 'warn message');
    service.log('info', 'test', 'info message');
    service.log('debug', 'test', 'debug message');

    expect(console.error).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.debug).not.toHaveBeenCalled();
  });

  it('tracks debug events in monitoring', () => {
    service.setConfig({ enabled: true });
    service.log('error', 'test', 'error message');

    expect(mockUIMonitor.trackLoadingState).toHaveBeenCalledWith({
      component: 'DebugService',
      duration: 0,
      variant: 'error',
      hasOverlay: false
    });
  });

  it('does not log when disabled', () => {
    service.setConfig({ enabled: false });
    service.log('error', 'test', 'error message');

    expect(console.error).not.toHaveBeenCalled();
    expect(mockUIMonitor.trackLoadingState).not.toHaveBeenCalled();
  });
}); 