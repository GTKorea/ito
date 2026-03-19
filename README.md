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
- **순환 연결**: 체인 내 이미 있는 사용자에게도 다시 연결 가능 (자기 자신만 불가)
- **최대 깊이**: 20단계까지 체인 가능

---

## 주요 기능

### 🧵 Thread 체인 시스템
- **실 연결/해제**: 업무를 다음 담당자에게 넘기고 완료 시 자동 snap-back
- **순환 연결**: A→B→C→A 같은 순환 체인 지원 (자기 자신만 불가)
- **빠른 체인 생성**: `태스크 이름 > @사용자B > @사용자C` 입력으로 한 번에 태스크 생성 + 연결
- **그래프 시각화**: Todo 상세에서 네트워크 아이콘 클릭 → Obsidian 스타일 그래프 뷰

### ⚡ 빠른 태스크 입력
워크스페이스 홈 하단의 채팅창 스타일 입력바에서 태스크를 빠르게 등록합니다.

```
프론트엔드 리뷰 > @김개발 > @이디자인
```

- `>` 구분자로 태스크 생성과 체인 연결을 동시에 수행
- `@` 입력 시 사용자 자동완성 드롭다운
- 키보드만으로 완전한 조작 가능 (↑↓ 선택, Tab/Enter 확정)

### 💬 Slack 연동
워크스페이스에 ito Slack 앱을 설치하면 Slack 안에서 태스크를 관리할 수 있습니다.

| 커맨드 | 설명 |
|--------|------|
| `/ito create 태스크 이름` | 태스크 생성 |
| `/ito list` | 내 태스크 목록 |
| `/ito connect` | Thread 연결 (준비 중) |
| `/ito resolve` | Thread 해결 (준비 중) |
| `/ito help` | 도움말 |

Thread 수신, snap-back, 완료 등 알림이 Slack DM으로 자동 전송됩니다.

### 📅 캘린더 뷰
- **월별 그리드**: 완료한 태스크(초록)와 마감 예정 태스크(주황)를 날짜별로 확인
- **날짜 클릭 확장**: 해당일 태스크 목록 상세 보기
- **외부 캘린더 연동**: Google Calendar, Outlook Calendar와 OAuth 연동

### 👥 팀 & 워크스페이스 협업
- **GUEST 역할**: 초대 시 MEMBER/GUEST 선택 가능 (GUEST는 읽기 전용 + Thread resolve만 가능)
- **팀 대시보드**: 멤버별 워크로드, 팀 태스크 통계
- **워크스페이스 설정**: OWNER/ADMIN이 이름/설명 수정, 멤버 역할 관리

### 🔔 알림 시스템
- **실시간 알림**: Socket.IO를 통한 즉각적인 알림 전달
- **데스크톱 알림**: Tauri 앱에서 네이티브 시스템 알림 지원
- **웹 알림**: 브라우저 Notification API 폴백
- **Slack 알림**: DM으로 모든 알림 타입 전송 (선택)

### 🌍 다국어 지원 (i18n)
Settings에서 언어를 변경할 수 있습니다.

| 언어 | 코드 |
|------|------|
| English | `en` |
| 한국어 | `ko` |
| 日本語 | `ja` |
| 简体中文 | `zh-CN` |
| 繁體中文 | `zh-TW` |
| Español | `es` |
| Français | `fr` |
| Deutsch | `de` |
| Português | `pt` |

