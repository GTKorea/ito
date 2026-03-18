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
│   │   │   ├── activity/             # 활동 로그
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
│       │   │   ├── (auth)/           # 로그인/회원가입
│       │   │   └── invite/           # 초대 수락 페이지
│       │   ├── components/           # UI 컴포넌트
│       │   ├── stores/               # Zustand 스토어
│       │   └── lib/                  # API 클라이언트, 유틸
│       └── vercel.json               # Vercel 배포 설정
│
├── packages/
│   └── shared/                       # 공유 타입/상수
│
├── docker-compose.yml                # 개발용 PostgreSQL
├── docker-compose.prod.yml           # 프로덕션 (API + DB + Caddy)
├── Caddyfile                         # 리버스 프록시 + 자동 HTTPS
└── deploy.sh                         # EC2 배포 스크립트
```

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
# API 환경변수 (.env.example 참고)
cp apps/api/.env.example apps/api/.env
# 필요한 값 수정 (JWT_SECRET 등)

# Desktop 환경변수
cp apps/desktop/.env.example apps/desktop/.env.local
```

### 3. 데이터베이스 설정

```bash
# Docker로 PostgreSQL 실행
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
cd apps/api && pnpm test:e2e
```

### 테스트 커버리지

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

### 웹 배포 아키텍처

```
ito.krow.kr (Vercel)  ──→  api.ito.krow.kr (API 서버)
   Frontend (Next.js)         NestJS + PostgreSQL
```

### 방법 1: 로컬 서버 + Cloudflare Tunnel (개발/검증용)

로컬에서 API를 실행하고 Cloudflare Tunnel로 인터넷에 노출:

```bash
# 1. cloudflared 설치
brew install cloudflared

# 2. Cloudflare 로그인 및 터널 생성
cloudflared tunnel login
cloudflared tunnel create ito-api
cloudflared tunnel route dns ito-api api.ito.krow.kr

# 3. 터널 설정 (~/.cloudflared/config.yml)
tunnel: ito-api
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: api.ito.krow.kr
    service: http://localhost:3001
  - service: http_status:404

# 4. 로컬 서버 + 터널 실행
docker compose up -d          # PostgreSQL
pnpm dev:api                  # API (localhost:3001)
cloudflared tunnel run ito-api  # 터널 (api.ito.krow.kr → localhost:3001)
```

### 방법 2: AWS EC2 (프로덕션)

Docker Compose로 API + PostgreSQL + Caddy를 EC2에서 실행:

```bash
# EC2에서 실행
git clone <repo> ~/ito && cd ~/ito

# 환경변수 설정
cp .env.production.example .env.production
# DB_PASSWORD, JWT_SECRET 등 수정

# 빌드 및 실행
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# DB 마이그레이션
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

또는 배포 스크립트 사용:
```bash
./deploy.sh ubuntu@<EC2_IP> ~/.ssh/key.pem
```

### Vercel 프론트엔드 배포

1. Vercel에서 GitHub 레포 연결
2. Root Directory: `apps/desktop`
3. Environment Variables: `NEXT_PUBLIC_API_URL=https://api.ito.krow.kr`
4. Deploy → Settings → Domains → `ito.krow.kr` 추가

### DNS 설정

| 타입 | 이름 | 값 |
|------|------|-----|
| CNAME | `ito` | `cname.vercel-dns.com` |
| CNAME | `api.ito` | `<tunnel-id>.cfargotunnel.com` (Cloudflare Tunnel) |
| A | `api.ito` | EC2 Elastic IP (프로덕션) |

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
