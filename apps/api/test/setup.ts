import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

// Set test env vars before module loads
process.env.DATABASE_URL =
  'postgresql://hjick@localhost:5432/ito_test?schema=public';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRATION = '15m';
process.env.JWT_REFRESH_EXPIRATION = '7d';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  // Single TRUNCATE statement avoids lock deadlocks between tables
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "CalendarIntegration", "File", "Activity", "NotificationPreference", "Notification", "ThreadLink", "Todo", "TeamMember", "Team", "SlackUser", "SlackWorkspace", "WorkspaceMember", "WorkspaceInvite", "Workspace", "RefreshToken", "User" CASCADE`,
  );
}

let counter = 0;

export async function registerTestUser(
  app: INestApplication,
  overrides?: { email?: string; name?: string; password?: string },
) {
  counter++;
  const email = overrides?.email || `testuser${counter}-${Date.now()}@test.com`;
  const password = overrides?.password || 'testpassword123';
  const name = overrides?.name || `Test User ${counter}`;

  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password, name })
    .expect(201);

  return {
    accessToken: res.body.accessToken as string,
    refreshToken: res.body.refreshToken as string,
    email,
    password,
    name,
  };
}

export async function createTestWorkspace(
  app: INestApplication,
  token: string,
  overrides?: { name?: string; slug?: string },
) {
  counter++;
  const name = overrides?.name || `Workspace ${counter}`;
  const slug = overrides?.slug || `workspace-${counter}-${Date.now()}`;

  const res = await request(app.getHttpServer())
    .post('/workspaces')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, slug })
    .expect(201);

  return res.body;
}
