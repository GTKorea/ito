# 허들 (Huddle) 기능 스펙

## 개요
특정 태스크에 연결된 사용자들 간 음성 통화 기능. 슬랙의 허들과 유사하게, 태스크 컨텍스트 안에서 빠르게 음성으로 소통할 수 있는 기능.

## 사용 시나리오
- 태스크가 나에게 왔는데 무슨 내용인지 직접 설명을 들어야 할 때
- 실 연결된 팀원과 빠르게 논의가 필요할 때
- 채팅으로는 충분하지 않은 복잡한 설명이 필요할 때

## 검토된 구현 옵션

### Option 1: LiveKit (추천)
- **장점**: 오픈소스, 셀프호스팅 가능, WebRTC 기반, React SDK 제공
- **단점**: 셀프호스팅 시 TURN 서버 필요, 인프라 관리 부담
- **비용**: 셀프호스팅 시 서버 비용만, 클라우드 시 분당 과금
- **SDK**: `@livekit/components-react`, `livekit-client`
- **서버**: Docker로 배포 가능 (`livekit/livekit-server`)

### Option 2: Agora SDK
- **장점**: 안정적, 쉬운 통합, 글로벌 인프라
- **단점**: 폐쇄 소스, 분당 과금
- **비용**: 10,000분/월 무료, 이후 $0.99/1000분
- **SDK**: `agora-rtc-sdk-ng`

### Option 3: Daily.co
- **장점**: API 기반, 프리티어 (10,000분/월), 빠른 통합
- **단점**: 커스터마이징 제한, 종속성
- **SDK**: `@daily-co/daily-js`

### Option 4: WebRTC 직접 구현
- **장점**: 완전한 제어, 외부 종속성 없음
- **단점**: STUN/TURN 서버 구축 필요, 시그널링 서버 필요, 복잡도 매우 높음
- **비용**: 서버 비용만
- **예상 개발 기간**: 2-4주

## 추천: LiveKit

### 이유
1. 오픈소스 — 벤더 종속 없음
2. 셀프호스팅 가능 — EC2에 Docker로 배포
3. React SDK — 프론트엔드 통합 용이
4. Tauri/웹 모두 지원
5. 룸 기반 — 태스크별 룸 생성으로 자연스러운 매핑

### 아키텍처 (구현 시)
```
사용자 → Frontend (LiveKit React SDK)
              ↕ WebRTC
         LiveKit Server (Docker on EC2)
              ↕
         ito API (룸 생성/관리, 토큰 발급)
```

### 필요한 작업
1. **백엔드**: LiveKit 서버 토큰 생성 API (`POST /todos/:todoId/huddle/token`)
2. **프론트엔드**: 허들 UI 컴포넌트 (참여/나가기 버튼, 참여자 표시)
3. **인프라**: LiveKit 서버 Docker 배포 (krow-infra 레포)
4. **DB**: 허들 세션 로그 (선택)

### 예상 비용
- EC2 t3.medium 추가: ~$30/월 (LiveKit 서버)
- 또는 LiveKit Cloud: 분당 과금

## 결정 사항 (추후)
- [ ] 셀프호스팅 vs 클라우드
- [ ] 화면 공유 포함 여부
- [ ] 녹음 기능 필요 여부
- [ ] 최대 참여자 수
