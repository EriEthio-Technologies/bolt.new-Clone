import { WebSocket } from 'ws';

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  lastActivity: number;
  buffer: SyncOperation[];
  version: number;
}

export interface WebSocketMessage {
  type: string;
  clientId?: string;
  operations?: SyncOperation[];
  presence?: PresenceInfo;
  resolution?: ConflictResolution;
  error?: string;
  version?: number;
}

export interface SyncOperation {
  type: 'insert' | 'delete' | 'update';
  path: string;
  content?: any;
  position?: number;
  length?: number;
  version: number;
  baseVersion: number;
  timestamp: number;
}

export interface PresenceInfo {
  userId: string;
  cursor?: {
    path: string;
    position: number;
  };
  selection?: {
    path: string;
    start: number;
    end: number;
  };
  lastUpdate: number;
}

export interface ConflictResolution {
  operations: SyncOperation[];
  newVersion: number;
  timestamp: number;
}

export interface SyncState {
  version: number;
  operations: SyncOperation[];
  timestamp: number;
} 