### 🌓 테마 시스템
사이드바 하단의 3-way 토글로 Light / Dark / Auto(OS 설정 따름) 전환. 선택은 `localStorage`에 저장됩니다.

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
| **Slack** | @slack/web-api (선택) |
| **그래프** | @xyflow/react + @dagrejs/dagre |
| **i18n** | next-intl |
| **테스트** | Jest (API E2E), Vitest + Playwright (Frontend) |
| **컴포넌트 문서** | Storybook 8 |
| **모노레포** | pnpm workspaces |

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
│   │   │   ├── workspaces/           # 워크스페이스 CRUD, 초대, 설정
│   │   │   ├── teams/                # 팀 관리, 대시보드
│   │   │   ├── todos/                # Todo CRUD, 필터, 캘린더
│   │   │   ├── threads/              # 실 연결/해제/체인 (핵심 로직)
│   │   │   ├── notifications/        # 알림 서비스
│   │   │   ├── slack/                # Slack 연동 (커맨드, 알림)
│   │   │   ├── calendar/             # 외부 캘린더 연동 (Google, Outlook)
│   │   │   ├── email/                # 이메일 발송 (Resend)
│   │   │   ├── activities/           # 활동 로그
│   │   │   ├── files/                # 파일 첨부
│   │   │   ├── websocket/            # Socket.IO 게이트웨이
│   │   │   └── common/               # Guard, Filter, Prisma
│   │   ├── test/                     # E2E 테스트 (63개)
│   │   └── Dockerfile                # 프로덕션 Docker 빌드
│   │
│   └── desktop/                      # Tauri + Next.js 프론트엔드
│       ├── src/
│       │   ├── app/
│       │   │   ├── (app)/            # 인증된 라우트
│       │   │   │   ├── workspace/    # 메인 대시보드 + 빠른 입력
│       │   │   │   ├── threads/      # 실 인박스/아웃박스
│       │   │   │   ├── teams/        # 팀 관리 + 대시보드
│       │   │   │   ├── calendar/     # 캘린더 뷰
│       │   │   │   ├── notifications/# 알림 센터
│       │   │   │   ├── activity/     # 활동 로그
│       │   │   │   └── settings/     # 설정 (프로필, 언어, 캘린더, 멤버)
│       │   │   ├── (auth)/           # 로그인/회원가입/콜백
│       │   │   └── invite/           # 초대 수락 페이지
│       │   ├── components/
│       │   │   ├── ui/               # shadcn/ui 컴포넌트
│       │   │   ├── layout/           # 사이드바, 테마 토글
│       │   │   ├── todos/            # Todo 목록, 상세, 빠른 입력
│       │   │   ├── threads/          # Thread 그래프 시각화
│       │   │   ├── calendar/         # 캘린더 뷰 컴포넌트
│       │   │   └── teams/            # 팀 카드, 대시보드
│       │   ├── stores/               # Zustand 스토어
│       │   ├── messages/             # i18n 번역 파일 (9개 언어)
│       │   └── lib/                  # API 클라이언트, WebSocket, i18n, 알림
│       ├── .storybook/               # Storybook 설정
│       ├── e2e/                      # Playwright E2E 테스트
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
pnpm dev    # API (3011) + Desktop (3010) 동시 실행
```

### 주요 명령어

```bash
pnpm dev              # 전체 개발 서버
pnpm dev:api          # API만 (포트 3011)
pnpm dev:desktop      # Desktop만 (포트 3010)
pnpm build            # 전체 빌드

# 테스트
cd apps/api && pnpm test:e2e           # 백엔드 E2E (63개)
cd apps/desktop && pnpm test           # 프론트엔드 유닛 (Vitest, 45개)
cd apps/desktop && pnpm test:e2e       # 프론트엔드 E2E (Playwright, 6개)

# 도구
cd apps/api && npx prisma studio       # DB GUI
cd apps/desktop && pnpm storybook      # 컴포넌트 문서 (포트 6006)
```

---

## 환경 변수

모든 외부 연동은 **선택사항**입니다. 환경변수가 비어있으면 해당 기능이 자동으로 비활성화됩니다.

### `apps/api/.env`

| 변수 | 설명 | 필수 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 | ✅ |
| `JWT_SECRET` | JWT 서명 키 | ✅ |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 키 | ✅ |
| `API_PORT` | API 포트 (기본: 3011) | |
| `FRONTEND_URL` | 프론트엔드 URL | |
| `GOOGLE_CLIENT_ID` | Google OAuth 로그인 | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 로그인 | |
| `GITHUB_CLIENT_ID` | GitHub OAuth 로그인 | |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth 로그인 | |
| `RESEND_API_KEY` | 초대 이메일 발송 | |
| `SLACK_BOT_TOKEN` | Slack 연동 | |
| `SLACK_SIGNING_SECRET` | Slack 요청 검증 | |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google Calendar 연동 | |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google Calendar 연동 | |
| `OUTLOOK_CLIENT_ID` | Outlook Calendar 연동 | |
| `OUTLOOK_CLIENT_SECRET` | Outlook Calendar 연동 | |

### `apps/desktop/.env.local`

| 변수 | 설명 | 필수 |
|------|------|------|
| `NEXT_PUBLIC_API_URL` | API 서버 URL (기본: `http://localhost:3011`) | ✅ |

