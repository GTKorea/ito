# ito (糸) — Thread-Based Collaborative Task Management

> 사람과 사람 사이에 **실(Thread)**을 연결해 업무를 넘기고, 되돌려받는 협업 도구

![NestJS](https://img.shields.io/badge/NestJS-11-ea2845?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-v2-ffc131?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square)

---

## 핵심 컨셉: 실(Thread) 체인

기존 태스크 관리 도구는 할당(assign)이 **1:1 정적**입니다. ito는 다릅니다.

```
A (생성) ──실──▶ B ──실──▶ C ──실──▶ D
                              │
                         D가 완료하면
                              │
                    C에게 자동 snap-back
                    C가 완료하면 B에게 snap-back
                    B가 완료하면 A에게 snap-back
                    A가 최종 완료 처리
```

- **연결(Connect)**: 현재 담당자가 다음 사람에게 실을 연결
- **전달(Forward)**: 연결 시 이전 담당자의 상태가 자동으로 `FORWARDED`
- **되돌림(Snap-back)**: 수신자가 resolve하면 이전 사람에게 자동으로 돌아감
- **순환 방지**: 체인에 이미 포함된 사람에게는 연결 불가
- **최대 깊이**: 20단계까지 체인 가능

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Backend** | NestJS 11, PostgreSQL 16, Prisma 5 |
| **Frontend** | Next.js 16 (Static Export), React 19 |
| **Desktop** | Tauri v2 |
| **상태관리** | Zustand v5 |
| **UI** | Tailwind CSS v4, shadcn/ui |
| **실시간** | Socket.IO |
| **인증** | JWT + Passport (Email/PW, Google, GitHub OAuth) |
| **모노레포** | pnpm workspaces + Turborepo |

---

## 프로젝트 구조

```
ito/
├── apps/
│   ├── api/                          # NestJS 백엔드
│   │   ├── prisma/
│   │   │   └── schema.prisma         # DB 스키마
│   │   ├── src/
│   │   │   ├── auth/                 # 인증 (JWT, OAuth)
│   │   │   ├── users/                # 사용자 프로필, 아바타
│   │   │   ├── workspaces/           # 워크스페이스 CRUD, 초대
│   │   │   ├── teams/                # 팀 관리
│   │   │   ├── todos/                # Todo CRUD, 필터
│   │   │   ├── threads/              # 실 연결/해제 (핵심 로직)
│   │   │   ├── notifications/        # 알림 서비스
│   │   │   ├── activity/             # 활동 로그
│   │   │   ├── files/                # 파일 첨부
│   │   │   ├── websocket/            # Socket.IO 게이트웨이
│   │   │   └── common/               # Guard, Filter, Prisma
│   │   └── test/                     # E2E 테스트 (49개)
│   │
│   └── desktop/                      # Tauri + Next.js 프론트엔드
│       └── src/
│           ├── app/
│           │   ├── (app)/            # 인증된 라우트
│           │   │   ├── workspace/    # 메인 대시보드 (Todo 목록)
│           │   │   ├── threads/      # 실 인박스/아웃박스
│           │   │   ├── teams/        # 팀 관리
│           │   │   ├── notifications/# 알림 센터
│           │   │   ├── activity/     # 활동 로그
│           │   │   └── settings/     # 설정 (프로필, 워크스페이스)
│           │   ├── (auth)/           # 로그인/회원가입
│           │   └── invite/           # 초대 수락 페이지
│           ├── components/           # UI 컴포넌트
│           ├── stores/               # Zustand 스토어
│           └── lib/                  # API 클라이언트, 유틸
│
└── packages/
    └── shared/                       # 공유 타입/유틸
```

---

## 데이터 모델

```
User ─┬─▶ Workspace ──▶ Team
      │       │
      │       ▼
      ├─▶   Todo ◀──▶ ThreadLink ──▶ Notification
      │       │              │
      │       ▼              ▼
      └─▶   File          File
```

### 핵심 모델

| 모델 | 설명 |
|------|------|
| **User** | 이메일/OAuth 인증, 프로필 아바타 |
| **Workspace** | 최상위 조직 단위 (slug 기반 URL) |
| **Team** | 워크스페이스 내 소그룹 (LEAD/MEMBER 역할) |
| **Todo** | 상태: `OPEN → IN_PROGRESS → BLOCKED → COMPLETED`, 우선순위: `URGENT/HIGH/MEDIUM/LOW` |
| **ThreadLink** | 실의 한 구간. 상태: `PENDING → FORWARDED → COMPLETED` |
| **Notification** | 실 연결/해제/완료 시 자동 생성, Socket.IO로 실시간 전달 |
| **Activity** | 모든 주요 액션의 감사 로그 |
| **File** | Todo 또는 ThreadLink에 첨부 가능 (10MB 제한) |

---

## API 엔드포인트

### Auth
| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/register` | 이메일 회원가입 |
| POST | `/auth/login` | 이메일 로그인 |
| POST | `/auth/refresh` | 토큰 갱신 (rotation) |
| GET | `/auth/google` | Google OAuth |
| GET | `/auth/github` | GitHub OAuth |

### Users
| Method | Path | 설명 |
|--------|------|------|
| GET | `/users/me` | 내 프로필 조회 |
| PATCH | `/users/me` | 프로필 수정 |
| POST | `/users/me/avatar` | 프로필 이미지 업로드 |

### Workspaces
| Method | Path | 설명 |
|--------|------|------|
| POST | `/workspaces` | 워크스페이스 생성 |
| GET | `/workspaces` | 내 워크스페이스 목록 |
| GET | `/workspaces/:id` | 워크스페이스 상세 (멤버 포함) |
| POST | `/workspaces/:id/invite` | 이메일 초대 |
| POST | `/workspaces/join/:token` | 초대 수락 |
| GET | `/workspaces/invites/:token` | 초대 정보 조회 |

### Todos
| Method | Path | 설명 |
|--------|------|------|
| POST | `/workspaces/:wid/todos` | Todo 생성 |
| GET | `/workspaces/:wid/todos` | Todo 목록 (필터: `assignedToMe`, `status`) |
| GET | `/todos/:id` | Todo 상세 |
| PATCH | `/todos/:id` | Todo 수정 |
| DELETE | `/todos/:id` | Todo 삭제 |

### Threads (실)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/todos/:todoId/connect` | 실 연결 (다음 사람에게 전달) |
| POST | `/thread-links/:id/resolve` | 실 해제 (snap-back) |
| GET | `/todos/:todoId/chain` | 전체 실 체인 조회 |
| GET | `/threads/mine` | 내 인박스/아웃박스 |

### Teams
| Method | Path | 설명 |
|--------|------|------|
| POST | `/workspaces/:wid/teams` | 팀 생성 |
| GET | `/workspaces/:wid/teams` | 팀 목록 |
| POST | `/workspaces/:wid/teams/:tid/members` | 멤버 추가 |
| DELETE | `/workspaces/:wid/teams/:tid/members/:uid` | 멤버 제거 |
| DELETE | `/workspaces/:wid/teams/:tid` | 팀 삭제 |

### Notifications
| Method | Path | 설명 |
|--------|------|------|
| GET | `/notifications` | 알림 목록 (`unreadOnly` 필터) |
| PATCH | `/notifications/:id/read` | 읽음 처리 |
| PATCH | `/notifications/read-all` | 전체 읽음 처리 |

### Files
| Method | Path | 설명 |
|--------|------|------|
| POST | `/files/upload` | 파일 업로드 (multipart) |
| GET | `/files/:id` | 파일 정보 조회 |
| GET | `/files/:id/download` | 파일 다운로드 |
| GET | `/files/todo/:todoId` | Todo 첨부파일 목록 |
| DELETE | `/files/:id` | 파일 삭제 |

### Activity
| Method | Path | 설명 |
|--------|------|------|
| GET | `/activity/:workspaceId` | 워크스페이스 활동 로그 |

---

## 설치 및 실행

### 사전 요구사항

- Node.js 20+
- pnpm 9+
- PostgreSQL 16
- Rust (Tauri 빌드 시)

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

```bash
# apps/api/.env
DATABASE_URL=postgresql://ito:ito_dev@localhost:5432/ito
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
API_PORT=3001

# OAuth (선택)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### 3. 데이터베이스 설정

```bash
# Docker로 PostgreSQL 실행 (선택)
docker compose up -d

# 또는 로컬 PostgreSQL 사용
createdb ito

# 마이그레이션 적용
cd apps/api
npx prisma migrate deploy
npx prisma generate
```

### 4. 개발 서버 실행

```bash
# 전체 (API + Desktop)
pnpm dev

# 개별 실행
pnpm dev:api        # http://localhost:3001
pnpm dev:desktop    # http://localhost:3000
```

### 5. API 문서 확인

서버 실행 후 Swagger UI: `http://localhost:3001/api/docs`

---

## 테스트

```bash
# E2E 테스트 (테스트 DB 필요)
createdb ito_test
DATABASE_URL=postgresql://localhost:5432/ito_test npx prisma migrate deploy
cd apps/api && pnpm test:e2e
```

### 테스트 커버리지

| 영역 | 테스트 수 | 내용 |
|------|----------|------|
| Auth | 10 | 회원가입, 로그인, 토큰 갱신, 401 체크 |
| Workspaces | 7 | CRUD, 초대, 수락, 멤버 필터링 |
| Teams | 6 | CRUD, 멤버 추가/제거 |
| Todos | 11 | CRUD, 필터, 권한, completedAt |
| Threads | 10 | 연결, 순환방지, 체인, snap-back, 권한 |
| Notifications | 5 | 자동생성, 목록, 필터, 읽음처리 |
| **합계** | **49** | |

---

## 디자인

Linear에서 영감을 받은 다크 테마:

| 요소 | 값 |
|------|-----|
| Background | `#0A0A0A` |
| Surface | `#1A1A1A` |
| Font | Inter / Geist |
| Style | 미니멀, 고밀도 정보 UI |

---

## 라이선스

Private — All rights reserved.
