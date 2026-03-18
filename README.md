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

- **연결(Connect)**: 현재 담당자가 다음 사람에게 실을 연결 → 상태 `IN_PROGRESS`
- **전달(Forward)**: 연결 시 이전 담당자의 링크 상태가 자동으로 `FORWARDED`
- **되돌림(Snap-back)**: 수신자가 resolve하면 이전 사람에게 자동으로 돌아감
- **재연결**: resolve된 유저에게는 다시 연결 가능 (활성 체인 내 순환만 방지)
- **최대 깊이**: 20단계까지 체인 가능

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Backend** | NestJS 11, PostgreSQL 16, Prisma 5 |
| **Frontend** | Next.js 16 (Static Export), React 19 |
| **Desktop** | Tauri v2 |
| **상태관리** | Zustand v5 |
| **UI** | Tailwind CSS v4, shadcn/ui v4 |
| **실시간** | Socket.IO |
| **인증** | JWT + Passport (Email/PW, Google, GitHub OAuth) |
| **이메일** | Resend (초대 이메일, 선택) |
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
│   │   │   ├── users/                # 사용자 프로필, 검색
│   │   │   ├── workspaces/           # 워크스페이스 CRUD, 초대
│   │   │   ├── teams/                # 팀 관리
│   │   │   ├── todos/                # Todo CRUD, 필터
│   │   │   ├── threads/              # 실 연결/해제 (핵심 로직)
│   │   │   ├── notifications/        # 알림 서비스
│   │   │   ├── email/                # 이메일 발송 (Resend)
│   │   │   ├── activities/           # 활동 로그
│   │   │   ├── files/                # 파일 첨부
│   │   │   ├── websocket/            # Socket.IO 게이트웨이
│   │   │   └── common/               # Guard, Filter, Prisma
│   │   ├── test/                     # E2E 테스트 (50개)
│   │   └── Dockerfile                # 프로덕션 Docker 빌드
│   │
│   └── desktop/                      # Tauri + Next.js 프론트엔드
│       ├── src/
│       │   ├── app/
│       │   │   ├── (app)/            # 인증된 라우트
│       │   │   │   ├── workspace/    # 메인 대시보드 (Todo 목록)
│       │   │   │   ├── threads/      # 실 인박스/아웃박스
│       │   │   │   ├── teams/        # 팀 관리
│       │   │   │   ├── notifications/# 알림 센터
│       │   │   │   ├── activity/     # 활동 로그
│       │   │   │   └── settings/     # 설정 (프로필, 워크스페이스, 초대)
│       │   │   ├── (auth)/           # 로그인/회원가입/콜백
│       │   │   └── invite/           # 초대 수락 페이지
│       │   ├── components/           # UI 컴포넌트
│       │   ├── stores/               # Zustand 스토어
│       │   └── lib/                  # API 클라이언트, WebSocket 클라이언트
│       ├── src-tauri/                # Tauri 네이티브 설정
│       └── vercel.json               # Vercel 배포 설정
│
├── packages/
│   └── shared/                       # 공유 타입/상수
│
└── docker-compose.yml                # 개발용 PostgreSQL
```

---

## 설치 및 실행

### 사전 요구사항

- Node.js 20+
- pnpm 9+
- PostgreSQL 16 (또는 Docker)
- Rust + Tauri CLI (데스크톱 빌드 시)

### 로컬 개발

```bash
# 1. 의존성 설치
pnpm install

# 2. PostgreSQL 실행 (Docker)
docker compose up -d

# 3. 환경 변수 설정
cp apps/api/.env.example apps/api/.env
cp apps/desktop/.env.example apps/desktop/.env.local

# 4. DB 마이그레이션
cd apps/api && npx prisma migrate dev

# 5. 개발 서버 실행
pnpm dev    # API (3001) + Desktop (3000) 동시 실행
```

### 주요 명령어

```bash
pnpm dev              # 전체 개발 서버
pnpm dev:api          # API만
pnpm dev:desktop      # Desktop만
pnpm build            # 전체 빌드

cd apps/api
pnpm test:e2e         # E2E 테스트 (50개)
npx prisma studio     # DB GUI
```

---

## 테스트

```bash
createdb ito_test
cd apps/api && pnpm test:e2e
```

| 영역 | 테스트 수 | 내용 |
|------|----------|------|
| Auth | 10 | 회원가입, 로그인, 토큰 갱신, 401 체크 |
| Workspaces | 7 | CRUD, 초대, 수락, 멤버 필터링 |
| Teams | 6 | CRUD, 멤버 추가/제거 |
| Todos | 11 | CRUD, 필터, 권한, completedAt |
| Threads | 11 | 연결, 순환방지, 재연결, 체인, snap-back, 권한 |
| Notifications | 5 | 자동생성, 목록, 필터, 읽음처리 |
| **합계** | **50** | |

---

## 배포

### 아키텍처

```
┌─ Vercel ──────────────┐      ┌─ EC2 (t3.small) ──────────────┐
│  ito.krow.kr           │ ──▶ │  Caddy (자동 HTTPS)             │
│  (Next.js Static)      │      │    └─ api.ito.krow.kr          │
└────────────────────────┘      │       └─ ito-api:3001          │
                                │  PostgreSQL 16                  │
                                └─────────────────────────────────┘
```

### 레포 분리

| 레포 | 역할 | EC2 경로 |
|------|------|----------|
| [**krow-infra**](https://github.com/GTKorea/krow-infra) | 공유 인프라 (docker-compose, Caddy, 배포 스크립트) | `~/krow-infra/` |
| **ito** (이 레포) | ito 서비스 코드 + Dockerfile | `~/ito/` |

인프라 관련 설정과 배포 방법은 [krow-infra](https://github.com/GTKorea/krow-infra) 레포를 참고하세요.

### Vercel 프론트엔드 배포

1. Vercel에서 GitHub 레포 연결
2. Root Directory: `apps/desktop`
3. Framework Preset: `Other` (Static Export)
4. Environment Variables: `NEXT_PUBLIC_API_URL=https://api.ito.krow.kr`
5. Domains → `ito.krow.kr` 추가

### DNS (Route53)

| 타입 | 이름 | 값 |
|------|------|-----|
| A | `*.krow.kr` | EC2 Elastic IP (와일드카드) |
| CNAME | `ito.krow.kr` | `cname.vercel-dns.com` (Vercel) |

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
