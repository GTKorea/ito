import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  createTestApp,
  cleanDatabase,
  registerTestUser,
  createTestWorkspace,
} from './setup';

describe('Todos (e2e)', () => {
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

  async function setupWorkspaceWithTodo() {
    const owner = await registerTestUser(app);
    const ws = await createTestWorkspace(app, owner.accessToken);

    const todoRes = await request(app.getHttpServer())
      .post(`/workspaces/${ws.id}/todos`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Test Todo', description: 'A test task', priority: 'HIGH' })
      .expect(201);

    return { owner, ws, todo: todoRes.body };
  }

  describe('POST /workspaces/:wid/todos', () => {
    it('should create a todo', async () => {
      const owner = await registerTestUser(app);
      const ws = await createTestWorkspace(app, owner.accessToken);

      const res = await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/todos`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          title: 'New Task',
          description: 'Description here',
          priority: 'MEDIUM',
          dueDate: '2026-12-31',
        })
        .expect(201);

      expect(res.body.title).toBe('New Task');
      expect(res.body.description).toBe('Description here');
      expect(res.body.priority).toBe('MEDIUM');
      expect(res.body.creator).toBeDefined();
      expect(res.body.assignee).toBeDefined();
      expect(res.body.creator.id).toBe(res.body.assignee.id);
    });

    it('should return 400 for missing title', async () => {
      const owner = await registerTestUser(app);
      const ws = await createTestWorkspace(app, owner.accessToken);

      await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/todos`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ description: 'No title' })
        .expect(400);
    });
  });

  describe('GET /workspaces/:wid/todos', () => {
    it('should list todos in workspace', async () => {
      const { owner, ws } = await setupWorkspaceWithTodo();

      const res = await request(app.getHttpServer())
        .get(`/workspaces/${ws.id}/todos`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by assignedToMe', async () => {
      const { owner, ws } = await setupWorkspaceWithTodo();

      const res = await request(app.getHttpServer())
        .get(`/workspaces/${ws.id}/todos?assignedToMe=true`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by status', async () => {
      const { owner, ws } = await setupWorkspaceWithTodo();

      const res = await request(app.getHttpServer())
        .get(`/workspaces/${ws.id}/todos?status=OPEN`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /todos/:id', () => {
    it('should return todo details with thread links', async () => {
      const { owner, todo } = await setupWorkspaceWithTodo();

      const res = await request(app.getHttpServer())
        .get(`/todos/${todo.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(todo.id);
      expect(res.body.threadLinks).toBeDefined();
      expect(res.body.creator).toBeDefined();
    });

    it('should return 404 for non-existent todo', async () => {
      const owner = await registerTestUser(app);

      await request(app.getHttpServer())
        .get('/todos/non-existent-id')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /todos/:id', () => {
    it('should update todo title and status', async () => {
      const { owner, todo } = await setupWorkspaceWithTodo();

      const res = await request(app.getHttpServer())
        .patch(`/todos/${todo.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Updated Title', status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body.title).toBe('Updated Title');
      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('should set completedAt when status is COMPLETED', async () => {
      const { owner, todo } = await setupWorkspaceWithTodo();

      const res = await request(app.getHttpServer())
        .patch(`/todos/${todo.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(res.body.completedAt).toBeTruthy();
    });

    it('should return 403 for non-creator/non-assignee', async () => {
      const { ws, todo } = await setupWorkspaceWithTodo();
      const other = await registerTestUser(app);

      // Join workspace
      const inviteRes = await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/invite`)
        .set('Authorization', `Bearer ${(await registerTestUser(app)).accessToken}`)
        .send({ email: other.email });

      // other user tries to update
      await request(app.getHttpServer())
        .patch(`/todos/${todo.id}`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send({ title: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE /todos/:id', () => {
    it('should delete a todo by creator', async () => {
      const { owner, todo } = await setupWorkspaceWithTodo();

      await request(app.getHttpServer())
        .delete(`/todos/${todo.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      // Should be gone
      await request(app.getHttpServer())
        .get(`/todos/${todo.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(404);
    });

    it('should return 403 for non-creator', async () => {
      const { ws, todo } = await setupWorkspaceWithTodo();
      const other = await registerTestUser(app);

      await request(app.getHttpServer())
        .delete(`/todos/${todo.id}`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .expect(403);
    });
  });
});
