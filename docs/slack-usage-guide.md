# ito × Slack 사용 가이드

Slack에서 ito의 태스크를 관리하고 실시간 알림을 받을 수 있습니다.

---

## 1. Slack 연동하기

### 워크스페이스 관리자

1. ito 웹에서 **Settings** 페이지로 이동
2. **Slack Integration** 섹션에서 **Add to Slack** 클릭
3. Slack 인증 화면에서 연동할 Slack 워크스페이스를 선택하고 **허용**
4. 리다이렉트 후 "Connected" 상태가 표시되면 완료

> 하나의 ito 워크스페이스에 하나의 Slack 워크스페이스가 연결됩니다.

### 팀원 (개별 계정 연동)

별도 설정이 필요 없습니다. Slack에서 `/ito` 명령어를 처음 사용하면, Slack 이메일과 동일한 ito 계정이 자동으로 연결됩니다.

**조건:** Slack에 등록된 이메일과 ito 계정 이메일이 같아야 합니다.

---

## 2. 슬래시 명령어

Slack의 아무 채널에서 `/ito` 명령어를 사용할 수 있습니다. 응답은 나에게만 보입니다(ephemeral).

### `/ito create <태스크명>`

새 태스크를 생성합니다.

```
/ito create 3월 리포트 작성
/ito create 랜딩페이지 디자인 리뷰
```

→ ✅ 태스크가 생성되었습니다: **3월 리포트 작성**

### `/ito list`

나에게 배정된 태스크 목록을 조회합니다 (최대 10개).

```
/ito list
```

→ 상태(OPEN, IN_PROGRESS, BLOCKED 등)와 우선순위(🔥 URGENT, ⬆️ HIGH)가 함께 표시됩니다.

### `/ito help`

사용 가능한 명령어 목록을 확인합니다.

```
/ito help
```

### `/ito connect @user` (준비 중)

태스크의 실(Thread)을 다른 사람에게 연결합니다.

### `/ito resolve` (준비 중)

현재 내게 연결된 실을 완료하고 이전 담당자에게 되돌립니다(snap-back).

---

## 3. Slack 알림

ito에서 발생하는 이벤트를 Slack DM으로 받을 수 있습니다.

### 알림 활성화

1. ito 웹 → **Settings** → **Notification Settings**
2. 받고 싶은 알림 유형에서 **Slack** 토글을 켜기

### 알림 종류

| 이벤트 | Slack 메시지 |
|--------|-------------|
| 실 수신 | 🧵 OOO님이 '태스크명' 태스크를 넘겼습니다 |
| 실 snap-back | 🔙 '태스크명' 태스크가 되돌아왔습니다 |
| 실 완료 | ✅ '태스크명' 태스크의 실이 완료되었습니다 |
| 워크스페이스 초대 | 📨 워크스페이스 초대가 도착했습니다 |
| 태스크 배정 | 📋 '태스크명' 태스크가 배정되었습니다 |
| 태스크 완료 | ✅ '태스크명' 태스크가 완료되었습니다 |

### Webhook 방식 (대안)

봇 DM 대신 Slack Incoming Webhook URL을 직접 입력할 수도 있습니다.

1. Settings → Notification Settings
2. 알림 유형별 webhook URL 입력란에 Slack webhook URL 붙여넣기

---

## 4. 자주 묻는 질문

### 명령어 사용 시 "Slack 계정이 ito와 연동되지 않았습니다" 메시지가 뜹니다

- Slack 이메일과 ito 가입 이메일이 다를 수 있습니다. 동일한 이메일로 ito에 가입되어 있는지 확인하세요.
- ito 워크스페이스의 멤버여야 합니다. 워크스페이스에 초대받았는지 확인하세요.

### 알림이 오지 않습니다

- Settings → Notification Settings에서 해당 알림의 Slack 토글이 켜져 있는지 확인하세요.
- `/ito list` 같은 명령어를 한 번 실행해야 계정이 자동 연동됩니다. 먼저 명령어를 한 번 사용해 보세요.

### 여러 ito 워크스페이스를 하나의 Slack에 연결할 수 있나요?

현재는 Slack 워크스페이스 하나당 ito 워크스페이스 하나만 연결됩니다.

### 연동을 해제하고 싶습니다

Slack 워크스페이스에서 ito 앱을 삭제하면 자동으로 연동 데이터가 정리됩니다.
- Slack → Settings & Administration → Manage Apps → ito → Remove
