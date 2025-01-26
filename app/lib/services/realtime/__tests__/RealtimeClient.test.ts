import { RealtimeClient } from '../RealtimeClient';
import { WebSocket as MockWebSocket } from 'mock-socket';
import type { WebSocketMessage, SyncOperation, PresenceInfo } from '~/types/realtime';

// Mock WebSocket
(global as any).WebSocket = MockWebSocket;

describe('RealtimeClient', () => {
  let client: RealtimeClient;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    client = new RealtimeClient();
    mockWs = (client as any).ws;
  });

  afterEach(() => {
    client.cleanup();
  });

  describe('connection handling', () => {
    it('should handle successful connection', (done) => {
      client.onConnectionState((state) => {
        expect(state).toBe(true);
        done();
      });

      mockWs.dispatchEvent(new Event('open'));
    });

    it('should handle connection failure', (done) => {
      client.onConnectionState((state) => {
        expect(state).toBe(false);
        done();
      });

      mockWs.dispatchEvent(new Event('close'));
    });

    it('should attempt reconnection on failure', () => {
      const connectSpy = jest.spyOn(client as any, 'connect');
      mockWs.dispatchEvent(new Event('close'));

      expect(connectSpy).toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    it('should handle sync messages', (done) => {
      const mockOperation: SyncOperation = {
        type: 'insert',
        path: 'test.ts',
        content: 'test content',
        version: 1,
        baseVersion: 0,
        timestamp: Date.now()
      };

      client.onSync((operations) => {
        expect(operations).toContainEqual(mockOperation);
        done();
      });

      const message: WebSocketMessage = {
        type: 'sync',
        operations: [mockOperation]
      };

      mockWs.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify(message)
      }));
    });

    it('should handle presence updates', (done) => {
      const mockPresence: PresenceInfo = {
        userId: 'test-user',
        cursor: {
          path: 'test.ts',
          position: 10
        },
        lastUpdate: Date.now()
      };

      client.onPresence((presence) => {
        expect(presence[0]).toEqual(mockPresence);
        done();
      });

      const message: WebSocketMessage = {
        type: 'presence_update',
        presence: mockPresence
      };

      mockWs.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify(message)
      }));
    });

    it('should handle error messages', (done) => {
      const errorMessage = 'Test error';

      client.onError((error) => {
        expect(error).toBe(errorMessage);
        done();
      });

      const message: WebSocketMessage = {
        type: 'error',
        error: errorMessage
      };

      mockWs.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify(message)
      }));
    });
  });

  describe('message sending', () => {
    it('should queue messages when connection is closed', () => {
      const message: WebSocketMessage = {
        type: 'sync',
        operations: []
      };

      // Close connection
      mockWs.readyState = WebSocket.CLOSED;
      (client as any).sendMessage(message);

      expect((client as any).messageQueue).toContainEqual(message);
    });

    it('should send queued messages when connection is restored', () => {
      const message: WebSocketMessage = {
        type: 'sync',
        operations: []
      };

      // Queue message
      mockWs.readyState = WebSocket.CLOSED;
      (client as any).sendMessage(message);

      // Restore connection
      mockWs.readyState = WebSocket.OPEN;
      (client as any).handleConnectionSuccess();

      expect((client as any).messageQueue).toHaveLength(0);
    });
  });

  describe('cleanup', () => {
    it('should clear all handlers on cleanup', () => {
      const syncHandler = jest.fn();
      const presenceHandler = jest.fn();
      
      client.onSync(syncHandler);
      client.onPresence(presenceHandler);
      
      client.cleanup();

      expect((client as any).handlers.sync.size).toBe(0);
      expect((client as any).handlers.presence.size).toBe(0);
    });
  });
}); 