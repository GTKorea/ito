# CLAUDE.md — ito 프로젝트 가이드

## 프로젝트 개요

ito(糸)는 실(Thread) 기반 협업 태스크 관리 SaaS입니다. 사람 간에 실을 연결해 업무를 넘기고, 완료 시 자동으로 되돌려받는(snap-back) 체인 시스템이 핵심입니다.

## 모노레포 구조

```
ito/
├── apps/
│   ├── api/                 # NestJS 11 백엔드
│   │   ├── src/
│   │   │   ├── auth/        # 인증 (JWT, OAuth)
│   │   │   ├── todos/       # 태스크 CRUD
│   │   │   ├── threads/     # 실 체인 (connect/resolve)
│   │   │   ├── workspaces/  # 워크스페이스 + 초대
│   │   │   ├── users/       # 사용자 관리
│   │   │   ├── notifications/ # 알림
│   │   │   ├── activities/  # 활동 로그
│   │   │   ├── files/       # 파일 업로드
│   │   │   ├── email/       # Resend 이메일
│   │   │   └── websocket/   # Socket.IO 실시간
│   │   ├── prisma/          # DB 스키마 + 마이그레이션
│   │   ├── test/            # E2E 테스트
│   │   └── Dockerfile       # 프로덕션 빌드
│   └── desktop/             # Next.js 16 + Tauri v2 프론트엔드
│       ├── src/
│       │   ├── app/         # 페이지 (App Router)
│       │   │   ├── (app)/   # 인증 필요 영역 (workspace, threads, settings 등)
│       │   │   └── (auth)/  # 인증 영역 (login, register, callback)
│       │   ├── components/  # UI 컴포넌트
│       │   ├── stores/      # Zustand 상태 관리
│       │   └── lib/         # API 클라이언트, WebSocket 클라이언트
│       ├── src-tauri/       # Tauri 네이티브 설정
│       └── vercel.json      # Vercel 배포 설정
└── packages/
    └── shared/              # 공유 타입/유틸
```

## 주요 명령어

```bash
pnpm dev              # API + Desktop 동시 실행
pnpm dev:api          # API만 (포트 3011)
pnpm dev:desktop      # Desktop만 (포트 3010)
pnpm build            # 전체 빌드

# API 테스트
cd apps/api
pnpm test:e2e         # E2E 테스트 (50개, --runInBand로 순차 실행)

# Prisma
cd apps/api
npx prisma migrate dev    # 마이그레이션 생성
npx prisma migrate deploy # 마이그레이션 적용
npx prisma generate       # 클라이언트 생성
npx prisma studio         # DB GUI
```

## 기술 스택

### Backend (apps/api)
- **NestJS 11** — 모듈 기반 아키텍처, 각 도메인이 Module/Service/Controller로 분리
- **Prisma 5** — 스키마: `apps/api/prisma/schema.prisma`
- **JWT 인증** — Access Token (15분) + Refresh Token (7일, rotation)
- **Socket.IO** — `ws.gateway.ts`에서 알림 실시간 전달
- **Passport** — Google/GitHub OAuth 지원
- **Multer** — 파일 업로드 (10MB 제한, `uploads/` 디렉토리)
- **Resend** — 초대 이메일 발송 (선택, `RESEND_API_KEY` 미설정 시 skip)
- **Swagger** — `http://localhost:3011/api/docs`

### Frontend (apps/desktop)
- **Next.js 16** — Static Export (`output: 'export'`)
- **Tauri v2** — 데스크톱 앱 래퍼
- **Zustand v5** — 상태 관리 (auth, todo, workspace, notification 스토어)
- **Tailwind CSS v4** + **shadcn/ui** — 다크 테마 UI
- **shadcn/ui v4** — base-ui 기반, `asChild` 대신 `render` prop 사용

### 디자인 톤
- Linear 영감 다크 테마
- Background: `#0A0A0A`, Surface: `#1A1A1A`
- Font: Inter / Geist

## 핵심 도메인 로직

### 실(Thread) 체인 시스템
1. A가 Todo 생성 → 자동으로 A가 assignee
2. A가 B에게 `POST /todos/:id/connect` → B가 assignee (`IN_PROGRESS`), A의 링크는 `FORWARDED`
3. B가 C에게 connect → C가 assignee (`IN_PROGRESS`), B의 링크는 `FORWARDED`
4. C가 `POST /thread-links/:id/resolve` → B에게 snap-back, B의 링크가 `PENDING`으로 복귀
5. B가 resolve → A에게 snap-back
6. A가 Todo를 `COMPLETED`로 변경하면 최종 완료

### 주요 제약조건
- 자기 자신에게 실 연결 불가
- 현재 assignee만 다음 사람에게 연결 가능
- **활성 링크(PENDING/FORWARDED)**에 포함된 사람에게만 순환 연결 불가 (COMPLETED 링크의 유저에게는 재연결 가능)
- 최대 체인 깊이: 20

### 초대 시스템
- `POST /workspaces/:id/invite` → WorkspaceInvite 생성 (7일 만료) + 이메일 발송 (Resend) + 가입 유저에게 WORKSPACE_INVITE 알림
- 응답에 `inviteLink` 포함 → 프론트엔드에서 링크 복사 가능
- `/invite?token=xxx` 페이지에서 수락 → WorkspaceMember 생성

