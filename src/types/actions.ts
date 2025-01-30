export type ActionType = 'shell' | 'file'

export interface GobezeAIActionData {
    type?: ActionType
    content: string
}

export interface ShellAction extends GobezeAIActionData {
    type: 'shell'
    command: string
}

export interface FileAction extends GobezeAIActionData {
    type: 'file'
    filePath: string
}

export type GobezeAIAction = ShellAction | FileAction 