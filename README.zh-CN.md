# ito (糸) — 基于线程的任务协作

> 用**线程**连接团队成员，传递任务，完成后自动返回。

[English](./README.md) | [한국어](./README.ko.md)

![NestJS](https://img.shields.io/badge/NestJS-11-ea2845?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-v2-ffc131?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square)
![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)

---

## 问题

每个任务工具都把委派当作单行道：分配 → 完成。

但实际工作在人与人之间来回流转。你让某人审核某件事，他们需要另一个人的意见，最终一切都需要回到你手中。在 Jira、Asana 或 Linear 中，你会失去对这个流程的追踪，最后不得不在 Slack 上问"那个任务到哪了？"

## 解决方案：线程链

ito 用**线程**连接任务——就像人与人之间拉起的橡皮筋。当某人完成他们的部分时，任务会自动沿着链路**弹回**。

```
A (create) ──thread──▶ B ──thread──▶ C ──thread──▶ D
                                          │
                                     D resolves
                                          │
                                  snaps back to C
                                  C resolves → snaps back to B
                                  B resolves → snaps back to A
                                  A marks as completed ✓
```

- **连接（Connect）**：当前负责人将任务连接到下一个人 → 状态变为 `IN_PROGRESS`
- **转发（Forward）**：前任负责人的链接自动变为 `FORWARDED`
- **弹回（Snap-back）**：当某人解决了他们的链接时，任务返回给前一个人
- **链深度**：最多 20 级
- **循环保护**：不能连接到活跃链成员（已完成的成员可以重新连接）

---

## 功能特性

### 线程链系统
- **连接 / 解决**：传递任务，通过弹回自动取回
- **快速链创建**：输入 `task name > @userB > @userC` 一次性创建任务和链
- **图形可视化**：以交互式网络图查看线程链（Obsidian 风格）

### 快速任务输入
工作区底部的聊天式输入栏：

```
Frontend review > @kim > @lee
```

- `>` 分隔符同时创建任务和链
- `@` 触发用户自动补全
- 完全支持键盘导航（↑↓ 选择，Tab/Enter 确认）

### 阻塞器
- 将外部依赖标记为明确的**阻塞器**（而不仅仅是评论）
- ThreadLink 上的阻塞器类型：`PERSON`（默认）| `BLOCKER`
- 有活跃阻塞器的任务会移到"已阻塞"区域

### 分组（公开与私有）
- **公开分组**：对所有工作区成员可见（类似 Slack 公开频道）
- **私有分组**：仅邀请可见，只有成员可以看到
- 随时切换公开/私有
- 邀请单个成员或一次性邀请整个团队

### 共享空间（跨工作区协作）
- 在不同工作区（不同团队/公司）之间创建共享空间
- 跨工作区边界连接线程链
- 每个工作区保持自身的自主性

### Slack 集成
| 命令 | 描述 |
|------|------|
| `/ito create <task name>` | 创建任务 |
| `/ito list` | 列出我的任务 |
| `/ito connect` | 连接线程（即将推出） |
| `/ito resolve` | 解决线程（即将推出） |
| `/ito help` | 帮助 |

线程通知（接收、弹回、完成）通过 Slack 私信发送。

### 日历视图
- 月度网格：已完成任务（绿色）和即将到期的截止日期（橙色）
- 点击日期展开任务详情
- Google Calendar 和 Outlook Calendar OAuth 集成

### 团队与工作区协作
- **角色**：OWNER / ADMIN / MEMBER / GUEST（只读 + 仅解决）
- **团队仪表盘**：每个成员的工作量和任务统计
- **工作区设置**：名称、描述、成员角色管理

### 通知
- **实时通知**：Socket.IO 即时推送
- **桌面通知**：通过 Tauri 发送原生系统通知
- **网页通知**：浏览器 Notification API 备用方案
- **Slack 通知**：所有通知类型转发为私信（可选）

### 国际化（i18n）
支持 9 种语言——可在设置中切换：

| 语言 | 代码 |
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

### 主题
亮色 / 暗色 / 自动（跟随系统设置）——通过侧边栏的三态开关切换。

---

## 技术栈

| 领域 | 技术 |
|------|------|
| **后端** | NestJS 11, PostgreSQL 16, Prisma 5 |
| **前端** | Next.js 16 (Static Export), React 19 |
| **桌面端** | Tauri v2 (macOS, Windows, Linux) |
| **状态管理** | Zustand v5 |
| **UI** | Tailwind CSS v4, shadcn/ui v4 |
| **实时通信** | Socket.IO |
| **认证** | JWT + Passport (Email/PW, Google, GitHub OAuth) |
| **邮件** | Resend（可选） |
| **Slack** | @slack/web-api（可选） |
| **图形** | @xyflow/react + @dagrejs/dagre |
| **国际化** | next-intl |
| **测试** | Jest (API E2E), Vitest + Playwright (Frontend) |
| **Monorepo** | pnpm workspaces + Turborepo |

---

## 项目结构

```
ito/
├── apps/
│   ├── api/                          # NestJS 后端
│   │   ├── prisma/
│   │   │   └── schema.prisma         # 数据库模式
│   │   ├── src/
│   │   │   ├── auth/                 # 认证 (JWT, OAuth)
│   │   │   ├── users/                # 用户资料、搜索、偏好设置
│   │   │   ├── workspaces/           # 工作区 CRUD、邀请、设置
│   │   │   ├── teams/                # 团队管理、仪表盘
│   │   │   ├── tasks/                # 任务 CRUD、筛选、日历
│   │   │   ├── threads/              # 线程连接/解决/链（核心逻辑）
│   │   │   ├── task-groups/          # 公开/私有分组
│   │   │   ├── notifications/        # 通知服务
│   │   │   ├── slack/                # Slack 集成
│   │   │   ├── calendar/             # 外部日历集成
│   │   │   ├── email/                # 邮件发送 (Resend)
│   │   │   ├── activities/           # 活动日志
│   │   │   ├── files/                # 文件附件
│   │   │   ├── chat/                 # 任务内聊天消息
│   │   │   ├── shared-spaces/        # 跨工作区协作
│   │   │   ├── websocket/            # Socket.IO 网关
│   │   │   └── common/               # 守卫、过滤器、Prisma
│   │   ├── test/                     # E2E 测试
│   │   └── Dockerfile                # 生产环境 Docker 构建
│   │
│   └── desktop/                      # Tauri + Next.js 前端
│       ├── src/
│       │   ├── app/
│       │   │   ├── (app)/            # 需认证路由
│       │   │   ├── (auth)/           # 登录 / 注册 / OAuth 回调
│       │   │   └── invite/           # 邀请接受页面
│       │   ├── components/           # UI 组件
│       │   ├── stores/               # Zustand 状态管理
│       │   ├── messages/             # i18n 翻译文件（9 种语言）
│       │   └── lib/                  # API 客户端、WebSocket、工具函数
│       ├── src-tauri/                # Tauri 原生配置
│       └── vercel.json               # Vercel 部署配置
│
├── packages/
│   └── shared/                       # 共享类型/常量
│
└── docker-compose.yml                # 开发环境 PostgreSQL
```

---

## 快速开始

### 前置条件

- Node.js 20+
- pnpm 9+
- PostgreSQL 16（或 Docker）
- Rust + Tauri CLI（仅桌面端构建需要）

### 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 启动 PostgreSQL (Docker)
docker compose up -d

# 3. 设置环境变量
cp apps/api/.env.example apps/api/.env
cp apps/desktop/.env.example apps/desktop/.env.local

# 4. 运行数据库迁移
cd apps/api && npx prisma migrate dev

# 5. 启动开发服务器
pnpm dev    # API (3011) + Desktop (3010)
```

### 命令

```bash
pnpm dev              # 所有开发服务器
pnpm dev:api          # 仅 API（端口 3011）
pnpm dev:desktop      # 仅桌面端（端口 3010）
pnpm build            # 完整构建

# 测试
cd apps/api && pnpm test:e2e           # 后端 E2E
cd apps/desktop && pnpm test           # 前端单元测试 (Vitest)
cd apps/desktop && pnpm test:e2e       # 前端 E2E (Playwright)

# 工具
cd apps/api && npx prisma studio       # 数据库 GUI
```

---

## 环境变量

所有外部集成均为**可选**。如果环境变量为空，相关功能将自动禁用。

### `apps/api/.env`

| 变量 | 描述 | 必填 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | ✅ |
| `JWT_SECRET` | JWT 签名密钥 | ✅ |
| `JWT_REFRESH_SECRET` | Refresh Token 签名密钥 | ✅ |
| `API_PORT` | API 端口（默认：3011） | |
| `FRONTEND_URL` | 前端 URL | |
| `GOOGLE_CLIENT_ID` | Google OAuth | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | |
| `GITHUB_CLIENT_ID` | GitHub OAuth | |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | |
| `RESEND_API_KEY` | 邀请邮件 | |
| `SLACK_BOT_TOKEN` | Slack 集成 | |
| `SLACK_SIGNING_SECRET` | Slack 请求验证 | |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google Calendar | |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google Calendar | |
| `OUTLOOK_CLIENT_ID` | Outlook Calendar | |
| `OUTLOOK_CLIENT_SECRET` | Outlook Calendar | |

### `apps/desktop/.env.local`

| 变量 | 描述 | 必填 |
|------|------|------|
| `NEXT_PUBLIC_API_URL` | API 服务器 URL（默认：`http://localhost:3011`） | ✅ |

---

## 集成指南

### Slack

1. https://api.slack.com/apps → **Create New App**（从头创建）
2. **Slash Commands** → 添加 `/ito`（Request URL：`https://your-api-domain/slack/commands`）
3. **Event Subscriptions** → 启用（Request URL：`https://your-api-domain/slack/events`）
4. **OAuth & Permissions** → Bot Token Scopes：`commands`、`chat:write`、`users:read`、`users:read.email`
5. **Install to Workspace** → 复制 Bot Token → `SLACK_BOT_TOKEN`
6. **Basic Information** → Signing Secret → `SLACK_SIGNING_SECRET`

### Google Calendar

1. https://console.cloud.google.com → 启用 Google Calendar API
2. **Credentials** → OAuth Client ID（Web application）
3. Redirect URI：`https://your-api-domain/calendar/google/callback`
4. 在 `.env` 中设置 Client ID/Secret
5. 用户：设置 → 日历集成 → "连接 Google Calendar"

### Outlook Calendar

1. https://portal.azure.com → **App registrations** → 新建注册
2. Redirect URI：`https://your-api-domain/calendar/outlook/callback`
3. API 权限：`Calendars.ReadWrite`
4. 在 `.env` 中设置 Client ID/Secret

---

## 测试

```bash
# 创建测试数据库（仅首次需要）
createdb ito_test

# 后端 E2E
cd apps/api && pnpm test:e2e

# 前端单元/集成测试
cd apps/desktop && pnpm test

# 前端 E2E
cd apps/desktop && pnpm test:e2e
```

### 后端 E2E 测试

| 领域 | 数量 | 覆盖范围 |
|------|------|----------|
| 认证 | 10 | 注册、登录、令牌刷新、401 检查 |
| 工作区 | 10 | CRUD、邀请、接受、GUEST 角色、设置 |
| 团队 | 13 | CRUD、成员管理、仪表盘、任务筛选 |
| 任务 | 12 | CRUD、筛选、日历端点、completedAt |
| 线程 | 13 | 连接、循环链、弹回、权限 |
| 通知 | 5 | 自动创建、列表、筛选、标记已读 |

### 前端测试

| 工具 | 数量 | 覆盖范围 |
|------|------|----------|
| Vitest | 45 | Zustand stores（auth、task、workspace、notification）、工具函数 |
| Playwright | 6 | 登录/注册关键路径 |

---

## 部署

### 架构

```
┌─ Vercel ──────────────┐      ┌─ EC2 (t3.small) ──────────────┐
│  itothread.com        │ ──▶  │  Caddy (auto HTTPS)            │
│  (Next.js Static)     │      │    └─ api.itothread.com        │
└───────────────────────┘      │       └─ ito-api:3011          │
                               │  PostgreSQL 16                  │
                               └─────────────────────────────────┘
```

### 使用 Docker 自托管

```bash
git clone https://github.com/GTKorea/ito.git
cd ito
cp apps/api/.env.example apps/api/.env
# 编辑 apps/api/.env，填入你的数据库和密钥信息

docker compose -f docker-compose.prod.yml up -d
```

### Vercel（前端）

1. 在 Vercel 上连接 GitHub 仓库
2. Root Directory：`apps/desktop`
3. Framework Preset：`Other`（Static Export）
4. 环境变量：`NEXT_PUBLIC_API_URL=https://your-api-domain`

---

## 设计

Linear 风格的主题系统（亮色 / 暗色 / 自动）：

| 元素 | 暗色 | 亮色 |
|------|------|------|
| 背景 | `#0A0A0A` | `#FFFFFF` |
| 表面 | `#1A1A1A` | `#F5F5F5` |
| 字体 | Inter / Geist | Inter / Geist |

---

## 贡献

欢迎贡献！请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解指南。

## 许可证

本项目采用 [AGPL-3.0](./LICENSE) 许可证。
