# ito (糸) — Thread-Based Task Collaboration

> Connect teammates with **threads**, hand off tasks, and automatically get them back when done.

[한국어](./README.ko.md) | [日本語](./README.ja.md) | [简体中文](./README.zh-CN.md) | [繁體中文](./README.zh-TW.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Português](./README.pt.md)

![NestJS](https://img.shields.io/badge/NestJS-11-ea2845?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-v2-ffc131?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square)
![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)

---

## The Problem

Every task tool treats delegation as a one-way street: assign → done.

But real work bounces between people. You ask someone to review something, they need input from someone else, and eventually it all needs to come back to you. In Jira, Asana, or Linear, you lose track of this flow and end up asking "where is that task?" on Slack.

## The Solution: Thread Chains

ito connects tasks with **threads** — like a rubber band stretched between people. When someone finishes their part, the task automatically **snaps back** through the chain.

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

- **Connect**: Current assignee connects the task to the next person → status becomes `IN_PROGRESS`
- **Forward**: Previous assignee's link automatically becomes `FORWARDED`
- **Snap-back**: When someone resolves their link, the task returns to the previous person
- **Chain depth**: Up to 20 levels
- **Circular protection**: Can't connect to active chain members (resolved members are fine)

---

## Features

### Thread Chain System
- **Connect / Resolve**: Hand off tasks and get them back automatically via snap-back
- **Quick chain creation**: Type `task name > @userB > @userC` to create a task and chain in one shot
- **Graph visualization**: See thread chains as an interactive network graph (Obsidian-style)

### Quick Task Input
Chat-style input bar at the bottom of the workspace:

```
Frontend review > @kim > @lee
```

- `>` separator creates the task and chains it simultaneously
- `@` triggers user autocomplete
- Fully keyboard-navigable (↑↓ to select, Tab/Enter to confirm)

### Blockers
- Mark external dependencies as explicit **blockers** (not just comments)
- Blocker type on ThreadLink: `PERSON` (default) | `BLOCKER`
- Tasks with active blockers move to a "Blocked" section

### Groups (Public & Private)
- **Public groups**: Visible to all workspace members (like Slack public channels)
- **Private groups**: Invite-only, visible only to members
- Toggle between Public/Private at any time
- Invite individual members or entire teams at once

### SharedSpace (Cross-Workspace Collaboration)
- Create shared spaces between different workspaces (different teams/companies)
- Connect thread chains across workspace boundaries
- Each workspace maintains its own autonomy

### Slack Integration
| Command | Description |
|---------|-------------|
| `/ito create <task name>` | Create a task |
| `/ito list` | List my tasks |
| `/ito connect` | Connect thread (coming soon) |
| `/ito resolve` | Resolve thread (coming soon) |
| `/ito help` | Help |

Thread notifications (received, snap-back, completed) are sent as Slack DMs.

### Calendar View
- Monthly grid: completed tasks (green) and upcoming due dates (orange)
- Click a date to expand task details
- Google Calendar & Outlook Calendar OAuth integration

### Team & Workspace Collaboration
- **Roles**: OWNER / ADMIN / MEMBER / GUEST (read-only + resolve only)
- **Team dashboard**: Per-member workload and task statistics
- **Workspace settings**: Name, description, member role management

### Notifications
- **Real-time**: Socket.IO for instant delivery
- **Desktop**: Native system notifications via Tauri
- **Web**: Browser Notification API fallback
- **Slack**: All notification types forwarded as DMs (optional)

### Internationalization (i18n)
9 languages supported — changeable in Settings:

| Language | Code |
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

### Themes
Light / Dark / Auto (follows OS setting) — toggled via 3-way switch in the sidebar.

---

## Tech Stack

| Area | Technology |
|------|------------|
| **Backend** | NestJS 11, PostgreSQL 16, Prisma 5 |
| **Frontend** | Next.js 16 (Static Export), React 19 |
| **Desktop** | Tauri v2 (macOS, Windows, Linux) |
| **State** | Zustand v5 |
| **UI** | Tailwind CSS v4, shadcn/ui v4 |
| **Real-time** | Socket.IO |
| **Auth** | JWT + Passport (Email/PW, Google, GitHub OAuth) |
| **Email** | Resend (optional) |
| **Slack** | @slack/web-api (optional) |
| **Graph** | @xyflow/react + @dagrejs/dagre |
| **i18n** | next-intl |
| **Testing** | Jest (API E2E), Vitest + Playwright (Frontend) |
| **Monorepo** | pnpm workspaces + Turborepo |

---

## Project Structure

```
ito/
├── apps/
│   ├── api/                          # NestJS backend
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Database schema
│   │   ├── src/
│   │   │   ├── auth/                 # Authentication (JWT, OAuth)
│   │   │   ├── users/                # User profiles, search, preferences
│   │   │   ├── workspaces/           # Workspace CRUD, invitations, settings
│   │   │   ├── teams/                # Team management, dashboard
│   │   │   ├── tasks/                # Task CRUD, filters, calendar
│   │   │   ├── threads/              # Thread connect/resolve/chain (core logic)
│   │   │   ├── task-groups/          # Public/Private groups
│   │   │   ├── notifications/        # Notification service
│   │   │   ├── slack/                # Slack integration
│   │   │   ├── calendar/             # External calendar integration
│   │   │   ├── email/                # Email sending (Resend)
│   │   │   ├── activities/           # Activity log
│   │   │   ├── files/                # File attachments
│   │   │   ├── chat/                 # Per-task chat messages
│   │   │   ├── shared-spaces/        # Cross-workspace collaboration
│   │   │   ├── websocket/            # Socket.IO gateway
│   │   │   └── common/               # Guards, filters, Prisma
│   │   ├── test/                     # E2E tests
│   │   └── Dockerfile                # Production Docker build
│   │
│   └── desktop/                      # Tauri + Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── (app)/            # Authenticated routes
│       │   │   ├── (auth)/           # Login / Register / OAuth callback
│       │   │   └── invite/           # Invitation acceptance page
│       │   ├── components/           # UI components
│       │   ├── stores/               # Zustand stores
│       │   ├── messages/             # i18n translation files (9 languages)
│       │   └── lib/                  # API client, WebSocket, utils
│       ├── src-tauri/                # Tauri native config
│       └── vercel.json               # Vercel deployment config
│
├── packages/
│   └── shared/                       # Shared types/constants
│
└── docker-compose.yml                # Development PostgreSQL
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16 (or Docker)
- Rust + Tauri CLI (for desktop builds only)

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL (Docker)
docker compose up -d

# 3. Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/desktop/.env.example apps/desktop/.env.local

# 4. Run database migrations
cd apps/api && npx prisma migrate dev

# 5. Start development servers
pnpm dev    # API (3011) + Desktop (3010)
```

### Commands

```bash
pnpm dev              # All dev servers
pnpm dev:api          # API only (port 3011)
pnpm dev:desktop      # Desktop only (port 3010)
pnpm build            # Full build

# Testing
cd apps/api && pnpm test:e2e           # Backend E2E
cd apps/desktop && pnpm test           # Frontend unit (Vitest)
cd apps/desktop && pnpm test:e2e       # Frontend E2E (Playwright)

# Tools
cd apps/api && npx prisma studio       # Database GUI
```

---

## Environment Variables

All external integrations are **optional**. If an env var is empty, the feature is automatically disabled.

### `apps/api/.env`

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | JWT signing key | ✅ |
| `JWT_REFRESH_SECRET` | Refresh token signing key | ✅ |
| `API_PORT` | API port (default: 3011) | |
| `FRONTEND_URL` | Frontend URL | |
| `GOOGLE_CLIENT_ID` | Google OAuth | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | |
| `GITHUB_CLIENT_ID` | GitHub OAuth | |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | |
| `RESEND_API_KEY` | Invitation emails | |
| `SLACK_BOT_TOKEN` | Slack integration | |
| `SLACK_SIGNING_SECRET` | Slack request verification | |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google Calendar | |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google Calendar | |
| `OUTLOOK_CLIENT_ID` | Outlook Calendar | |
| `OUTLOOK_CLIENT_SECRET` | Outlook Calendar | |

### `apps/desktop/.env.local`

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | API server URL (default: `http://localhost:3011`) | ✅ |

---

## Integration Guides

### Slack

1. https://api.slack.com/apps → **Create New App** (From Scratch)
2. **Slash Commands** → Add `/ito` (Request URL: `https://your-api-domain/slack/commands`)
3. **Event Subscriptions** → Enable (Request URL: `https://your-api-domain/slack/events`)
4. **OAuth & Permissions** → Bot Token Scopes: `commands`, `chat:write`, `users:read`, `users:read.email`
5. **Install to Workspace** → Copy Bot Token → `SLACK_BOT_TOKEN`
6. **Basic Information** → Signing Secret → `SLACK_SIGNING_SECRET`

### Google Calendar

1. https://console.cloud.google.com → Enable Google Calendar API
2. **Credentials** → OAuth Client ID (Web application)
3. Redirect URI: `https://your-api-domain/calendar/google/callback`
4. Set Client ID/Secret in `.env`
5. Users: Settings → Calendar Integrations → "Connect Google Calendar"

### Outlook Calendar

1. https://portal.azure.com → **App registrations** → New registration
2. Redirect URI: `https://your-api-domain/calendar/outlook/callback`
3. API permissions: `Calendars.ReadWrite`
4. Set Client ID/Secret in `.env`

---

## Testing

```bash
# Create test database (first time only)
createdb ito_test

# Backend E2E
cd apps/api && pnpm test:e2e

# Frontend unit/integration
cd apps/desktop && pnpm test

# Frontend E2E
cd apps/desktop && pnpm test:e2e
```

### Backend E2E Tests

| Area | Count | Coverage |
|------|-------|----------|
| Auth | 10 | Sign up, login, token refresh, 401 checks |
| Workspaces | 10 | CRUD, invitations, accept, GUEST role, settings |
| Teams | 13 | CRUD, member management, dashboard, task filters |
| Tasks | 12 | CRUD, filters, calendar endpoint, completedAt |
| Threads | 13 | Connect, circular chains, snap-back, permissions |
| Notifications | 5 | Auto-creation, list, filter, mark as read |

### Frontend Tests

| Tool | Count | Coverage |
|------|-------|----------|
| Vitest | 45 | Zustand stores (auth, task, workspace, notification), utilities |
| Playwright | 6 | Login/register critical paths |

---

## Deployment

### Architecture

```
┌─ Vercel ──────────────┐      ┌─ EC2 (t3.small) ──────────────┐
│  itothread.com        │ ──▶  │  Caddy (auto HTTPS)            │
│  (Next.js Static)     │      │    └─ api.itothread.com        │
└───────────────────────┘      │       └─ ito-api:3011          │
                               │  PostgreSQL 16                  │
                               └─────────────────────────────────┘
```

### Self-Hosting with Docker

```bash
git clone https://github.com/GTKorea/ito.git
cd ito
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your database and secrets

docker compose -f docker-compose.prod.yml up -d
```

### Vercel (Frontend)

1. Connect GitHub repo on Vercel
2. Root Directory: `apps/desktop`
3. Framework Preset: `Other` (Static Export)
4. Environment Variables: `NEXT_PUBLIC_API_URL=https://your-api-domain`

---

## Design

Linear-inspired theme system (Light / Dark / Auto):

| Element | Dark | Light |
|---------|------|-------|
| Background | `#0A0A0A` | `#FFFFFF` |
| Surface | `#1A1A1A` | `#F5F5F5` |
| Font | Inter / Geist | Inter / Geist |

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the [AGPL-3.0](./LICENSE).