## DB 스키마 주요 모델

| 모델 | 핵심 필드 |
|------|----------|
| User | email, passwordHash, googleId, githubId, avatarUrl |
| Workspace | name, slug (unique) |
| Todo | status (OPEN/IN_PROGRESS/BLOCKED/COMPLETED/CANCELLED), priority, dueDate, creatorId, assigneeId |
| ThreadLink | todoId, fromUserId, toUserId, status (PENDING/FORWARDED/COMPLETED), chainIndex |
| WorkspaceInvite | workspaceId, email, token (unique), expiresAt |
| Notification | type (THREAD_RECEIVED/THREAD_SNAPPED/THREAD_COMPLETED/WORKSPACE_INVITE/TODO_ASSIGNED/TODO_COMPLETED), read, data (JSON) |
| Activity | action, entityType, entityId, metadata (JSON) |
| File | filename, url, size, mimeType, todoId?, threadLinkId? |

## 테스트

- E2E 테스트: `apps/api/test/*.e2e-spec.ts` (6개 파일, 50개 테스트)
- 테스트 DB: `ito_test` (로컬 PostgreSQL)
- 테스트 인프라: `apps/api/test/setup.ts` — `createTestApp()`, `cleanDatabase()`, `registerTestUser()`, `createTestWorkspace()`
- 단일 TRUNCATE 문으로 cleanup (데드락 방지)
- `--runInBand` 순차 실행 (병렬 시 DB 충돌 방지)

## 환경 변수

### 로컬 개발 — `apps/api/.env`
```env
DATABASE_URL="postgresql://ito:ito_dev@localhost:5432/ito?schema=public"
JWT_SECRET="dev-secret"
JWT_REFRESH_SECRET="dev-refresh-secret"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"
API_PORT=3011
FRONTEND_URL="http://localhost:3010"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:3011/auth/google/callback"
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_CALLBACK_URL="http://localhost:3011/auth/github/callback"
RESEND_API_KEY=""
RESEND_FROM=""
```

### 로컬 개발 — `apps/desktop/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:3011
```

### 프로덕션 환경변수
- EC2: `~/krow-infra/.env.production` (krow-infra 레포의 env-template 참고)
- Vercel: `NEXT_PUBLIC_API_URL=https://api.ito.krow.kr`
- GitHub Secrets: `EC2_HOST`, `EC2_SSH_KEY`

## 배포

### 전체 아키텍처

```
사용자 → ito.krow.kr (Vercel, 프론트엔드)
              │ API 호출
              ▼
         api.ito.krow.kr (EC2)
              │
         ┌────┴────┐
         │  Caddy   │ ← 자동 HTTPS
         └────┬────┘
              │
         ┌────┴────┐
         │ ito-api  │ ← NestJS (포트 3011)
         └────┬────┘
              │
         ┌────┴────┐
         │PostgreSQL│ ← 데이터베이스
         └─────────┘
```

### 레포 분리 원칙

| 레포 | 역할 | EC2 경로 |
|------|------|----------|
| **krow-infra** | 공유 인프라 (docker-compose, Caddy, 배포 스크립트) | `~/krow-infra/` |
| **ito** (이 레포) | ito 서비스 코드 + Dockerfile | `~/ito/` |
| 다른 프로젝트 | 각자의 코드 + Dockerfile | `~/project-b/` 등 |

### 이 레포의 배포 관련 파일
- `apps/api/Dockerfile` — API 멀티스테이지 Docker 빌드
- `apps/desktop/vercel.json` — Vercel 정적 배포 설정 (`"framework": null`, SPA 리라이트)
- `.github/workflows/deploy-api.yml` — API CI/CD (GHCR 빌드 → EC2 배포)
- `.github/workflows/desktop-build.yml` — Tauri 데스크톱 빌드

### CI/CD 흐름
1. `apps/api/` 코드 push → GitHub Actions → GHCR에 Docker 이미지 빌드 → EC2에 SSH 접속 → 이미지 pull & 재시작
2. `apps/desktop/` 코드 push → Vercel 자동 빌드 (GitHub 연동)

### DNS (Route53)
- `*.krow.kr` → EC2 Elastic IP `15.164.197.165` (A 레코드, 와일드카드)
- `ito.krow.kr` → `cname.vercel-dns.com` (CNAME, 와일드카드보다 우선)

### 배포 가이드
상세한 단계별 배포 가이드는 **krow-infra** 레포의 `DEPLOY_GUIDE.md` 참조

## 코딩 컨벤션

- NestJS 모듈마다 Module/Service/Controller 분리
- Prisma raw query 사용 시 `$executeRawUnsafe`
- DTO에 class-validator 데코레이터 사용
- 프론트엔드 상태는 Zustand store로 관리 (각 도메인별 분리)
- API 호출은 `src/lib/api-client.ts`의 axios 인스턴스 사용
- 상태 변경 API 호출 후 로컬 상태 즉시 업데이트 (optimistic update)
