import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../server';
import { prisma } from '../lib/prisma.server';
import supertest from 'supertest';
import { hash } from 'bcryptjs';

describe('Authentication Integration Tests', () => {
  let app: any;
  let server: any;
  let testUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
  };

  beforeAll(async () => {
    app = await createServer();
    server = app.listen(0);
    // Create test user
    const hashedPassword = await hash(testUser.password, 10);
    await prisma.user.create({
      data: {
        email: testUser.email,
        password: hashedPassword,
        name: testUser.name
      }
    });
  });

  afterAll(async () => {
    await prisma.user.delete({
      where: { email: testUser.email }
    });
    await prisma.$disconnect();
    await server.close();
  });

  test('should login successfully with valid credentials', async () => {
    const response = await supertest(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.token).toBeTruthy();
  });

  test('should fail login with invalid credentials', async () => {
    const response = await supertest(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
  });

  test('should register new user successfully', async () => {
    const newUser = {
      email: 'newuser@example.com',
      password: 'newpassword123',
      name: 'New User'
    };

    const response = await supertest(app)
      .post('/api/auth/register')
      .send(newUser);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email', newUser.email);

    // Cleanup
    await prisma.user.delete({
      where: { email: newUser.email }
    });
  });
});