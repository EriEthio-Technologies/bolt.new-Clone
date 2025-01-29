import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../server';
import { prisma } from '../lib/prisma.server';
import { WebSocket } from 'ws';
import { hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';

describe('Collaboration Integration Tests', () => {
  let app: any;
  let server: any;
  let wsServer: any;
  let authToken: string;
  let testUser: any;
  let testDoc: any;

  beforeAll(async () => {
    app = await createServer();
    server = app.listen(0);
    const port = (server.address() as any).port;
    wsServer = `ws://localhost:${port}`;

    // Create test user
    const hashedPassword = await hash('password123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'wstest@example.com',
        password: hashedPassword,
        name: 'WS Test User'
      }
    });

    // Create test document
    testDoc = await prisma.document.create({
      data: {
        title: 'Collab Test Doc',
        content: 'Initial content',
        authorId: testUser.id
      }
    });

    // Generate auth token
    authToken = sign(
      { userId: testUser.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.document.delete({
      where: { id: testDoc.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    await prisma.$disconnect();
    await server.close();
  });

  test('should connect to websocket server', (done) => {
    const ws = new WebSocket(`${wsServer}/collaboration?token=${authToken}`);

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });
  });

  test('should join document session', (done) => {
    const ws = new WebSocket(`${wsServer}/collaboration?token=${authToken}`);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'join',
        documentId: testDoc.id
      }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.type).toBe('joined');
      expect(message.documentId).toBe(testDoc.id);
      ws.close();
      done();
    });
  });

  test('should broadcast document changes', (done) => {
    const ws1 = new WebSocket(`${wsServer}/collaboration?token=${authToken}`);
    const ws2 = new WebSocket(`${wsServer}/collaboration?token=${authToken}`);
    
    let ws2Connected = false;

    ws1.on('open', () => {
      ws1.send(JSON.stringify({
        type: 'join',
        documentId: testDoc.id
      }));
    });

    ws2.on('open', () => {
      ws2Connected = true;
      ws2.send(JSON.stringify({
        type: 'join',
        documentId: testDoc.id
      }));
    });

    ws2.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'joined' && ws2Connected) {
        ws1.send(JSON.stringify({
          type: 'change',
          documentId: testDoc.id,
          change: {
            position: 0,
            insert: 'New content',
            delete: 0
          }
        }));
      }
      if (message.type === 'change') {
        expect(message.change.insert).toBe('New content');
        ws1.close();
        ws2.close();
        done();
      }
    });
  });
});