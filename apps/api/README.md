# ito API

ito 프로젝트의 NestJS 백엔드 서버.

## 구조

```
src/
├── auth/           # JWT 인증, Google/GitHub OAuth, Passport 전략
├── users/          # 프로필 조회/수정, 아바타, 사용자 검색
├── workspaces/     # 워크스페이스 CRUD, 멤버 관리, 초대 시스템
├── teams/          # 팀 CRUD, 멤버 추가/제거
├── todos/          # 태스크 CRUD, 필터링, 상태 변경
├── threads/        # 실 연결(connect), 해제(resolve), snap-back
├── notifications/  # 알림 생성/조회/읽음 처리
├── activities/     # 활동 로그
├── files/          # 파일 업로드 (Multer, 10MB 제한)
├── email/          # Resend 이메일 발송
├── websocket/      # Socket.IO 실시간 알림
└── common/         # PrismaService, JWT Guard, 글로벌 필터
```

## 실행

```bash
# 루트에서 (Turborepo)
pnpm dev:api

# 또는 직접
cd apps/api
pnpm start:dev
```

## 환경 변수

`apps/api/.env` (`.env.example` 참고):

```env
DATABASE_URL=postgresql://ito:ito_dev@localhost:5432/ito
JWT_SECRET=dev-secret
JWT_REFRESH_SECRET=dev-refresh-secret
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
API_PORT=3001
FRONTEND_URL=http://localhost:3000
```

## 테스트

```bash
# E2E (테스트 DB 필요: ito_test)
pnpm test:e2e
```

50개 E2E 테스트, `--runInBand`로 순차 실행.

## API 문서

서버 실행 후: http://localhost:3001/api/docs (Swagger UI)

## Docker

```bash
# 프로덕션 빌드 (krow-infra에서 사용)
docker build -f apps/api/Dockerfile -t ito-api .
```

멀티스테이지 빌드: Node 20 alpine 기반, `dist/main.js` 실행, 포트 3001.
