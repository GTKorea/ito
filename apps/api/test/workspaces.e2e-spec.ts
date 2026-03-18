import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  createTestApp,
  cleanDatabase,
  registerTestUser,
  createTestWorkspace,
} from './setup';

describe('Workspaces (e2e)', () => {
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

  describe('POST /workspaces', () => {
    it('should create a workspace and set creator as OWNER', async () => {
      const user = await registerTestUser(app);

      const res = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Test WS', slug: 'test-ws' })
        .expect(201);

      expect(res.body.name).toBe('Test WS');
      expect(res.body.slug).toBe('test-ws');
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].role).toBe('OWNER');
    });

    it('should return 409 for duplicate slug', async () => {
      const user = await registerTestUser(app);

      await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'First', slug: 'dup-slug' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Second', slug: 'dup-slug' })
        .expect(409);
    });
  });

  describe('GET /workspaces', () => {
    it('should return only workspaces user is a member of', async () => {
      const user1 = await registerTestUser(app);
      const user2 = await registerTestUser(app);

      await createTestWorkspace(app, user1.accessToken, {
        name: 'WS1',
        slug: 'ws1',
      });
      await createTestWorkspace(app, user2.accessToken, {
        name: 'WS2',
        slug: 'ws2',
      });

      const res = await request(app.getHttpServer())
        .get('/workspaces')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('WS1');
    });
  });

  describe('GET /workspaces/:id', () => {
    it('should return workspace details', async () => {
      const user = await registerTestUser(app);
      const ws = await createTestWorkspace(app, user.accessToken, {
        name: 'Detail WS',
        slug: 'detail-ws',
      });

      const res = await request(app.getHttpServer())
        .get(`/workspaces/${ws.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(res.body.name).toBe('Detail WS');
      expect(res.body.members).toBeDefined();
      expect(res.body._count).toBeDefined();
    });
  });

  describe('Invite flow', () => {
    it('should invite a user and accept the invite', async () => {
      const owner = await registerTestUser(app);
      const member = await registerTestUser(app);
      const ws = await createTestWorkspace(app, owner.accessToken);

      // Invite
      const inviteRes = await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/invite`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ email: member.email })
        .expect(201);

      expect(inviteRes.body).toHaveProperty('token');

      // Accept invite
      const joinRes = await request(app.getHttpServer())
        .post(`/workspaces/join/${inviteRes.body.token}`)
        .set('Authorization', `Bearer ${member.accessToken}`)
        .expect(201);

      expect(joinRes.body).toHaveProperty('userId');
      expect(joinRes.body.role).toBe('MEMBER');

      // Member should now see the workspace
      const wsListRes = await request(app.getHttpServer())
        .get('/workspaces')
        .set('Authorization', `Bearer ${member.accessToken}`)
        .expect(200);

      expect(wsListRes.body).toHaveLength(1);
    });

    it('should handle already a member gracefully', async () => {
      const owner = await registerTestUser(app);
      const ws = await createTestWorkspace(app, owner.accessToken);

      // Invite self
      const inviteRes = await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/invite`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ email: owner.email })
        .expect(201);

      // Try to join (already a member)
      const joinRes = await request(app.getHttpServer())
        .post(`/workspaces/join/${inviteRes.body.token}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(201);

      expect(joinRes.body.message).toBe('Already a member');
    });
  });
});
