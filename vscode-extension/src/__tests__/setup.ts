// Mock VS Code API
const mockVscode = {
  window: {
    createStatusBarItem: jest.fn(),
    createTerminal: jest.fn(),
    showTextDocument: jest.fn()
  },
  workspace: {
    openTextDocument: jest.fn()
  },
  commands: {
    registerCommand: jest.fn()
  },
  debug: {
    startDebugging: jest.fn()
  },
  StatusBarAlignment: {
    Right: 1
  },
  ExtensionContext: jest.fn()
};

jest.mock('vscode', () => mockVscode, { virtual: true });

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
}); 