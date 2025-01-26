import { Service } from 'typedi';
import { WebSocket, WebSocketServer } from 'ws';
import { validateEnv } from '~/config/env.server';
import { ProcessingError } from '~/errors/ProcessingError';
import type { 
  WebSocketMessage, 
  WebSocketClient,
  PresenceInfo,
  SyncOperation,
  ConflictResolution 
} from '~/types/realtime';

@Service()
export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient>;
  private presence: Map<string, PresenceInfo>;
  private readonly heartbeatInterval = 30000; // 30 seconds

  constructor() {
    const env = validateEnv();
    this.clients = new Map();
    this.presence = new Map();

    this.wss = new WebSocketServer({
      port: parseInt(env.WS_PORT),
      clientTracking: true,
      perMessageDeflate: true
    });

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      const client: WebSocketClient = {
        id: clientId,
        ws,
        lastActivity: Date.now(),
        buffer: [],
        version: 0
      };

      this.clients.set(clientId, client);
      this.setupClientHandlers(client);
      this.broadcastPresence();
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  private setupClientHandlers(client: WebSocketClient): void {
    client.ws.on('message', async (data: string) => {
      try {
        const message: WebSocketMessage = JSON.parse(data);
        await this.handleMessage(client, message);
      } catch (error) {
        this.sendError(client, 'Invalid message format');
      }
    });

    client.ws.on('close', () => {
      this.handleClientDisconnect(client);
    });

    client.ws.on('error', (error) => {
      console.error(`Client ${client.id} error:`, error);
      this.handleClientError(client, error);
    });

    // Send initial state
    this.sendMessage(client, {
      type: 'connected',
      clientId: client.id,
      version: client.version
    });
  }

  private async handleMessage(
    client: WebSocketClient,
    message: WebSocketMessage
  ): Promise<void> {
    client.lastActivity = Date.now();

    switch (message.type) {
      case 'sync':
        await this.handleSync(client, message.operations);
        break;
      case 'presence':
        await this.handlePresenceUpdate(client, message.presence);
        break;
      case 'conflict':
        await this.handleConflict(client, message.resolution);
        break;
      case 'pong':
        // Heartbeat response
        break;
      default:
        this.sendError(client, 'Unknown message type');
    }
  }

  private async handleSync(
    client: WebSocketClient,
    operations: SyncOperation[]
  ): Promise<void> {
    try {
      // Apply version check
      if (operations[0]?.baseVersion !== client.version) {
        await this.handleVersionMismatch(client, operations);
        return;
      }

      // Apply operations
      for (const op of operations) {
        client.buffer.push(op);
        client.version++;
      }

      // Broadcast to other clients
      this.broadcastOperations(client, operations);
    } catch (error) {
      this.sendError(client, 'Sync failed');
    }
  }

  private async handleVersionMismatch(
    client: WebSocketClient,
    operations: SyncOperation[]
  ): Promise<void> {
    const conflictingOps = this.findConflictingOperations(
      client,
      operations[0].baseVersion
    );

    if (conflictingOps.length > 0) {
      this.sendMessage(client, {
        type: 'conflict',
        operations: conflictingOps,
        currentVersion: client.version
      });
    } else {
      // Fast-forward possible
      await this.handleSync(client, operations);
    }
  }

  private async handlePresenceUpdate(
    client: WebSocketClient,
    presence: PresenceInfo
  ): Promise<void> {
    this.presence.set(client.id, {
      ...presence,
      lastUpdate: Date.now()
    });
    this.broadcastPresence();
  }

  private async handleConflict(
    client: WebSocketClient,
    resolution: ConflictResolution
  ): Promise<void> {
    // Apply resolved operations
    client.buffer = resolution.operations;
    client.version = resolution.newVersion;

    // Broadcast resolution
    this.broadcastToAll({
      type: 'conflict_resolved',
      clientId: client.id,
      resolution
    });
  }

  private handleClientDisconnect(client: WebSocketClient): void {
    this.clients.delete(client.id);
    this.presence.delete(client.id);
    this.broadcastPresence();
  }

  private handleClientError(
    client: WebSocketClient,
    error: Error
  ): void {
    console.error(`Client ${client.id} error:`, error);
    this.sendError(client, 'Internal error occurred');
  }

  private broadcastOperations(
    sender: WebSocketClient,
    operations: SyncOperation[]
  ): void {
    const message: WebSocketMessage = {
      type: 'sync',
      clientId: sender.id,
      operations
    };

    this.broadcastToOthers(sender, message);
  }

  private broadcastPresence(): void {
    const presenceList = Array.from(this.presence.entries())
      .map(([id, info]) => ({
        clientId: id,
        ...info
      }));

    this.broadcastToAll({
      type: 'presence_update',
      presence: presenceList
    });
  }

  private broadcastToAll(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  private broadcastToOthers(
    sender: WebSocketClient,
    message: WebSocketMessage
  ): void {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (
        client.id !== sender.id && 
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(data);
      }
    });
  }

  private sendMessage(
    client: WebSocketClient,
    message: WebSocketMessage
  ): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private sendError(
    client: WebSocketClient,
    error: string
  ): void {
    this.sendMessage(client, {
      type: 'error',
      error
    });
  }

  private startHeartbeat(): void {
    setInterval(() => {
      const now = Date.now();
      this.clients.forEach(client => {
        if (now - client.lastActivity > this.heartbeatInterval * 2) {
          // Client hasn't responded to heartbeat
          client.ws.terminate();
          return;
        }

        this.sendMessage(client, { type: 'ping' });
      });
    }, this.heartbeatInterval);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private findConflictingOperations(
    client: WebSocketClient,
    baseVersion: number
  ): SyncOperation[] {
    return client.buffer
      .filter(op => op.version > baseVersion)
      .sort((a, b) => a.version - b.version);
  }
} 