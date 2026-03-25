# ito 런칭 & 홍보 전략

## 목차
1. [핵심 메시징](#핵심-메시징)
2. [런칭 채널별 전략](#런칭-채널별-전략)
3. [커뮤니티별 게시글](#커뮤니티별-게시글)
4. [오픈소스 전환 분석](#오픈소스-전환-분석)
5. [실행 타임라인](#실행-타임라인)

---

## 핵심 메시징

### 한 줄 요약
> **"Task tools let you assign. ito lets you chain — hand off work, and it snaps back when done."**

### 한국어
> **"기존 도구는 '할당'만 합니다. ito는 업무를 '연결'합니다 — 넘기고, 끝나면 자동으로 돌아옵니다."**

### 문제 정의
기존 태스크 관리 도구(Jira, Asana, Linear)는 **할당(assign)** 모델입니다.
- A가 B에게 할당 → B가 완료 표시 → A가 직접 확인해야 함
- 다단계 위임(A→B→C)을 추적할 방법이 없음
- "이 일이 지금 누구한테 있지?"를 매번 물어봐야 함

### 해결
ito의 **스레드 체인(Thread Chain)** 시스템:
- A가 B에게 연결(connect) → B가 C에게 연결 → C가 완료(resolve) → **자동으로 B에게 돌아옴** → B가 완료 → **자동으로 A에게 돌아옴**
- 업무의 위치가 항상 명확하고, 완료 시 자동 snap-back

### 차별화 포인트
| | Jira/Asana/Linear | ito |
|---|---|---|
| 위임 | 단일 할당 | 체인 연결 (무한 깊이) |
| 반환 | 수동 확인 | 자동 snap-back |
| 추적 | 상태 필드로 추론 | 실(Thread)로 시각화 |
| 블로커 | 코멘트로 기록 | 블로커 타입으로 명시적 관리 |

---

## 런칭 채널별 전략

### Tier 1 — 핵심 런칭 (1-2주차)

#### Product Hunt
- **목표**: #1-5 Daily Ranking
- **런칭일**: 화-목 중 택 1, 00:01 PST (한국 시간 17:01)
- **사전 준비 (2-4주 전)**:
  - Maker 프로필 활성화 (다른 제품에 upvote/댓글)
  - Coming Soon 페이지 등록 → 사전 구독자 확보
  - 30초 데모 GIF + 1분 영상 제작
  - 5장 이내 갤러리 이미지
- **런칭 당일**:
  - Maker Comment 게시 (아래 작성 완료)
  - 모든 댓글에 30분 내 답변
  - Twitter/X, LinkedIn 동시 공유

#### 디스콰이엇 (한국 Product Hunt)
- **목표**: 한국 초기 사용자 확보 + 피드백
- **Product Hunt 1주 전에 먼저 런칭** → 한국 피드백으로 보완 후 글로벌 런칭

### Tier 2 — 기술 커뮤니티 (2-3주차)

#### Hacker News (Show HN)
- 기술적 차별점 강조 (NestJS + Prisma + Tauri + Next.js)
- 스레드 체인 알고리즘 설명
- Product Hunt 런칭 다음 주에 게시

#### GeekNews (news.hada.io)
- 한국 개발자 커뮤니티
- 기술 스택 + 오픈소스 전환 이야기가 잘 먹힘

#### Reddit
- r/SaaS — SaaS 빌더 관점
- r/startups — 스타트업 스토리
- r/productivity — 사용자 관점
- r/selfhosted — 셀프호스팅 가능하면 (오픈소스 전환 시)

### Tier 3 — 콘텐츠 마케팅 (지속)

#### 블로그/글
- "Why task assignment is broken (and how thread chains fix it)"
- "Building a Linear-inspired dark theme with Tailwind CSS"
- "Tauri v2 + Next.js: 웹앱을 데스크톱으로"

#### 플랫폼
- Twitter/X — 빌딩 과정 스레드
- LinkedIn — B2B 타겟 글
- 커리어리/브런치 — 한국 개발자 타겟

---

## 커뮤니티별 게시글

### Product Hunt — Tagline & Description

**Tagline** (60자):
```
Thread-based task chains that snap back when done
```

**Description**:
```
ito (糸, "thread" in Japanese) reimagines task management around one simple idea:
work should flow like a thread — passed forward, and snapped back when complete.

🧵 Thread Chains: Connect tasks to teammates in a chain.
   A → B → C. When C finishes, it snaps back to B. Then to A.

⚡ Automatic Snap-back: No more "is this done?" messages.
   When someone resolves their part, the thread returns to you automatically.

🚫 Explicit Blockers: Mark external dependencies as blockers, not just comments.
   Your team always knows what's truly blocked vs. in progress.

🔒 Public & Private Groups: Organize tasks into Slack-like channels.
   Public for transparency, Private for focused teams.

💬 Built-in Chat & Files: Every task has its own thread —
   no more context-switching between Slack and your task board.

🌍 9 Languages: English, Korean, Japanese, Chinese (Simplified/Traditional),
   German, Spanish, French, Portuguese.

🖥️ Desktop App: Native apps for macOS, Windows, Linux via Tauri v2.

Built with NestJS, Next.js, Prisma, and Tauri.
```

**Maker Comment (첫 댓글)**:
```
Hi everyone! 👋

I'm the maker of ito. I built this because I was frustrated with how every task
tool treats delegation as a one-way street.

In real work, tasks bounce between people:
- You ask someone to review something → they review it → it comes back to you
- You delegate to Person B → they need input from Person C → eventually it all
  comes back

But in Jira/Asana/Linear, you lose track of this flow. You end up asking
"hey, where is that task?" in Slack.

ito solves this with Thread Chains. When you connect a task to someone,
a thread is created. When they're done, it automatically snaps back to you.
No manual status updates needed.

The name "ito" (糸) means "thread" in Japanese — because work flows like
a thread between people.

I'd love your feedback! What's the most annoying part of task delegation
in your team?
```

---

### 디스콰이엇

**제목**: ito — 업무를 넘기면 자동으로 돌아오는 태스크 관리 도구

**본문**:
```
안녕하세요! ito(糸)를 만들고 있는 개발자입니다.

## 이런 경험 있으신가요?

"그 건 지금 누구한테 있어?"
"검토 다 했어? 언제 넘겨줘?"

Jira든 Asana든 Linear든, 업무를 할당하고 나면
그 다음은 전부 수동입니다. 슬랙에서 물어보고, 상태를 직접 바꾸고.

## ito는 이렇게 다릅니다

**스레드 체인(Thread Chain)**: 업무를 '할당'이 아니라 '연결'합니다.

1. 내가 태스크를 만들고 → 김대리에게 연결
2. 김대리가 → 박과장에게 연결
3. 박과장이 완료 → **자동으로 김대리에게 돌아옴**
4. 김대리가 완료 → **자동으로 나에게 돌아옴**

업무가 실(Thread)처럼 연결되어 있어서,
누가 무엇을 들고 있는지 항상 명확합니다.

## 주요 기능

- 🧵 **스레드 체인** — 다단계 위임 + 자동 snap-back
- 🚫 **블로커 관리** — 외부 의존성을 명시적으로 표시
- 💬 **태스크별 채팅** — 맥락이 흩어지지 않음
- 🔒 **Public/Private 그룹** — Slack 채널 같은 태스크 그룹
- 🌍 **9개 언어 지원** — 글로벌 팀 대응
- 🖥️ **데스크톱 앱** — macOS, Windows, Linux (Tauri v2)
- ⚡ **Slack 통합** — `/ito` 명령어로 태스크 생성/체인 연결

## 기술 스택

NestJS 11 + Next.js 16 + Prisma 5 + Tauri v2 + Socket.IO

## 피드백 부탁드립니다

현재 베타 단계이고, 실제 팀에서 사용 중입니다.
불편한 점이나 개선 아이디어가 있으시면 편하게 댓글 남겨주세요!

🔗 https://itothread.com
```

---

### Hacker News — Show HN

**제목**:
```
Show HN: ito – Task management with thread chains that snap back when resolved
```

**본문**:
```
I built ito (糸, "thread" in Japanese) because task delegation in existing
tools is fundamentally one-directional.

The core idea: Thread Chains with automatic snap-back.

When you connect a task to someone, a bidirectional thread is created.
They can chain it further (A→B→C→...). When the last person resolves
their link, the thread "snaps back" through the chain: C→B, then B→A.
Each person gets their task back automatically, with the chain depth
capped at 20.

Key constraints that shaped the design:
- You can't connect to yourself
- Only the current assignee can forward the chain
- Circular connections are blocked (for active links only — resolved links allow reconnection)
- Blockers are first-class: a separate ThreadLink type with no target user, just a note

Tech stack:
- Backend: NestJS 11, Prisma 5, PostgreSQL, Socket.IO
- Frontend: Next.js 16 (static export), Tailwind + shadcn/ui
- Desktop: Tauri v2 (macOS, Windows, Linux)
- Slack integration: /ito slash commands for task creation and chaining
- i18n: 9 locales via next-intl

The thread chain algorithm is straightforward — ThreadLink records form
a linked list per task, with chainIndex tracking depth and status
(PENDING → FORWARDED → COMPLETED) managing the snap-back cascade.

Interested in feedback on the chain model. Is the snap-back metaphor
intuitive? Would you use this in your team?

https://itothread.com
```

---

### GeekNews

**제목**: ito(糸) — 실 기반 태스크 체인으로 업무 위임을 자동화하는 협업 도구

**본문**:
```
## 핵심 아이디어

기존 태스크 도구의 '할당' 모델 대신, '스레드 체인' 모델을 사용합니다.

- A→B→C 체인으로 업무를 넘김
- C가 완료하면 자동으로 B에게 snap-back
- B가 완료하면 자동으로 A에게 snap-back

ThreadLink 레코드가 linked list를 형성하고,
chainIndex로 깊이를, status(PENDING/FORWARDED/COMPLETED)로
snap-back 캐스케이드를 관리합니다.

## 기술 스택

- NestJS 11 + Prisma 5 + PostgreSQL
- Next.js 16 (Static Export) + Tauri v2
- Socket.IO (실시간 알림)
- Slack 통합 (/ito 명령어)
- 9개 언어 (next-intl)

## 특이한 설계 결정

1. **블로커를 ThreadLink의 타입으로 구현** — 별도 모델 없이
   type: BLOCKER, toUserId: null, blockerNote로 처리
2. **순환 연결 방지** — 활성 링크(PENDING/FORWARDED)에 포함된
   사용자에게만 차단, COMPLETED 링크의 유저에게는 재연결 허용
3. **Static Export + Tauri** — 하나의 코드베이스로 웹(Vercel) +
   데스크톱(macOS/Windows/Linux) 동시 배포

https://itothread.com
```

---

### Reddit — r/SaaS

**제목**: I built a task management tool where work automatically snaps back to you when delegated tasks are done

**본문**:
```
Hey r/SaaS,

I've been building ito for the past few months and just opened it up for beta.

**The problem I kept hitting:**
In every project management tool I've used (Jira, Asana, Linear, Notion),
delegating work is a one-way street. You assign a task to someone, and then
you have to manually track whether it's done, chase people on Slack,
and update statuses yourself.

It gets worse with multi-hop delegation: you ask Person A, who needs input
from Person B, who needs sign-off from Person C. Good luck tracking that
in a Kanban board.

**What ito does differently:**
Instead of "assigning" tasks, you "connect" them with threads.

When you connect a task to someone, a thread chain is created. They can
forward it further. When the last person finishes their part, the task
automatically "snaps back" through the chain until it reaches you.

Think of it like a rubber band — stretch it out through multiple people,
and it snaps back one by one as each person completes their part.

**Other features:**
- Slack integration (/ito commands)
- Public/Private groups (like Slack channels for tasks)
- Built-in chat per task
- Desktop apps (macOS, Windows, Linux)
- 9 language support

**Tech:** NestJS + Next.js + Prisma + Tauri v2

Would love feedback from fellow SaaS builders.
Is the "thread chain" concept intuitive to you?

🔗 https://itothread.com
```

---

## 오픈소스 전환 분석

### 오픈소스 전환 시 이점

#### 1. 성장 & 마케팅
- **GitHub Stars = 무료 마케팅**: 트렌딩에 오르면 수천~수만 명 노출
- **개발자 커뮤니티 형성**: 기여자 → 얼리 어답터 → 유료 고객 파이프라인
- **신뢰도 향상**: "코드를 볼 수 있다"는 것 자체가 B2B 신뢰 요소
- **SEO 부스트**: GitHub 레포, 기술 블로그, 커뮤니티 글에서의 백링크
- **Hacker News/Reddit 반응**: 오픈소스 프로젝트에 훨씬 우호적

#### 2. 제품 품질
- **커뮤니티 기여**: 버그 리포트, PR, 번역 (이미 9개 언어 지원 → 커뮤니티가 추가 번역 가능)
- **보안 감사**: 오픈 코드 → 커뮤니티 보안 리뷰
- **셀프호스팅 사용자**: Docker Compose로 쉽게 배포 가능 (이미 인프라 있음)

#### 3. 채용 & 브랜딩
- 오픈소스 유지보수자 = 기술력 증명
- 기여자 중 잠재적 팀원 발굴

### 오픈소스 전환 시 리스크

#### 1. 경쟁자 복제
- **완화 방법**: 핵심 가치는 코드가 아니라 제품 완성도, UX, 커뮤니티
- Linear도 비공개이지만, Cal.com, Plausible 등은 오픈소스로 성공

#### 2. 유지보수 부담
- 이슈/PR 관리, 문서화, 커뮤니티 응대에 시간 소요
- 초기에는 "읽기 전용 오픈소스" (이슈만 받고 PR은 선별적)도 가능

#### 3. 수익화 복잡성
- 셀프호스팅 사용자는 유료 전환이 어려움
- 클라우드 vs 셀프호스팅 기능 차별화 필요

### 추천 수익화 모델: Open Core

```
┌─────────────────────────────────────────────┐
│              ito Cloud (유료)                │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Pro 기능 (클라우드 전용)            │    │
│  │  - SSO / SAML                       │    │
│  │  - 감사 로그 (Audit Log)            │    │
│  │  - 고급 분석 대시보드               │    │
│  │  - 우선 지원                        │    │
│  │  - 자동 백업                        │    │
│  │  - 워크스페이스 무제한 멤버         │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Community Edition (오픈소스, AGPL)  │    │
│  │  - 스레드 체인 + snap-back          │    │
│  │  - Public/Private 그룹              │    │
│  │  - Slack 통합                       │    │
│  │  - 채팅 + 파일                      │    │
│  │  - 9개 언어                         │    │
│  │  - 데스크톱 앱                      │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### 라이선스 추천

| 라이선스 | 장점 | 단점 | 사용 예 |
|---------|------|------|---------|
| **AGPL-3.0** | SaaS 경쟁자 방지 (수정 시 소스 공개 의무) | 기업 채택에 거부감 | GitLab, Mattermost |
| **MIT** | 채택 장벽 최소 | SaaS 복제에 무방비 | Cal.com (초기) |
| **BSL (Business Source License)** | N년 후 오픈소스 전환, 그 전엔 경쟁 사용 금지 | 커뮨니티 반감 가능 | HashiCorp, Sentry |
| **Apache-2.0 + Commons Clause** | 특허 보호 + 재판매 금지 | OSI 미인증 | — |

**추천: AGPL-3.0**
- SaaS 경쟁자가 코드를 포크해서 호스팅 서비스를 만들려면 전체 소스를 공개해야 함
- 셀프호스팅 사용자에게는 제한 없음
- GitLab이 이 모델로 $10B+ 회사가 됨

### 오픈소스 전환 로드맵 (제안)

```
Phase 1 (지금)     — 비공개 베타, 제품 안정화
Phase 2 (안정화 후) — GitHub Public 전환 (AGPL-3.0)
                     README, CONTRIBUTING.md, docker-compose 셀프호스팅 가이드
Phase 3 (커뮤니티)  — 이슈 템플릿, 로드맵 공개, Discussion 활성화
Phase 4 (수익화)    — ito Cloud 런칭 (Pro 기능 클라우드 전용)
                     Pricing: Free (5명) / Team ($8/user/mo) / Enterprise
```

### 오픈소스 성공 사례 비교

| 제품 | 모델 | 라이선스 | 수익 | 참고 |
|------|------|---------|------|------|
| GitLab | Open Core | MIT(CE) + EE | $500M+ ARR | 엔터프라이즈 기능 유료 |
| Cal.com | Open Core | AGPL | $20M+ 투자 | 호스팅 + 엔터프라이즈 |
| Plausible | Open Core | AGPL | $2M+ ARR | 클라우드 편의성으로 수익 |
| Mattermost | Open Core | AGPL(CE) + EE | $100M+ ARR | Slack 대안 포지셔닝 |
| Hoppscotch | Open Core | MIT | $6M+ 투자 | Postman 대안 |

### 결론

**오픈소스 전환을 추천합니다.** 이유:

1. ito의 핵심 경쟁력은 코드가 아니라 **스레드 체인이라는 콘셉트와 UX**
2. 초기 사용자 확보가 가장 어려운 시점에서 GitHub Stars는 강력한 마케팅 채널
3. AGPL 라이선스로 SaaS 경쟁자 복제를 실질적으로 방지 가능
4. Open Core 모델로 커뮤니티 에디션(무료) + 클라우드 프로(유료) 양립 가능
5. 셀프호스팅 사용자 중 일부가 관리 부담으로 결국 클라우드로 전환 → 유료 고객

---

## 실행 타임라인

### 런칭 전 준비 (D-21 ~ D-7)
- [ ] 30초 데모 GIF 제작 (스레드 체인 snap-back 시연)
- [ ] 1분 데모 영상 제작
- [ ] Product Hunt Coming Soon 페이지 등록
- [ ] Product Hunt 커뮤니티 활동 시작 (upvote, 댓글)
- [ ] 랜딩 페이지 보강 (인터랙티브 데모 또는 영상 임베드)
- [ ] 갤러리 스크린샷 5장 준비

### 한국 런칭 (D-7)
- [ ] 디스콰이엇 게시
- [ ] GeekNews 게시
- [ ] 한국 피드백 수집 + 반영

### 글로벌 런칭 (D-Day, 화~목)
- [ ] Product Hunt 런칭 (00:01 PST)
- [ ] Twitter/X 런칭 트윗
- [ ] LinkedIn 게시

### 런칭 후 (D+1 ~ D+14)
- [ ] Hacker News Show HN 게시 (D+3~7)
- [ ] Reddit r/SaaS, r/startups 게시
- [ ] 첫 블로그 글 발행
- [ ] 오픈소스 전환 여부 최종 결정

### 지속 (Monthly)
- [ ] 빌딩 과정 스레드 (Twitter/X)
- [ ] 기술 블로그 월 1회
- [ ] 사용자 피드백 기반 기능 업데이트 공유
