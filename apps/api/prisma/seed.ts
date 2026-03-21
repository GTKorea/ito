import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Clean existing data ──────────────────────
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "CalendarIntegration", "File", "Activity", "Notification", "ThreadLink", "Task", "TeamMember", "Team", "SlackUser", "SlackWorkspace", "WorkspaceMember", "WorkspaceInvite", "Workspace", "RefreshToken", "User" CASCADE`,
  );

  // ── Users (6명) ──────────────────────────────
  const password = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.create({
    data: { email: 'alice@itothread.com', name: 'Alice Kim', passwordHash: password },
  });
  const bob = await prisma.user.create({
    data: { email: 'bob@itothread.com', name: 'Bob Park', passwordHash: password },
  });
  const charlie = await prisma.user.create({
    data: { email: 'charlie@itothread.com', name: 'Charlie Lee', passwordHash: password },
  });
  const diana = await prisma.user.create({
    data: { email: 'diana@itothread.com', name: 'Diana Choi', passwordHash: password },
  });
  const evan = await prisma.user.create({
    data: { email: 'evan@itothread.com', name: 'Evan Yoon', passwordHash: password },
  });
  const fiona = await prisma.user.create({
    data: { email: 'fiona@itothread.com', name: 'Fiona Han', passwordHash: password },
  });

  const users = [alice, bob, charlie, diana, evan, fiona];
  console.log(`✅ ${users.length} users created (password: password123)`);

  // ── Workspaces (2개) ─────────────────────────
  const ws1 = await prisma.workspace.create({
    data: {
      name: 'Krow Studio',
      slug: 'krow-studio',
      description: '크로우 스튜디오 — 제품 개발 워크스페이스',
    },
  });
  const ws2 = await prisma.workspace.create({
    data: {
      name: 'Side Project',
      slug: 'side-project',
      description: '사이드 프로젝트 실험실',
    },
  });
  console.log('✅ 2 workspaces created');

  // ── Workspace Members ────────────────────────
  // ws1: Alice(OWNER), Bob(ADMIN), Charlie(MEMBER), Diana(MEMBER), Evan(GUEST)
  await prisma.workspaceMember.createMany({
    data: [
      { userId: alice.id, workspaceId: ws1.id, role: 'OWNER' },
      { userId: bob.id, workspaceId: ws1.id, role: 'ADMIN' },
      { userId: charlie.id, workspaceId: ws1.id, role: 'MEMBER' },
      { userId: diana.id, workspaceId: ws1.id, role: 'MEMBER' },
      { userId: evan.id, workspaceId: ws1.id, role: 'GUEST' },
    ],
  });
  // ws2: Bob(OWNER), Fiona(MEMBER), Alice(MEMBER)
  await prisma.workspaceMember.createMany({
    data: [
      { userId: bob.id, workspaceId: ws2.id, role: 'OWNER' },
      { userId: fiona.id, workspaceId: ws2.id, role: 'MEMBER' },
      { userId: alice.id, workspaceId: ws2.id, role: 'MEMBER' },
    ],
  });
  console.log('✅ Workspace members assigned');

  // ── Teams (3개) ──────────────────────────────
  const teamDev = await prisma.team.create({
    data: { name: 'Development', workspaceId: ws1.id },
  });
  const teamDesign = await prisma.team.create({
    data: { name: 'Design', workspaceId: ws1.id },
  });
  const teamOps = await prisma.team.create({
    data: { name: 'Operations', workspaceId: ws1.id },
  });

  await prisma.teamMember.createMany({
    data: [
      { userId: alice.id, teamId: teamDev.id, role: 'LEAD' },
      { userId: bob.id, teamId: teamDev.id, role: 'MEMBER' },
      { userId: charlie.id, teamId: teamDev.id, role: 'MEMBER' },
      { userId: diana.id, teamId: teamDesign.id, role: 'LEAD' },
      { userId: alice.id, teamId: teamDesign.id, role: 'MEMBER' },
      { userId: bob.id, teamId: teamOps.id, role: 'LEAD' },
      { userId: evan.id, teamId: teamOps.id, role: 'MEMBER' },
    ],
  });
  console.log('✅ 3 teams created with members');

  // ── Helper: dates ────────────────────────────
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
  const daysLater = (n: number) => new Date(Date.now() + n * 86400000);

  // ── Tasks — Case 1: Simple (no thread) ───────
  const task1= await prisma.task.create({
    data: {
      title: '프로젝트 README 작성',
      description: '새로운 프로젝트의 README.md를 작성합니다.',
      status: 'COMPLETED',
      priority: 'LOW',
      creatorId: alice.id,
      assigneeId: alice.id,
      workspaceId: ws1.id,
      teamId: teamDev.id,
      completedAt: daysAgo(2),
      dueDate: daysAgo(1),
    },
  });

  const task2= await prisma.task.create({
    data: {
      title: 'CI/CD 파이프라인 설정',
      description: 'GitHub Actions로 자동 배포 설정',
      status: 'OPEN',
      priority: 'HIGH',
      creatorId: bob.id,
      assigneeId: bob.id,
      workspaceId: ws1.id,
      teamId: teamDev.id,
      dueDate: daysLater(3),
    },
  });

  // ── Case 2: Simple thread chain (A → B, completed) ──
  const task3= await prisma.task.create({
    data: {
      title: '디자인 리뷰 요청',
      description: 'v2 디자인 시안을 리뷰해주세요.',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      creatorId: alice.id,
      assigneeId: alice.id,
      workspaceId: ws1.id,
      teamId: teamDesign.id,
      completedAt: daysAgo(1),
      dueDate: daysAgo(0),
    },
  });

  await prisma.threadLink.create({
    data: {
      taskId: task3.id,
      fromUserId: alice.id,
      toUserId: diana.id,
      status: 'COMPLETED',
      chainIndex: 0,
      message: '디자인 시안 확인 부탁드려요',
      resolvedAt: daysAgo(1),
    },
  });

  // ── Case 3: Active chain (A → B → C, B forwarded, C pending) ──
  const task4= await prisma.task.create({
    data: {
      title: 'API 엔드포인트 리팩터링',
      description: 'REST API의 응답 구조를 통일합니다.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      creatorId: alice.id,
      assigneeId: charlie.id,
      workspaceId: ws1.id,
      teamId: teamDev.id,
      dueDate: daysLater(5),
    },
  });

  await prisma.threadLink.createMany({
    data: [
      {
        taskId: task4.id,
        fromUserId: alice.id,
        toUserId: bob.id,
        status: 'FORWARDED',
        chainIndex: 0,
        message: 'Bob, 이거 먼저 봐줄 수 있어?',
      },
      {
        taskId: task4.id,
        fromUserId: bob.id,
        toUserId: charlie.id,
        status: 'PENDING',
        chainIndex: 1,
        message: 'Charlie한테 넘길게, 백엔드 전문가니까',
      },
    ],
  });

  // ── Case 4: Long chain (A → B → C → D, snap-back in progress) ──
  const task5= await prisma.task.create({
    data: {
      title: '보안 감사 리포트',
      description: '분기별 보안 감사 결과를 정리합니다.',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      creatorId: bob.id,
      assigneeId: charlie.id,
      workspaceId: ws1.id,
      dueDate: daysLater(2),
    },
  });

  await prisma.threadLink.createMany({
    data: [
      {
        taskId: task5.id,
        fromUserId: bob.id,
        toUserId: alice.id,
        status: 'FORWARDED',
        chainIndex: 0,
      },
      {
        taskId: task5.id,
        fromUserId: alice.id,
        toUserId: diana.id,
        status: 'FORWARDED',
        chainIndex: 1,
      },
      {
        taskId: task5.id,
        fromUserId: diana.id,
        toUserId: charlie.id,
        status: 'PENDING',
        chainIndex: 2,
        message: 'Charlie, 인프라 쪽 확인 후 결과 알려줘',
      },
    ],
  });

  // ── Case 5: Circular chain (A → B → A) ──────
  const task6= await prisma.task.create({
    data: {
      title: '상호 코드리뷰',
      description: 'Alice와 Bob이 서로 코드리뷰를 진행합니다.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      creatorId: alice.id,
      assigneeId: alice.id,
      workspaceId: ws1.id,
      teamId: teamDev.id,
      dueDate: daysLater(1),
    },
  });

  await prisma.threadLink.createMany({
    data: [
      {
        taskId: task6.id,
        fromUserId: alice.id,
        toUserId: bob.id,
        status: 'FORWARDED',
        chainIndex: 0,
      },
      {
        taskId: task6.id,
        fromUserId: bob.id,
        toUserId: alice.id,
        status: 'PENDING',
        chainIndex: 1,
        message: '리뷰 완료! 다시 확인해줘',
      },
    ],
  });

  // ── Case 6: Blocked task ─────────────────────
  const task7= await prisma.task.create({
    data: {
      title: '결제 시스템 마이그레이션',
      description: '기존 결제 시스템을 새 API로 이전합니다. 외부 업체 응답 대기 중.',
      status: 'BLOCKED',
      priority: 'URGENT',
      creatorId: bob.id,
      assigneeId: bob.id,
      workspaceId: ws1.id,
      teamId: teamDev.id,
      dueDate: daysLater(7),
    },
  });

  // ── Case 7: Cancelled task ───────────────────
  await prisma.task.create({
    data: {
      title: '[취소됨] 레거시 API 제거',
      description: '요구사항 변경으로 취소',
      status: 'CANCELLED',
      priority: 'LOW',
      creatorId: charlie.id,
      assigneeId: charlie.id,
      workspaceId: ws1.id,
    },
  });

  // ── Case 8: Many tasks for calendar spread ───
  const calendarTasks = [];
  const titles = [
    '주간 스탠드업 정리', '기능 스펙 초안', 'DB 인덱스 최적화',
    '사용자 피드백 분석', 'A/B 테스트 설계', '모바일 대응 점검',
    '배포 롤백 플랜', '로그 모니터링 설정', '팀 회고 진행',
    '코드 컨벤션 문서화', '성능 벤치마크', 'API 문서 업데이트',
    '에러 트래킹 설정', '접근성 감사', '캐시 전략 수립',
  ];
  for (let i = 0; i < 15; i++) {
    const dayOffset = Math.floor(i / 3) * 2; // spread across days
    const creator = users[i % 4]; // rotate among first 4 users
    const completed = i < 10;
    calendarTasks.push(
      prisma.task.create({
        data: {
          title: titles[i],
          status: completed ? 'COMPLETED' : 'OPEN',
          priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4] as any,
          creatorId: creator.id,
          assigneeId: creator.id,
          workspaceId: ws1.id,
          teamId: [teamDev.id, teamDesign.id, teamOps.id][i % 3],
          dueDate: daysLater(dayOffset + 1),
          completedAt: completed ? daysAgo(dayOffset) : undefined,
          createdAt: daysAgo(dayOffset + 1),
        },
      }),
    );
  }
  await Promise.all(calendarTasks);
  console.log('✅ 23 tasks created (various statuses, threads, calendar spread)');

  // ── ws2 tasks ────────────────────────────────
  await prisma.task.create({
    data: {
      title: '사이드 프로젝트 아이디어 정리',
      status: 'OPEN',
      priority: 'MEDIUM',
      creatorId: bob.id,
      assigneeId: bob.id,
      workspaceId: ws2.id,
      dueDate: daysLater(14),
    },
  });
  await prisma.task.create({
    data: {
      title: '프로토타입 v1 만들기',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      creatorId: fiona.id,
      assigneeId: fiona.id,
      workspaceId: ws2.id,
      dueDate: daysLater(7),
    },
  });

  // ── Notifications (다양한 타입) ────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: alice.id,
        type: 'THREAD_RECEIVED',
        title: '새 스레드가 연결되었습니다',
        body: 'Bob이 "API 엔드포인트 리팩터링" 태스크를 연결했습니다.',
        data: { taskId: task4.id, fromUserName: 'Bob Park' },
        createdAt: daysAgo(3),
      },
      {
        userId: bob.id,
        type: 'THREAD_SNAPPED',
        title: '스레드가 되돌아왔습니다',
        body: 'Charlie가 "보안 감사 리포트"를 완료하여 돌아왔습니다.',
        data: { taskId: task5.id, fromUserName: 'Charlie Lee' },
        createdAt: daysAgo(1),
      },
      {
        userId: diana.id,
        type: 'TASK_ASSIGNED',
        title: '새 태스크가 할당되었습니다',
        body: '"디자인 리뷰 요청" 태스크가 할당되었습니다.',
        data: { taskId: task3.id },
        createdAt: daysAgo(5),
        read: true,
      },
      {
        userId: charlie.id,
        type: 'THREAD_RECEIVED',
        title: '새 스레드가 연결되었습니다',
        body: 'Bob이 태스크를 연결했습니다.',
        data: { taskId: task4.id, fromUserName: 'Bob Park' },
        createdAt: daysAgo(2),
      },
      {
        userId: alice.id,
        type: 'TASK_COMPLETED',
        title: '태스크가 완료되었습니다',
        body: '"디자인 리뷰 요청"이 완료되었습니다.',
        data: { taskId: task3.id },
        read: true,
        createdAt: daysAgo(1),
      },
      {
        userId: bob.id,
        type: 'WORKSPACE_INVITE',
        title: '워크스페이스 초대',
        body: 'Side Project 워크스페이스에 초대되었습니다.',
        data: { workspaceName: 'Side Project' },
        read: true,
        createdAt: daysAgo(10),
      },
      // Unread notifications for Alice
      {
        userId: alice.id,
        type: 'THREAD_RECEIVED',
        title: '스레드 연결',
        body: 'Bob이 "상호 코드리뷰"를 다시 연결했습니다.',
        data: { taskId: task6.id, fromUserName: 'Bob Park' },
        createdAt: new Date(),
      },
      {
        userId: alice.id,
        type: 'TASK_ASSIGNED',
        title: '새 태스크',
        body: '새로운 태스크 "성능 벤치마크"가 할당되었습니다.',
        createdAt: new Date(),
      },
    ],
  });
  console.log('✅ 8 notifications created (mixed read/unread)');

  // ── Activities ────────────────────────────────
  await prisma.activity.createMany({
    data: [
      {
        workspaceId: ws1.id,
        userId: alice.id,
        action: 'created',
        entityType: 'task',
        entityId: task1.id,
        metadata: { title: task1.title },
        createdAt: daysAgo(7),
      },
      {
        workspaceId: ws1.id,
        userId: alice.id,
        action: 'completed',
        entityType: 'task',
        entityId: task1.id,
        metadata: { title: task1.title },
        createdAt: daysAgo(2),
      },
      {
        workspaceId: ws1.id,
        userId: alice.id,
        action: 'connected',
        entityType: 'thread',
        entityId: task4.id,
        metadata: { title: task4.title, toUser: 'Bob Park' },
        createdAt: daysAgo(4),
      },
      {
        workspaceId: ws1.id,
        userId: bob.id,
        action: 'connected',
        entityType: 'thread',
        entityId: task4.id,
        metadata: { title: task4.title, toUser: 'Charlie Lee' },
        createdAt: daysAgo(3),
      },
      {
        workspaceId: ws1.id,
        userId: bob.id,
        action: 'created',
        entityType: 'task',
        entityId: task5.id,
        metadata: { title: task5.title },
        createdAt: daysAgo(5),
      },
      {
        workspaceId: ws1.id,
        userId: diana.id,
        action: 'resolved',
        entityType: 'thread',
        entityId: task3.id,
        metadata: { title: task3.title },
        createdAt: daysAgo(1),
      },
      {
        workspaceId: ws1.id,
        userId: bob.id,
        action: 'created',
        entityType: 'team',
        entityId: teamDev.id,
        metadata: { name: 'Development' },
        createdAt: daysAgo(14),
      },
      {
        workspaceId: ws1.id,
        userId: alice.id,
        action: 'invited',
        entityType: 'workspace',
        entityId: ws1.id,
        metadata: { email: 'evan@itothread.com', role: 'GUEST' },
        createdAt: daysAgo(10),
      },
    ],
  });
  console.log('✅ 8 activity logs created');

  // ── Workspace Invite (pending) ────────────────
  await prisma.workspaceInvite.create({
    data: {
      workspaceId: ws1.id,
      email: 'newbie@itothread.com',
      expiresAt: daysLater(7),
      role: 'MEMBER',
    },
  });
  console.log('✅ 1 pending workspace invite created');

  // ── Summary ──────────────────────────────────
  console.log('\n🎉 Seed complete!\n');
  console.log('📋 Login credentials (all users):');
  console.log('   Password: password123');
  console.log('   Emails: alice@itothread.com, bob@itothread.com, charlie@itothread.com,');
  console.log('           diana@itothread.com, evan@itothread.com, fiona@itothread.com');
  console.log('\n📊 Data created:');
  console.log('   • 6 users (4 roles: OWNER, ADMIN, MEMBER, GUEST)');
  console.log('   • 2 workspaces (Krow Studio + Side Project)');
  console.log('   • 3 teams (Development, Design, Operations)');
  console.log('   • 25 tasks across all statuses + priorities');
  console.log('   • Thread chains: simple, multi-hop, circular, snap-back');
  console.log('   • 8 notifications (mixed read/unread)');
  console.log('   • 8 activity logs');
  console.log('   • 1 pending invite');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
