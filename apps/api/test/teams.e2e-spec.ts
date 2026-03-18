import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  createTestApp,
  cleanDatabase,
  registerTestUser,
  createTestWorkspace,
} from './setup';

describe('Teams (e2e)', () => {
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

  async function setupWorkspaceWithMember() {
    const owner = await registerTestUser(app);
    const member = await registerTestUser(app);
    const ws = await createTestWorkspace(app, owner.accessToken);

    // Invite and join member
    const inviteRes = await request(app.getHttpServer())
      .post(`/workspaces/${ws.id}/invite`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ email: member.email })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/workspaces/join/${inviteRes.body.token}`)
      .set('Authorization', `Bearer ${member.accessToken}`)
      .expect(201);

    return { owner, member, ws };
  }

  describe('POST /workspaces/:wid/teams', () => {
    it('should create a team and set creator as LEAD', async () => {
      const { owner, ws } = await setupWorkspaceWithMember();

      const res = await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/teams`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Design Team' })
        .expect(201);

      expect(res.body.name).toBe('Design Team');
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].role).toBe('LEAD');
    });
  });

  describe('GET /workspaces/:wid/teams', () => {
    it('should list teams in workspace', async () => {
      const { owner, ws } = await setupWorkspaceWithMember();

      await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/teams`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Team A' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/teams`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Team B' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/workspaces/${ws.id}/teams`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
    });
  });

  describe('POST /workspaces/:wid/teams/:tid/members', () => {
    it('should add a member to a team', async () => {
      const { owner, member, ws } = await setupWorkspaceWithMember();

      // Create team
      const teamRes = await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/teams`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Dev Team' })
        .expect(201);

      // Get member's userId via profile
      const memberProfile = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${member.accessToken}`)
        .expect(200);

      // Add member
      const res = await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/teams/${teamRes.body.id}/members`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ userId: memberProfile.body.id })
        .expect(201);

      expect(res.body).toHaveProperty('teamId');
      expect(res.body).toHaveProperty('userId');
    });
  });

  describe('DELETE /workspaces/:wid/teams/:tid/members/:uid', () => {
    it('should remove a member from a team', async () => {
      const { owner, member, ws } = await setupWorkspaceWithMember();

      const teamRes = await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/teams`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Dev Team' })
        .expect(201);

      const memberProfile = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${member.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/teams/${teamRes.body.id}/members`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ userId: memberProfile.body.id })
        .expect(201);

      await request(app.getHttpServer())
        .delete(
          `/workspaces/${ws.id}/teams/${teamRes.body.id}/members/${memberProfile.body.id}`,
        )
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);
    });
  });

  describe('DELETE /workspaces/:wid/teams/:tid', () => {
    it('should delete a team', async () => {
      const { owner, ws } = await setupWorkspaceWithMember();

      const teamRes = await request(app.getHttpServer())
        .post(`/workspaces/${ws.id}/teams`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Temp Team' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/workspaces/${ws.id}/teams/${teamRes.body.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      // Should be gone
      const listRes = await request(app.getHttpServer())
        .get(`/workspaces/${ws.id}/teams`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(listRes.body).toHaveLength(0);
    });
  });
});