---

## 외부 연동 설정 가이드

### Slack 연동

1. https://api.slack.com/apps → **Create New App** (From Scratch)
2. **Slash Commands** → `/ito` 추가 (Request URL: `https://your-api-domain/slack/commands`)
3. **Event Subscriptions** 활성화 (Request URL: `https://your-api-domain/slack/events`)
4. **OAuth & Permissions** → Bot Token Scopes: `commands`, `chat:write`, `users:read`, `users:read.email`
5. **Install to Workspace** → Bot Token → `SLACK_BOT_TOKEN`
6. **Basic Information** → Signing Secret → `SLACK_SIGNING_SECRET`

### Google Calendar 연동

1. https://console.cloud.google.com → Google Calendar API 활성화
2. **Credentials** → OAuth Client ID (Web application)
3. Redirect URI: `https://your-api-domain/calendar/google/callback`
4. Client ID/Secret → `.env`에 설정
5. 사용자: Settings → Calendar Integrations → "Connect Google Calendar"

### Outlook Calendar 연동

1. https://portal.azure.com → **App registrations** → New registration
2. Redirect URI: `https://your-api-domain/calendar/outlook/callback`
3. API permissions: `Calendars.ReadWrite`
4. Client ID/Secret → `.env`에 설정

---

## 테스트

```bash
# 테스트 DB 생성 (최초 1회)
createdb ito_test

# 백엔드 E2E
cd apps/api && pnpm test:e2e

# 프론트엔드 유닛/통합
cd apps/desktop && pnpm test

# 프론트엔드 E2E
cd apps/desktop && pnpm test:e2e
```

### 백엔드 E2E (63개)

| 영역 | 테스트 수 | 내용 |
|------|----------|------|
| Auth | 10 | 회원가입, 로그인, 토큰 갱신, 401 체크 |
| Workspaces | 10 | CRUD, 초대, 수락, GUEST 역할, 설정 |
| Teams | 13 | CRUD, 멤버 관리, 대시보드, 태스크 필터 |
| Todos | 12 | CRUD, 필터, 캘린더 엔드포인트, completedAt |
| Threads | 13 | 연결, 순환 연결, 체인 생성, snap-back, 권한 |
| Notifications | 5 | 자동생성, 목록, 필터, 읽음처리 |

### 프론트엔드 (51개)

| 도구 | 테스트 수 | 내용 |
|------|----------|------|
| Vitest | 45 | Zustand 스토어 (auth, todo, workspace, notification), 유틸리티 |
| Playwright | 6 | 로그인/회원가입 크리티컬 패스 |

---

## 배포

### 아키텍처

```
┌─ Vercel ──────────────┐      ┌─ EC2 (t3.small) ──────────────┐
│  ito.krow.kr           │ ──▶ │  Caddy (자동 HTTPS)             │
│  (Next.js Static)      │      │    └─ api.ito.krow.kr          │
└────────────────────────┘      │       └─ ito-api:3011          │
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

Linear에서 영감을 받은 테마 시스템 (Light / Dark / Auto):

| 요소 | Dark | Light |
|------|------|-------|
| Background | `#0A0A0A` | `#FFFFFF` |
| Surface | `#1A1A1A` | `#F5F5F5` |
| Font | Inter / Geist | Inter / Geist |
| Style | 미니멀, 고밀도 정보 UI | |

---

## 라이선스

Private — All rights reserved.
