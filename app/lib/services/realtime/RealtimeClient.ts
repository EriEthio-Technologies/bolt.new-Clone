import { Service } from 'typedi';
import { validateEnv } from '~/config/env.server';
import type { 
  WebSocketMessage, 
  SyncOperation, 
  PresenceInfo,
  SyncState,
  ConflictResolution 
} from '~/types/realtime';

@Service()
export class RealtimeClient {
  private ws: WebSocket;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000; // Start with 1 second
  private messageQueue: WebSocketMessage[] = [];
  private syncState: SyncState = {
    version: 0,
    operations: [],
    timestamp: Date.now()
  };

  private readonly handlers = {
    sync: new Set<(operations: SyncOperation[]) => void>(),
    presence: new Set<(presence: PresenceInfo[]) => void>(),
    conflict: new Set<(resolution: ConflictResolution) => void>(),
    error: new Set<(error: string) => void>(),
    connectionState: new Set<(state: boolean) => void>()
  };

  constructor() {
    const env = validateEnv();
    this.connect(`ws://${env.WS_HOST}:${env.WS_PORT}`);
  }

  public onSync(handler: (operations: SyncOperation[]) => void): () => void {
    this.handlers.sync.add(handler);
    return () => this.handlers.sync.delete(handler);
  }

  public onPresence(handler: (presence: PresenceInfo[]) => void): () => void {
    this.handlers.presence.add(handler);
    return () => this.handlers.presence.delete(handler);
  }

  public onConflict(handler: (resolution: ConflictResolution) => void): () => void {
    this.handlers.conflict.add(handler);
    return () => this.handlers.conflict.delete(handler);
  }

  public onError(handler: (error: string) => void): () => void {
    this.handlers.error.add(handler);
    return () => this.handlers.error.delete(handler);
  }

  public onConnectionState(handler: (state: boolean) => void): () => void {
    this.handlers.connectionState.add(handler);
    return () => this.handlers.connectionState.delete(handler);
  }

  public sendOperation(operation: SyncOperation): void {
    const message: WebSocketMessage = {
      type: 'sync',
      operations: [operation]
    };

    this.sendMessage(message);
    this.syncState.operations.push(operation);
    this.syncState.version++;
  }

  public updatePresence(presence: Omit<PresenceInfo, 'lastUpdate'>): void {
    const message: WebSocketMessage = {
      type: 'presence',
      presence: {
        ...presence,
        lastUpdate: Date.now()
      }
    };

    this.sendMessage(message);
  }

  public resolveConflict(resolution: ConflictResolution): void {
    const message: WebSocketMessage = {
      type: 'conflict',
      resolution
    };

    this.sendMessage(message);
    this.syncState = {
      version: resolution.newVersion,
      operations: resolution.operations,
      timestamp: resolution.timestamp
    };
  }

  private connect(url: string): void {
    try {
      this.ws = new WebSocket(url);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.handleConnectionFailure();
    }
  }

  private setupWebSocketHandlers(): void {
    this.ws.addEventListener('open', () => {
      this.handleConnectionSuccess();
    });

    this.ws.addEventListener('message', (event) => {
      this.handleMessage(JSON.parse(event.data));
    });

    this.ws.addEventListener('close', () => {
      this.handleConnectionClosed();
    });

    this.ws.addEventListener('error', (error) => {
      this.handleConnectionError(error);
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'sync':
        if (message.operations) {
          this.handlers.sync.forEach(handler => handler(message.operations!));
        }
        break;

      case 'presence_update':
        if (message.presence) {
          this.handlers.presence.forEach(handler => handler([message.presence!]));
        }
        break;

      case 'conflict':
        if (message.resolution) {
          this.handlers.conflict.forEach(handler => handler(message.resolution!));
        }
        break;

      case 'error':
        if (message.error) {
          this.handlers.error.forEach(handler => handler(message.error!));
        }
        break;

      case 'ping':
        this.sendMessage({ type: 'pong' });
        break;
    }
  }

  private sendMessage(message: WebSocketMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  private handleConnectionSuccess(): void {
    this.reconnectAttempts = 0;
    this.handlers.connectionState.forEach(handler => handler(true));
    
    // Send queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) this.sendMessage(message);
    }
  }

  private handleConnectionFailure(): void {
    this.handlers.connectionState.forEach(handler => handler(false));
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(`ws://${validateEnv().WS_HOST}:${validateEnv().WS_PORT}`);
      }, delay);
    } else {
      this.handlers.error.forEach(handler => 
        handler('Maximum reconnection attempts reached')
      );
    }
  }

  private handleConnectionClosed(): void {
    this.handlers.connectionState.forEach(handler => handler(false));
    this.handleConnectionFailure();
  }

  private handleConnectionError(error: Event): void {
    console.error('WebSocket error:', error);
    this.handlers.error.forEach(handler => 
      handler('WebSocket connection error')
    );
  }

  public cleanup(): void {
    if (this.ws) {
      this.ws.close();
    }
    
    // Clear all handlers
    Object.values(this.handlers).forEach(handlerSet => handlerSet.clear());
  }
} 