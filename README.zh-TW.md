# ito (糸) — 以線程為基礎的任務協作

> 透過**線程**連結團隊成員，移交任務，完成後自動回收。

[English](./README.md) | [한국어](./README.ko.md)

![NestJS](https://img.shields.io/badge/NestJS-11-ea2845?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-v2-ffc131?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square)
![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)

---

## 問題

每個任務工具都將委派視為單向流程：指派 → 完成。

但實際工作會在人與人之間來回流轉。你請某人審查某件事，他們需要另一個人的意見，最終一切都需要回到你手上。在 Jira、Asana 或 Linear 中，你會失去這個流程的蹤跡，最後只能在 Slack 上問「那個任務到哪了？」

## 解決方案：線程鏈

ito 透過**線程**連結任務——就像在人與人之間拉開的橡皮筋。當某人完成他們的部分，任務會自動沿著鏈路**彈回**。

```
A (建立) ──thread──▶ B ──thread──▶ C ──thread──▶ D
                                          │
                                     D 解決
                                          │
                                  彈回給 C
                                  C 解決 → 彈回給 B
                                  B 解決 → 彈回給 A
                                  A 標記為完成 ✓
```

- **連結**：目前負責人將任務連結給下一個人 → 狀態變為 `IN_PROGRESS`
- **轉發**：前一位負責人的連結自動變為 `FORWARDED`
- **彈回**：當某人解決他們的連結時，任務會回到前一個人手中
- **鏈深度**：最多 20 層
- **循環保護**：無法連結給活躍鏈中的成員（已解決的成員則可以）

---

## 功能

### 線程鏈系統
- **連結 / 解決**：移交任務並透過彈回機制自動回收
- **快速建立鏈**：輸入 `任務名稱 > @userB > @userC` 一次建立任務和鏈
- **圖形視覺化**：以互動式網路圖查看線程鏈（Obsidian 風格）

### 快速任務輸入
工作區底部的聊天式輸入列：

```
Frontend review > @kim > @lee
```

- `>` 分隔符號可同時建立任務並串接鏈
- `@` 觸發使用者自動完成
- 完全支援鍵盤操作（↑↓ 選擇，Tab/Enter 確認）

### 阻擋器
- 將外部依賴標記為明確的**阻擋器**（不只是留言）
- ThreadLink 上的阻擋器類型：`PERSON`（預設）| `BLOCKER`
- 有活躍阻擋器的任務會移至「已阻擋」區塊

### 群組（公開與私密）
- **公開群組**：工作區所有成員可見（類似 Slack 公開頻道）
- **私密群組**：僅限邀請，只有成員可見
- 可隨時切換公開/私密
- 可邀請個別成員或一次邀請整個團隊

### SharedSpace（跨工作區協作）
- 在不同工作區之間建立共享空間（不同團隊/公司）
- 跨工作區邊界連結線程鏈
- 各工作區維持自身的自主性

### Slack 整合
| 指令 | 說明 |
|---------|-------------|
| `/ito create <任務名稱>` | 建立任務 |
| `/ito list` | 列出我的任務 |
| `/ito connect` | 連結線程（即將推出） |
| `/ito resolve` | 解決線程（即將推出） |
| `/ito help` | 說明 |

線程通知（接收、彈回、完成）會以 Slack 私訊方式發送。

### 日曆檢視
- 月曆格狀顯示：已完成任務（綠色）與即將到期的截止日期（橘色）
- 點擊日期展開任務詳細資訊
- Google Calendar 與 Outlook Calendar OAuth 整合

### 團隊與工作區協作
- **角色**：OWNER / ADMIN / MEMBER / GUEST（唯讀 + 僅可解決）
- **團隊儀表板**：每位成員的工作量與任務統計
- **工作區設定**：名稱、說明、成員角色管理

### 通知
- **即時**：透過 Socket.IO 即時傳遞
- **桌面**：透過 Tauri 的原生系統通知
- **網頁**：瀏覽器 Notification API 備援方案
- **Slack**：所有通知類型轉發為私訊（選用）

### 國際化（i18n）
支援 9 種語言——可在設定中變更：

| 語言 | 代碼 |
|----------|------|
| English | `en` |
| 한국어 | `ko` |
| 日本語 | `ja` |
| 简体中文 | `zh-CN` |
| 繁體中文 | `zh-TW` |
| Español | `es` |
| Français | `fr` |
| Deutsch | `de` |
| Português | `pt` |

### 主題
亮色 / 暗色 / 自動（跟隨系統設定）——透過側邊欄的三段式開關切換。

---

## 技術堆疊

| 領域 | 技術 |
|------|------------|
| **後端** | NestJS 11, PostgreSQL 16, Prisma 5 |
| **前端** | Next.js 16 (Static Export), React 19 |
| **桌面應用** | Tauri v2 (macOS, Windows, Linux) |
| **狀態管理** | Zustand v5 |
| **UI** | Tailwind CSS v4, shadcn/ui v4 |
| **即時通訊** | Socket.IO |
| **驗證** | JWT + Passport (Email/PW, Google, GitHub OAuth) |
| **電子郵件** | Resend（選用） |
| **Slack** | @slack/web-api（選用） |
| **圖形** | @xyflow/react + @dagrejs/dagre |
| **i18n** | next-intl |
| **測試** | Jest (API E2E), Vitest + Playwright (Frontend) |
| **Monorepo** | pnpm workspaces + Turborepo |

---

## 專案結構

```
ito/
├── apps/
│   ├── api/                          # NestJS 後端
│   │   ├── prisma/
│   │   │   └── schema.prisma         # 資料庫結構
│   │   ├── src/
│   │   │   ├── auth/                 # 身份驗證 (JWT, OAuth)
│   │   │   ├── users/                # 使用者資料、搜尋、偏好設定
│   │   │   ├── workspaces/           # 工作區 CRUD、邀請、設定
│   │   │   ├── teams/                # 團隊管理、儀表板
│   │   │   ├── tasks/                # 任務 CRUD、篩選、日曆
│   │   │   ├── threads/              # 線程連結/解決/鏈（核心邏輯）
│   │   │   ├── task-groups/          # 公開/私密群組
│   │   │   ├── notifications/        # 通知服務
│   │   │   ├── slack/                # Slack 整合
│   │   │   ├── calendar/             # 外部日曆整合
│   │   │   ├── email/                # 郵件發送 (Resend)
│   │   │   ├── activities/           # 活動紀錄
│   │   │   ├── files/                # 檔案附件
│   │   │   ├── chat/                 # 每個任務的聊天訊息
│   │   │   ├── shared-spaces/        # 跨工作區協作
│   │   │   ├── websocket/            # Socket.IO 閘道
│   │   │   └── common/               # Guards、過濾器、Prisma
│   │   ├── test/                     # E2E 測試
│   │   └── Dockerfile                # 正式環境 Docker 建置
│   │
│   └── desktop/                      # Tauri + Next.js 前端
│       ├── src/
│       │   ├── app/
│       │   │   ├── (app)/            # 需驗證的路由
│       │   │   ├── (auth)/           # 登入 / 註冊 / OAuth 回呼
│       │   │   └── invite/           # 邀請接受頁面
│       │   ├── components/           # UI 元件
│       │   ├── stores/               # Zustand stores
│       │   ├── messages/             # i18n 翻譯檔案（9 種語言）
│       │   └── lib/                  # API 客戶端、WebSocket、工具
│       ├── src-tauri/                # Tauri 原生設定
│       └── vercel.json               # Vercel 部署設定
│
├── packages/
│   └── shared/                       # 共用型別/常數
│
└── docker-compose.yml                # 開發用 PostgreSQL
```

---

## 開始使用

### 前置需求

- Node.js 20+
- pnpm 9+
- PostgreSQL 16（或 Docker）
- Rust + Tauri CLI（僅桌面版建置需要）

### 本地開發

```bash
# 1. 安裝依賴
pnpm install

# 2. 啟動 PostgreSQL (Docker)
docker compose up -d

# 3. 設定環境變數
cp apps/api/.env.example apps/api/.env
cp apps/desktop/.env.example apps/desktop/.env.local

# 4. 執行資料庫遷移
cd apps/api && npx prisma migrate dev

# 5. 啟動開發伺服器
pnpm dev    # API (3011) + Desktop (3010)
```

### 指令

```bash
pnpm dev              # 所有開發伺服器
pnpm dev:api          # 僅 API（連接埠 3011）
pnpm dev:desktop      # 僅桌面版（連接埠 3010）
pnpm build            # 完整建置

# 測試
cd apps/api && pnpm test:e2e           # 後端 E2E
cd apps/desktop && pnpm test           # 前端單元測試 (Vitest)
cd apps/desktop && pnpm test:e2e       # 前端 E2E (Playwright)

# 工具
cd apps/api && npx prisma studio       # 資料庫 GUI
```

---

## 環境變數

所有外部整合皆為**選用**。若環境變數為空，該功能會自動停用。

### `apps/api/.env`

| 變數 | 說明 | 必填 |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL 連線字串 | ✅ |
| `JWT_SECRET` | JWT 簽署金鑰 | ✅ |
| `JWT_REFRESH_SECRET` | 重新整理權杖簽署金鑰 | ✅ |
| `API_PORT` | API 連接埠（預設：3011） | |
| `FRONTEND_URL` | 前端網址 | |
| `GOOGLE_CLIENT_ID` | Google OAuth | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | |
| `GITHUB_CLIENT_ID` | GitHub OAuth | |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | |
| `RESEND_API_KEY` | 邀請電子郵件 | |
| `SLACK_BOT_TOKEN` | Slack 整合 | |
| `SLACK_SIGNING_SECRET` | Slack 請求驗證 | |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google Calendar | |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google Calendar | |
| `OUTLOOK_CLIENT_ID` | Outlook Calendar | |
| `OUTLOOK_CLIENT_SECRET` | Outlook Calendar | |

### `apps/desktop/.env.local`

| 變數 | 說明 | 必填 |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | API 伺服器網址（預設：`http://localhost:3011`） | ✅ |

---

## 整合指南

### Slack

1. https://api.slack.com/apps → **Create New App**（From Scratch）
2. **Slash Commands** → 新增 `/ito`（Request URL：`https://your-api-domain/slack/commands`）
3. **Event Subscriptions** → 啟用（Request URL：`https://your-api-domain/slack/events`）
4. **OAuth & Permissions** → Bot Token Scopes：`commands`、`chat:write`、`users:read`、`users:read.email`
5. **Install to Workspace** → 複製 Bot Token → `SLACK_BOT_TOKEN`
6. **Basic Information** → Signing Secret → `SLACK_SIGNING_SECRET`

### Google Calendar

1. https://console.cloud.google.com → 啟用 Google Calendar API
2. **Credentials** → OAuth Client ID（Web application）
3. Redirect URI：`https://your-api-domain/calendar/google/callback`
4. 在 `.env` 中設定 Client ID/Secret
5. 使用者：設定 → 日曆整合 →「連結 Google Calendar」

### Outlook Calendar

1. https://portal.azure.com → **App registrations** → 新增註冊
2. Redirect URI：`https://your-api-domain/calendar/outlook/callback`
3. API 權限：`Calendars.ReadWrite`
4. 在 `.env` 中設定 Client ID/Secret

---

## 測試

```bash
# 建立測試資料庫（僅首次需要）
createdb ito_test

# 後端 E2E
cd apps/api && pnpm test:e2e

# 前端單元/整合測試
cd apps/desktop && pnpm test

# 前端 E2E
cd apps/desktop && pnpm test:e2e
```

### 後端 E2E 測試

| 領域 | 數量 | 涵蓋範圍 |
|------|-------|----------|
| Auth | 10 | 註冊、登入、權杖重新整理、401 檢查 |
| Workspaces | 10 | CRUD、邀請、接受、GUEST 角色、設定 |
| Teams | 13 | CRUD、成員管理、儀表板、任務篩選 |
| Tasks | 12 | CRUD、篩選、日曆端點、completedAt |
| Threads | 13 | 連結、循環鏈、彈回、權限 |
| Notifications | 5 | 自動建立、列表、篩選、標記已讀 |

### 前端測試

| 工具 | 數量 | 涵蓋範圍 |
|------|-------|----------|
| Vitest | 45 | Zustand stores（auth、task、workspace、notification）、工具函式 |
| Playwright | 6 | 登入/註冊關鍵路徑 |

---

## 部署

### 架構

```
┌─ Vercel ──────────────┐      ┌─ EC2 (t3.small) ──────────────┐
│  itothread.com        │ ──▶  │  Caddy (自動 HTTPS)            │
│  (Next.js Static)     │      │    └─ api.itothread.com        │
└───────────────────────┘      │       └─ ito-api:3011          │
                               │  PostgreSQL 16                  │
                               └─────────────────────────────────┘
```

### 使用 Docker 自行架設

```bash
git clone https://github.com/GTKorea/ito.git
cd ito
cp apps/api/.env.example apps/api/.env
# 編輯 apps/api/.env，填入你的資料庫和密鑰

docker compose -f docker-compose.prod.yml up -d
```

### Vercel（前端）

1. 在 Vercel 上連結 GitHub 儲存庫
2. Root Directory：`apps/desktop`
3. Framework Preset：`Other`（Static Export）
4. 環境變數：`NEXT_PUBLIC_API_URL=https://your-api-domain`

---

## 設計

受 Linear 啟發的主題系統（亮色 / 暗色 / 自動）：

| 元素 | 暗色 | 亮色 |
|---------|------|-------|
| 背景 | `#0A0A0A` | `#FFFFFF` |
| 表面 | `#1A1A1A` | `#F5F5F5` |
| 字體 | Inter / Geist | Inter / Geist |

---

## 貢獻

歡迎貢獻！請參閱 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解準則。

## 授權條款

本專案採用 [AGPL-3.0](./LICENSE) 授權。
