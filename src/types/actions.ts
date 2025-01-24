export type ActionType = 'shell' | 'file'

export interface BoltActionData {
    type?: ActionType
    content: string
}

export interface ShellAction extends BoltActionData {
    type: 'shell'
}

export interface FileAction extends BoltActionData {
    type: 'file'
    filePath: string
}

export type BoltAction = ShellAction | FileAction 