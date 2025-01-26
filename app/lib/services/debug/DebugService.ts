import { Service } from 'typedi';
import { UIMonitor } from '../monitoring/UIMonitor';

interface DebugConfig {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  persistToStorage: boolean;
}

@Service()
export class DebugService {
  private config: DebugConfig = {
    enabled: process.env.NODE_ENV !== 'production',
    logLevel: 'info',
    persistToStorage: true
  };

  private uiMonitor: UIMonitor;

  constructor() {
    this.uiMonitor = new UIMonitor();
    this.loadConfig();
  }

  public setConfig(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.config.persistToStorage) {
      localStorage.setItem('debug_config', JSON.stringify(this.config));
    }
  }

  public log(level: DebugConfig['logLevel'], component: string, message: string, data?: any): void {
    if (!this.config.enabled) return;
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component,
      message,
      data
    };

    this.writeToConsole(logEntry);
    this.trackDebugEvent(logEntry);
  }

  private shouldLog(level: DebugConfig['logLevel']): boolean {
    const levels: DebugConfig['logLevel'][] = ['error', 'warn', 'info', 'debug'];
    const configIndex = levels.indexOf(this.config.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex <= configIndex;
  }

  private writeToConsole(entry: any): void {
    const formattedMessage = `[${entry.timestamp}] [${entry.component}] ${entry.message}`;
    
    switch (entry.level) {
      case 'error':
        console.error(formattedMessage, entry.data);
        break;
      case 'warn':
        console.warn(formattedMessage, entry.data);
        break;
      case 'info':
        console.info(formattedMessage, entry.data);
        break;
      case 'debug':
        console.debug(formattedMessage, entry.data);
        break;
    }
  }

  private trackDebugEvent(entry: any): void {
    this.uiMonitor.trackLoadingState({
      component: 'DebugService',
      duration: 0,
      variant: entry.level,
      hasOverlay: false
    }).catch(console.error);
  }

  private loadConfig(): void {
    try {
      const savedConfig = localStorage.getItem('debug_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('Failed to load debug config:', error);
    }
  }
} 