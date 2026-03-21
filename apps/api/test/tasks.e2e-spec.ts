import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  createTestApp,
  cleanDatabase,
  registerTestUser,
  createTestWorkspace,
} from './setup';

describe('Tasks (e2e)', () => {
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

  async function setupWorkspaceWithTask() {
    const owner = await registerTestUser(app);
    const ws = await createTestWorkspace(app, owner.accessToken);

    const taskRes = await request(app.getHttpServer())
      .post(`/workspaces/${ws.id}/tasks`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Test Task', description: 'A test task', priority: 'HIGH' })
      .expect(201);

    return { owner, ws, task: taskRes.body };
  }

  describe('POST /workspaces/:wid/tasks', () => {
    it('should create a task', async () => {
      const owner = await registerTestUser(app);
      const ws = await createTestWorkspace(app, owner.accessToken);

      const res = await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/tasks`)
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
        .post(`/workspaces/${ws.id}/tasks`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ description: 'No title' })
        .expect(400);
    });
  });

  describe('GET /workspaces/:wid/tasks', () => {
    it('should list tasks in workspace', async () => {
      const { owner, ws } = await setupWorkspaceWithTask();

      const res = await request(app.getHttpServer())
        .get(`/workspaces/${ws.id}/tasks`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by assignedToMe', async () => {
      const { owner, ws } = await setupWorkspaceWithTask();

      const res = await request(app.getHttpServer())
        .get(`/workspaces/${ws.id}/tasks?assignedToMe=true`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by status', async () => {
      const { owner, ws } = await setupWorkspaceWithTask();

      const res = await request(app.getHttpServer())
        .get(`/workspaces/${ws.id}/tasks?status=OPEN`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should return task details with thread links', async () => {
      const { owner, task } = await setupWorkspaceWithTask();

      const res = await request(app.getHttpServer())
        .get(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(task.id);
      expect(res.body.threadLinks).toBeDefined();
      expect(res.body.creator).toBeDefined();
    });

    it('should return 404 for non-existent task', async () => {
      const owner = await registerTestUser(app);

      await request(app.getHttpServer())
        .get('/tasks/non-existent-id')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('should update task title and status', async () => {
      const { owner, task } = await setupWorkspaceWithTask();

      const res = await request(app.getHttpServer())
        .patch(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ title: 'Updated Title', status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body.title).toBe('Updated Title');
      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('should set completedAt when status is COMPLETED', async () => {
      const { owner, task } = await setupWorkspaceWithTask();

      const res = await request(app.getHttpServer())
        .patch(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(res.body.completedAt).toBeTruthy();
    });

    it('should return 403 for non-creator/non-assignee', async () => {
      const { ws, task } = await setupWorkspaceWithTask();
      const other = await registerTestUser(app);

      // Join workspace
      const inviteRes = await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/invite`)
        .set('Authorization', `Bearer ${(await registerTestUser(app)).accessToken}`)
        .send({ email: other.email });

      // other user tries to update
      await request(app.getHttpServer())
        .patch(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send({ title: 'Hacked' })
        .expect(403);
    });
  });

  describe('GET /workspaces/:wid/tasks/calendar', () => {
    it('should return completed and upcoming tasks for date range', async () => {
      const owner = await registerTestUser(app);
      const ws = await createTestWorkspace(app, owner.accessToken);

      // Create a task with a due date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const taskRes = await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/tasks`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          title: 'Calendar Task',
          priority: 'HIGH',
          dueDate: tomorrow.toISOString(),
        })
        .expect(201);

      // Complete the task
      await request(app.getHttpServer())
        .patch(`/tasks/${taskRes.body.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      // Create another task with due date (not completed)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/tasks`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          title: 'Upcoming Task',
          priority: 'MEDIUM',
          dueDate: nextWeek.toISOString(),
        })
        .expect(201);

      // Query calendar endpoint
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);

      const res = await request(app.getHttpServer())
        .get(`/workspaces/${ws.id}/tasks/calendar`)
        .query({
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        })
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body.completed).toBeDefined();
      expect(res.body.upcoming).toBeDefined();
      expect(res.body.completed.length).toBe(1);
      expect(res.body.completed[0].title).toBe('Calendar Task');
      expect(res.body.upcoming.length).toBe(1);
      expect(res.body.upcoming[0].title).toBe('Upcoming Task');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a task by creator', async () => {
      const { owner, task } = await setupWorkspaceWithTask();

      await request(app.getHttpServer())
        .delete(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      // Should be gone
      await request(app.getHttpServer())
        .get(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(404);
    });

    it('should return 403 for non-creator', async () => {
      const { ws, task } = await setupWorkspaceWithTask();
      const other = await registerTestUser(app);

      await request(app.getHttpServer())
        .delete(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .expect(403);
    });
  });
});
