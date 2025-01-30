import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--gobezeai-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--gobezeai-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--gobezeai-elements-terminal-textColor'),
    background: cssVar('--gobezeai-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--gobezeai-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--gobezeai-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--gobezeai-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--gobezeai-elements-terminal-color-black'),
    red: cssVar('--gobezeai-elements-terminal-color-red'),
    green: cssVar('--gobezeai-elements-terminal-color-green'),
    yellow: cssVar('--gobezeai-elements-terminal-color-yellow'),
    blue: cssVar('--gobezeai-elements-terminal-color-blue'),
    magenta: cssVar('--gobezeai-elements-terminal-color-magenta'),
    cyan: cssVar('--gobezeai-elements-terminal-color-cyan'),
    white: cssVar('--gobezeai-elements-terminal-color-white'),
    brightBlack: cssVar('--gobezeai-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--gobezeai-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--gobezeai-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--gobezeai-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--gobezeai-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--gobezeai-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--gobezeai-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--gobezeai-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
