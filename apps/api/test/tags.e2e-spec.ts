import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createTestApp, cleanDatabase, registerTestUser, createTestWorkspace } from './setup';

describe('Tags (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  async function setupGroupWithUser() {
    const user = await registerTestUser(app);
    const workspace = await createTestWorkspace(app, user.accessToken);
    const groupRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspace.id}/task-groups`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Dev Team' })
      .expect(201);
    return { user, workspace, group: groupRes.body };
  }

  it('should create a tag in a group', async () => {
    const { user, group } = await setupGroupWithUser();
    const res = await request(app.getHttpServer())
      .post(`/task-groups/${group.id}/tags`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Bug', color: '#EF4444' })
      .expect(201);

    expect(res.body.name).toBe('Bug');
    expect(res.body.color).toBe('#EF4444');
    expect(res.body.taskGroupId).toBe(group.id);
  });

  it('should list tags in a group', async () => {
    const { user, group } = await setupGroupWithUser();
    await request(app.getHttpServer())
      .post(`/task-groups/${group.id}/tags`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Bug' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/task-groups/${group.id}/tags`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Feature' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/task-groups/${group.id}/tags`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
  });

  it('should reject duplicate tag names in same group', async () => {
    const { user, group } = await setupGroupWithUser();
    await request(app.getHttpServer())
      .post(`/task-groups/${group.id}/tags`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Bug' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/task-groups/${group.id}/tags`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Bug' })
      .expect(409);
  });

  it('should add and remove tag from task', async () => {
    const { user, workspace, group } = await setupGroupWithUser();

    const tagRes = await request(app.getHttpServer())
      .post(`/task-groups/${group.id}/tags`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Bug' })
      .expect(201);

    const taskRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspace.id}/tasks`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ title: 'Fix bug', taskGroupId: group.id })
      .expect(201);

    // Add tag
    await request(app.getHttpServer())
      .post(`/tasks/${taskRes.body.id}/tags`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ tagId: tagRes.body.id })
      .expect(201);

    // Remove tag
    await request(app.getHttpServer())
      .delete(`/tasks/${taskRes.body.id}/tags/${tagRes.body.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);
  });

  it('should sync system group name on user profile update', async () => {
    const user = await registerTestUser(app);
    const workspace = await createTestWorkspace(app, user.accessToken);

    // Find the system group
    const groupsRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspace.id}/task-groups`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    const systemGroup = groupsRes.body.groups.find((g: { isSystem: boolean }) => g.isSystem);
    expect(systemGroup.name).toBe(user.name);

    // Update user name
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'New Name' })
      .expect(200);

    // Check system group name updated
    const groupsRes2 = await request(app.getHttpServer())
      .get(`/workspaces/${workspace.id}/task-groups`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    const updatedGroup = groupsRes2.body.groups.find((g: { isSystem: boolean }) => g.isSystem);
    expect(updatedGroup.name).toBe('New Name');
  });

  it('should update and delete a tag', async () => {
    const { user, group } = await setupGroupWithUser();
    const tagRes = await request(app.getHttpServer())
      .post(`/task-groups/${group.id}/tags`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Bug', color: '#EF4444' })
      .expect(201);

    // Update
    const updateRes = await request(app.getHttpServer())
      .patch(`/tags/${tagRes.body.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Critical Bug', color: '#DC2626' })
      .expect(200);

    expect(updateRes.body.name).toBe('Critical Bug');
    expect(updateRes.body.color).toBe('#DC2626');

    // Delete
    await request(app.getHttpServer())
      .delete(`/tags/${tagRes.body.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    // Verify deleted
    const listRes = await request(app.getHttpServer())
      .get(`/task-groups/${group.id}/tags`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(listRes.body).toHaveLength(0);
  });
});
