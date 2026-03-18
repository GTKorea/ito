import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  createTestApp,
  cleanDatabase,
  registerTestUser,
  createTestWorkspace,
} from './setup';

describe('Threads (e2e)', () => {
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

  async function setupChainScenario() {
    const userA = await registerTestUser(app);
    const userB = await registerTestUser(app);
    const userC = await registerTestUser(app);
    const ws = await createTestWorkspace(app, userA.accessToken);

    // Invite B and C to workspace
    for (const user of [userB, userC]) {
      const inv = await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/invite`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ email: user.email })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/workspaces/join/${inv.body.token}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(201);
    }

    const userBId = await getUserId(userB.accessToken);
    const userCId = await getUserId(userC.accessToken);

    // A creates a todo
    const todoRes = await request(app.getHttpServer())
      .post(`/workspaces/${ws.id}/todos`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ title: 'Chain Task' })
      .expect(201);

    return { userA, userB, userC, userBId, userCId, ws, todo: todoRes.body };
  }

  describe('POST /todos/:todoId/connect', () => {
    it('should connect a todo to another user', async () => {
      const { userA, userBId, todo } = await setupChainScenario();

      const res = await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ toUserId: userBId, message: 'Please review' })
        .expect(201);

      expect(res.body.fromUser).toBeDefined();
      expect(res.body.toUser).toBeDefined();
      expect(res.body.chainIndex).toBe(0);
    });

    it('should prevent self-connection', async () => {
      const { userA, todo } = await setupChainScenario();
      const userAId = await getUserId(userA.accessToken);

      await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ toUserId: userAId })
        .expect(400);
    });

    it('should prevent non-assignee from connecting', async () => {
      const { userB, userCId, todo } = await setupChainScenario();

      // B is not the assignee, should get 403 even when trying to connect to C
      await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ toUserId: userCId })
        .expect(403);
    });

    it('should allow circular thread connection (A->B->A)', async () => {
      const { userA, userB, userBId, todo } = await setupChainScenario();
      const userAId = await getUserId(userA.accessToken);

      // A -> B
      await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ toUserId: userBId })
        .expect(201);

      // B -> A (circular, should now succeed)
      const res = await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ toUserId: userAId })
        .expect(201);

      expect(res.body.chainIndex).toBe(1);
    });

    it('should allow circular connection to intermediate user (A->B->C->B)', async () => {
      const { userA, userB, userC, userBId, userCId, todo } =
        await setupChainScenario();

      // A -> B
      await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ toUserId: userBId })
        .expect(201);

      // B -> C
      await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ toUserId: userCId })
        .expect(201);

      // C -> B (circular back to intermediate user, should succeed)
      const res = await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userC.accessToken}`)
        .send({ toUserId: userBId })
        .expect(201);

      expect(res.body.chainIndex).toBe(2);
    });

    it('should allow chaining: A -> B -> C', async () => {
      const { userA, userB, userBId, userCId, todo } =
        await setupChainScenario();

      // A -> B
      await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ toUserId: userBId })
        .expect(201);

      // B -> C
      const res = await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ toUserId: userCId })
        .expect(201);

      expect(res.body.chainIndex).toBe(1);
    });
  });

  describe('POST /thread-links/:id/resolve', () => {
    it('should resolve and snap back to previous user', async () => {
      const { userA, userB, userBId, todo } = await setupChainScenario();

      // A -> B
      const connectRes = await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ toUserId: userBId })
        .expect(201);

      // B resolves
      const resolveRes = await request(app.getHttpServer())
        .post(`/thread-links/${connectRes.body.id}/resolve`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(201);

      expect(resolveRes.body.snapBackTo).toBeDefined();

      // Todo should now be assigned back to A
      const todoRes = await request(app.getHttpServer())
        .get(`/todos/${todo.id}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      const userAId = await getUserId(userA.accessToken);
      expect(todoRes.body.assigneeId).toBe(userAId);
      expect(todoRes.body.status).toBe('IN_PROGRESS');
    });

    it('should allow reconnection to a previously resolved user', async () => {
      const { userA, userB, userBId, todo } = await setupChainScenario();

      // A -> B
      const connectRes = await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ toUserId: userBId })
        .expect(201);

      // B resolves -> snap back to A
      await request(app.getHttpServer())
        .post(`/thread-links/${connectRes.body.id}/resolve`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(201);

      // A reconnects to B (should succeed, B's link is COMPLETED)
      const reconnectRes = await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ toUserId: userBId })
        .expect(201);

      expect(reconnectRes.body.chainIndex).toBe(1);
    });

    it('should snap back through chain: C resolves -> B gets it, B resolves -> A gets it', async () => {
      const { userA, userB, userC, userBId, userCId, todo } =
        await setupChainScenario();

      // A -> B
      await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ toUserId: userBId })
        .expect(201);

      // B -> C
      const linkBC = await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ toUserId: userCId })
        .expect(201);

      // C resolves -> snaps back to B
      await request(app.getHttpServer())
        .post(`/thread-links/${linkBC.body.id}/resolve`)
        .set('Authorization', `Bearer ${userC.accessToken}`)
        .expect(201);

      // Check: B should be the assignee now, status should be IN_PROGRESS
      let todoCheck = await request(app.getHttpServer())
        .get(`/todos/${todo.id}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      expect(todoCheck.body.assigneeId).toBe(userBId);

      // B's link should be PENDING again
      const chain = await request(app.getHttpServer())
        .get(`/todos/${todo.id}/chain`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      const bLink = chain.body.find(
        (l: any) => l.toUserId === userBId && l.status === 'PENDING',
      );
      expect(bLink).toBeDefined();

      // B resolves -> snaps back to A
      await request(app.getHttpServer())
        .post(`/thread-links/${bLink.id}/resolve`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(201);

      todoCheck = await request(app.getHttpServer())
        .get(`/todos/${todo.id}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      const userAId = await getUserId(userA.accessToken);
      expect(todoCheck.body.assigneeId).toBe(userAId);
      expect(todoCheck.body.status).toBe('IN_PROGRESS');
    });

    it('should return 403 when non-recipient tries to resolve', async () => {
      const { userA, userBId, todo } = await setupChainScenario();

      const connectRes = await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ toUserId: userBId })
        .expect(201);

      // A tries to resolve (not the recipient)
      await request(app.getHttpServer())
        .post(`/thread-links/${connectRes.body.id}/resolve`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(403);
    });
  });

  describe('GET /todos/:todoId/chain', () => {
    it('should return ordered thread links', async () => {
      const { userA, userB, userBId, userCId, todo } =
        await setupChainScenario();

      // A -> B
      await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ toUserId: userBId })
        .expect(201);

      // B -> C
      await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ toUserId: userCId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/todos/${todo.id}/chain`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].chainIndex).toBe(0);
      expect(res.body[1].chainIndex).toBe(1);
    });
  });

  describe('GET /threads/mine', () => {
    it('should return incoming and outgoing threads', async () => {
      const { userA, userB, userBId, ws, todo } = await setupChainScenario();

      // A -> B
      await request(app.getHttpServer())
        .post(`/todos/${todo.id}/connect`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ toUserId: userBId })
        .expect(201);

      // B should see incoming
      const bThreads = await request(app.getHttpServer())
        .get(`/threads/mine?workspaceId=${ws.id}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(bThreads.body.incoming).toHaveLength(1);

      // A should see outgoing
      const aThreads = await request(app.getHttpServer())
        .get(`/threads/mine?workspaceId=${ws.id}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      expect(aThreads.body.outgoing).toHaveLength(1);
    });
  });
});
