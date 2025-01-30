export type ActionType = 'file' | 'shell';

export interface BaseAction {
  content: string;
}

export interface FileAction extends BaseAction {
  type: 'file';
  filePath: string;
}

export interface ShellAction extends BaseAction {
  type: 'shell';
}

export type GobezeAIAction = FileAction | ShellAction;

export type GobezeAIActionData = GobezeAIAction | BaseAction;
