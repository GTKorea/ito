# CLAUDE.md — ito 프로젝트 가이드

## 프로젝트 개요

ito(糸)는 실(Thread) 기반 협업 태스크 관리 SaaS입니다. 사람 간에 실을 연결해 업무를 넘기고, 완료 시 자동으로 되돌려받는(snap-back) 체인 시스템이 핵심입니다.

## 모노레포 구조

- `apps/api` — NestJS 11 백엔드 (PostgreSQL + Prisma 5)
- `apps/desktop` — Tauri v2 + Next.js 16 프론트엔드
- `packages/shared` — 공유 타입/유틸

## 주요 명령어

```bash
pnpm dev              # API + Desktop 동시 실행
pnpm dev:api          # API만 (기본 포트 3001)
pnpm dev:desktop      # Desktop만 (기본 포트 3000)
pnpm build            # 전체 빌드

# API 테스트
cd apps/api
pnpm test:e2e         # E2E 테스트 (49개, --runInBand로 순차 실행)

# Prisma
cd apps/api
npx prisma migrate dev    # 마이그레이션 생성
npx prisma migrate deploy # 마이그레이션 적용
npx prisma generate       # 클라이언트 생성
npx prisma studio         # DB GUI
```

## 기술 스택 핵심 사항

### Backend (apps/api)
- **NestJS 11** — 모듈 기반 아키텍처, 각 도메인이 Module/Service/Controller로 분리
- **Prisma 5** — 스키마: `apps/api/prisma/schema.prisma`
- **JWT 인증** — Access Token (15분) + Refresh Token (7일, rotation)
- **Socket.IO** — `ws.gateway.ts`에서 알림 실시간 전달
- **Passport** — Google/GitHub OAuth 지원
- **Multer** — 파일 업로드 (10MB 제한, `uploads/` 디렉토리)
- **Swagger** — `http://localhost:3001/api/docs`

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
2. A가 B에게 `POST /todos/:id/connect` → B가 assignee, A의 링크는 `FORWARDED`
3. B가 C에게 connect → C가 assignee, B의 링크는 `FORWARDED`
4. C가 `POST /thread-links/:id/resolve` → B에게 snap-back, B의 링크가 `PENDING`으로 복귀
5. B가 resolve → A에게 snap-back
6. A가 Todo를 `COMPLETED`로 변경하면 최종 완료

### 주요 제약조건
- 자기 자신에게 실 연결 불가
- 현재 assignee만 다음 사람에게 연결 가능
- 체인에 이미 있는 사람에게 순환 연결 불가
- 최대 체인 깊이: 20

## DB 스키마 주요 모델

| 모델 | 핵심 필드 |
|------|----------|
| User | email, passwordHash, googleId, githubId, avatarUrl |
| Workspace | name, slug (unique) |
| Todo | status (OPEN/IN_PROGRESS/BLOCKED/COMPLETED/CANCELLED), priority, dueDate, creatorId, assigneeId |
| ThreadLink | todoId, fromUserId, toUserId, status (PENDING/FORWARDED/COMPLETED), chainIndex |
| Notification | type, read, data (JSON) |
| Activity | action, entityType, entityId, metadata (JSON) |
| File | filename, url, size, mimeType, todoId?, threadLinkId? |

## 테스트

- E2E 테스트: `apps/api/test/*.e2e-spec.ts` (6개 파일, 49개 테스트)
- 테스트 DB: `ito_test` (로컬 PostgreSQL)
- 테스트 인프라: `apps/api/test/setup.ts` — `createTestApp()`, `cleanDatabase()`, `registerTestUser()`, `createTestWorkspace()`
- 단일 TRUNCATE 문으로 cleanup (데드락 방지)
- `--runInBand` 순차 실행 (병렬 시 DB 충돌 방지)

## 환경 변수

API 서버 (`apps/api/.env`):
- `DATABASE_URL` — PostgreSQL 연결 문자열
- `JWT_SECRET`, `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (OAuth, 선택)
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (OAuth, 선택)
- `API_PORT` (기본 3001, 사용 중이면 자동으로 다음 포트 탐색)

Desktop (`apps/desktop/.env.local`):
- `NEXT_PUBLIC_API_URL` (기본 `http://localhost:3001`)

## 코딩 컨벤션

- NestJS 모듈마다 Module/Service/Controller 분리
- Prisma raw query 사용 시 `$executeRawUnsafe`
- DTO에 class-validator 데코레이터 사용
- 프론트엔드 상태는 Zustand store로 관리 (각 도메인별 분리)
- API 호출은 `src/lib/api-client.ts`의 axios 인스턴스 사용
