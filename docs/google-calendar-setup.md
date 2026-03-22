# Google Calendar 연동 가이드

## 1. 개요

ito는 Google Calendar와 연동하여 캘린더 이벤트를 앱 내에서 확인할 수 있습니다. 연동 후 Calendar 페이지에서 Google Calendar 일정이 자동으로 표시되며, 태스크에 마감일을 설정하면 Google Calendar에 이벤트가 생성됩니다.

## 2. 사전 준비

### 2.1 Google Cloud Console 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 상단의 프로젝트 선택 드롭다운 클릭 → **새 프로젝트** 생성
3. 프로젝트 이름 입력 (예: `ito-calendar`) → **만들기** 클릭

### 2.2 OAuth 동의 화면 설정

1. 좌측 메뉴 → **API 및 서비스** → **OAuth 동의 화면**
2. 사용자 유형: **외부** 선택 → **만들기**
3. 필수 정보 입력:
   - 앱 이름: `ito`
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 이메일: 본인 이메일
4. **범위(Scopes)** 단계에서 다음 범위 추가:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly`
5. **테스트 사용자** 단계에서 테스트할 Google 계정 추가
6. **저장 후 계속**

### 2.3 Google Calendar API 활성화

1. 좌측 메뉴 → **API 및 서비스** → **라이브러리**
2. "Google Calendar API" 검색
3. **사용 설정** 클릭

### 2.4 OAuth 2.0 클라이언트 ID 생성

1. 좌측 메뉴 → **API 및 서비스** → **사용자 인증 정보**
2. **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
3. 애플리케이션 유형: **웹 애플리케이션**
4. 이름: `ito Calendar` (자유)
5. **승인된 리디렉션 URI** 추가:
   - 로컬 개발: `http://localhost:3011/calendar/google/callback`
   - 프로덕션: `https://api.itothread.com/calendar/google/callback`
6. **만들기** 클릭
7. **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사 (환경 변수에 사용)

## 3. 환경 변수 설정

### 로컬 개발 (`apps/api/.env`)

```env
# Google Calendar OAuth
GOOGLE_CALENDAR_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret

# API URL (콜백 리다이렉트에 사용)
API_URL=http://localhost:3011

# 프론트엔드 URL (OAuth 완료 후 웹 리다이렉트)
FRONTEND_URL=http://localhost:3010
```

### 프로덕션 (`~/krow-infra/.env.production`)

```env
GOOGLE_CALENDAR_CLIENT_ID=your-production-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=your-production-client-secret
API_URL=https://api.itothread.com
FRONTEND_URL=https://itothread.com
```

| 변수                            | 설명                                              |
| ------------------------------- | ------------------------------------------------- |
| `GOOGLE_CALENDAR_CLIENT_ID`     | Google OAuth 클라이언트 ID                        |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿                    |
| `API_URL`                       | API 서버 URL (콜백 리다이렉트 URI 구성에 사용)    |
| `FRONTEND_URL`                  | 프론트엔드 URL (웹 OAuth 완료 후 리다이렉트 대상) |

## 4. 연동 방법

1. ito 앱에서 **Settings** 페이지로 이동
2. **Calendar Integrations** 섹션에서 Google Calendar의 **Connect** 버튼 클릭
3. Google 로그인 화면이 열리면 계정 선택 및 권한 승인
4. 연동이 완료되면 Settings 페이지로 돌아오며 상태가 "Connected"로 변경

### 데스크톱 앱 (Tauri)

데스크톱 앱에서는 외부 브라우저가 자동으로 열려 Google 로그인을 진행합니다. 인증 완료 후 브라우저에 "Calendar connected" 안내 페이지가 표시되며, 앱이 자동으로 연동 상태를 감지합니다.

## 5. 캘린더 선택

### 기본값

연동 시 기본적으로 **primary** 캘린더(기본 캘린더)의 이벤트를 가져옵니다.

### 다른 캘린더 선택

API를 통해 접근 가능한 캘린더 목록을 조회하고 변경할 수 있습니다:

```bash
# 캘린더 목록 조회
GET /calendar/google/calendars
Authorization: Bearer <access-token>

# 특정 캘린더로 변경
PATCH /calendar/integrations/:id
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "calendarId": "your-calendar-id@group.calendar.google.com"
}
```

## 6. 이벤트 표시

### Calendar 페이지

연동이 완료되면 Calendar 페이지에서 Google Calendar 이벤트가 자동으로 표시됩니다.

### 표시되는 정보

- **제목** (summary)
- **시작/종료 시간** (start/end)
- **종일 여부** (isAllDay)
- **설명** (description)
- **원본 링크** (htmlLink) - 클릭 시 Google Calendar에서 열기

## 7. 트러블슈팅

### "Google Calendar integration is not configured"

환경 변수가 올바르게 설정되지 않았습니다.

- `GOOGLE_CALENDAR_CLIENT_ID`와 `GOOGLE_CALENDAR_CLIENT_SECRET`이 `apps/api/.env`에 설정되어 있는지 확인
- API 서버를 재시작하여 환경 변수 적용

### 연동됐는데 이벤트가 안 보임

1. **토큰 만료**: 장시간 사용하지 않으면 토큰이 만료될 수 있습니다. Settings에서 Disconnect 후 다시 Connect를 시도하세요.
2. **디버그 엔드포인트로 확인**:

   ```bash
   GET /calendar/debug
   Authorization: Bearer <access-token>
   ```

   응답에 포함되는 정보:
   - `integrations`: 연결된 캘린더 목록
   - `googleEventsCount`: 이번 달 Google 이벤트 수
   - `sampleEvents`: 샘플 이벤트 (최대 3개)
   - `error`: 오류 발생 시 메시지

3. **캘린더 ID 확인**: 기본값 `primary`가 아닌 다른 캘린더를 사용 중인 경우, 해당 캘린더에 이벤트가 있는지 확인

### OAuth 리디렉트 에러

- Google Cloud Console에서 **승인된 리디렉션 URI**가 정확히 일치하는지 확인:
  - 로컬: `http://localhost:3011/calendar/google/callback`
  - 프로덕션: `https://api.itothread.com/calendar/google/callback`
- URI 끝에 슬래시(`/`)가 없어야 합니다

### 데스크톱 앱에서 동작 안 함

- Tauri 데스크톱 앱에서는 외부 브라우저를 통한 OAuth 플로우를 사용합니다
- 브라우저가 열리지 않는 경우: `@tauri-apps/plugin-shell` 플러그인이 설치되어 있는지 확인
- 인증 후 앱에 반영되지 않는 경우: 앱이 폴링을 통해 결과를 확인하므로 최대 2초 정도 소요될 수 있습니다
- 5분 이내에 인증을 완료하지 않으면 폴링이 중단됩니다. 다시 Connect를 클릭하세요.

## 8. 연동 해제

1. **Settings** 페이지로 이동
2. Google Calendar 항목에서 **Disconnect** 버튼 클릭
3. 연동이 즉시 해제되며, 저장된 토큰이 삭제됩니다

> **참고**: 연동을 해제해도 기존에 Google Calendar에 생성된 이벤트는 삭제되지 않습니다. Google Calendar에서 직접 삭제해야 합니다.
