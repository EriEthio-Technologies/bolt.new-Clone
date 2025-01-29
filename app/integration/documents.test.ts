import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from '../server';
import { prisma } from '../lib/prisma.server';
import supertest from 'supertest';
import { hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';

describe('Document Operations Integration Tests', () => {
  let app: any;
  let server: any;
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    app = await createServer();
    server = app.listen(0);

    // Create test user
    const hashedPassword = await hash('password123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'doctest@example.com',
        password: hashedPassword,
        name: 'Doc Test User'
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
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    await prisma.$disconnect();
    await server.close();
  });

  beforeEach(async () => {
    // Clean up any documents from previous tests
    await prisma.document.deleteMany({
      where: { authorId: testUser.id }
    });
  });

  test('should create a new document', async () => {
    const response = await supertest(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Document',
        content: 'Test content'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Test Document');
    expect(response.body.content).toBe('Test content');
  });

  test('should retrieve a document', async () => {
    // Create a document first
    const doc = await prisma.document.create({
      data: {
        title: 'Get Test Doc',
        content: 'Get test content',
        authorId: testUser.id
      }
    });

    const response = await supertest(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', doc.id);
    expect(response.body.title).toBe('Get Test Doc');
  });

  test('should update a document', async () => {
    // Create a document first
    const doc = await prisma.document.create({
      data: {
        title: 'Update Test Doc',
        content: 'Original content',
        authorId: testUser.id
      }
    });

    const response = await supertest(app)
      .put(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        content: 'Updated content'
      });

    expect(response.status).toBe(200);
    expect(response.body.content).toBe('Updated content');
  });

  test('should delete a document', async () => {
    // Create a document first
    const doc = await prisma.document.create({
      data: {
        title: 'Delete Test Doc',
        content: 'To be deleted',
        authorId: testUser.id
      }
    });

    const response = await supertest(app)
      .delete(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(204);

    // Verify deletion
    const deletedDoc = await prisma.document.findUnique({
      where: { id: doc.id }
    });
    expect(deletedDoc).toBeNull();
  });
});