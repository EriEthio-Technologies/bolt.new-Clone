export type MemoryType = 
  | 'conversation'
  | 'code_context'
  | 'user_preference'
  | 'project_context'
  | 'error_context'
  | 'workflow_state';

export interface Memory {
  id: string;
  type: MemoryType;
  content: any;
  importance: number;
  created: Date;
  lastAccessed: Date;
  metadata: Record<string, any>;
}

export interface MemorySearchParams {
  types: MemoryType[];
  query?: string;
  limit?: number;
  minImportance?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface MemoryStats {
  totalMemories: number;
  memoryTypes: Record<MemoryType, number>;
  averageImportance: number;
} 