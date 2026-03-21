import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  createTestApp,
  cleanDatabase,
  registerTestUser,
  createTestWorkspace,
} from './setup';

describe('Notifications (e2e)', () => {
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

  async function getUserId(token: string) {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body.id as string;
  }

  async function setupWithThread() {
    const userA = await registerTestUser(app);
    const userB = await registerTestUser(app);
    const ws = await createTestWorkspace(app, userA.accessToken);

    // Invite B
    const inv = await request(app.getHttpServer())
      .post(`/workspaces/${ws.id}/invite`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ email: userB.email })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/workspaces/join/${inv.body.token}`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .expect(201);

    const userBId = await getUserId(userB.accessToken);

    // Create task
    const taskRes = await request(app.getHttpServer())
      .post(`/workspaces/${ws.id}/tasks`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ title: 'Notify Task' })
      .expect(201);

    // A -> B (creates THREAD_RECEIVED notification for B)
    const link = await request(app.getHttpServer())
      .post(`/tasks/${taskRes.body.id}/connect`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ toUserId: userBId })
      .expect(201);

    return { userA, userB, userBId, ws, task: taskRes.body, link: link.body };
  }

  describe('Thread connect creates notification', () => {
    it('should create THREAD_RECEIVED notification for target user', async () => {
      const { userB } = await setupWithThread();

      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const threadNotif = res.body.find(
        (n: any) => n.type === 'THREAD_RECEIVED',
      );
      expect(threadNotif).toBeDefined();
      expect(threadNotif.read).toBe(false);
    });
  });

  describe('GET /notifications', () => {
    it('should return notifications for the user', async () => {
      const { userB } = await setupWithThread();

      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by unreadOnly', async () => {
      const { userB } = await setupWithThread();

      const res = await request(app.getHttpServer())
        .get('/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.every((n: any) => n.read === false)).toBe(true);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const { userB } = await setupWithThread();

      const listRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      const notifId = listRes.body[0].id;

      await request(app.getHttpServer())
        .patch(`/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      // Verify it's read
      const afterRes = await request(app.getHttpServer())
        .get('/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      const found = afterRes.body.find((n: any) => n.id === notifId);
      expect(found).toBeUndefined(); // should not appear in unread
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const { userB } = await setupWithThread();

      await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(res.body).toHaveLength(0);
    });
  });
});
