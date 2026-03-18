import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  createTestApp,
  cleanDatabase,
  registerTestUser,
} from './setup';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'new@test.com',
          password: 'password123',
          name: 'New User',
        })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
    });

    it('should return 409 for duplicate email', async () => {
      await registerTestUser(app, { email: 'dup@test.com' });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'dup@test.com',
          password: 'password123',
          name: 'Dup User',
        })
        .expect(409);
    });

    it('should return 400 for invalid body', async () => {
      // Missing name
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'x@test.com', password: 'password123' })
        .expect(400);

      // Password too short
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'x@test.com', password: 'short', name: 'X' })
        .expect(400);

      // Invalid email
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'notanemail', password: 'password123', name: 'X' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const user = await registerTestUser(app, {
        email: 'login@test.com',
        password: 'mypassword123',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@test.com', password: 'mypassword123' })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should return 401 for wrong password', async () => {
      await registerTestUser(app, {
        email: 'wrong@test.com',
        password: 'correctpassword',
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'wrong@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 401 for non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should rotate tokens with valid refresh token', async () => {
      const user = await registerTestUser(app);

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      // Old refresh token should be invalidated (rotated)
      expect(res.body.refreshToken).not.toBe(user.refreshToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should return 401 when reusing a rotated refresh token', async () => {
      const user = await registerTestUser(app);

      // First refresh (valid)
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(201);

      // Second refresh with same token (should fail, already rotated)
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(401);
    });
  });

  describe('GET /users/me', () => {
    it('should return user profile with valid token', async () => {
      const user = await registerTestUser(app, { name: 'Profile User' });

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Profile User');
      expect(res.body.email).toBe(user.email);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });
  });
});
