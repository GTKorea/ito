# ito (糸) — スレッドベースのタスクコラボレーション

> **スレッド**でチームメンバーをつなぎ、タスクを引き渡し、完了時に自動で戻ってくる。

[English](./README.md) | [한국어](./README.ko.md)

![NestJS](https://img.shields.io/badge/NestJS-11-ea2845?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-v2-ffc131?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square)
![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)

---

## 課題

あらゆるタスクツールは、委任を一方通行として扱います：割り当て → 完了。

しかし、実際の業務は人の間を行き来します。誰かにレビューを依頼し、その人が別の人の意見を必要とし、最終的にはすべてがあなたのもとに戻ってくる必要があります。Jira、Asana、Linearではこのフローを見失い、Slackで「あのタスクどうなった？」と聞く羽目になります。

## 解決策：スレッドチェーン

itoはタスクを**スレッド**でつなぎます — 人と人の間に張られたゴムバンドのようなものです。誰かが自分の担当部分を完了すると、タスクは自動的にチェーンを通じて**スナップバック**します。

```
A (作成) ──thread──▶ B ──thread──▶ C ──thread──▶ D
                                          │
                                     D が解決
                                          │
                                  C にスナップバック
                                  C が解決 → B にスナップバック
                                  B が解決 → A にスナップバック
                                  A が完了マーク ✓
```

- **Connect（接続）**: 現在の担当者がタスクを次の人に接続 → ステータスが `IN_PROGRESS` に
- **Forward（転送）**: 前の担当者のリンクが自動的に `FORWARDED` に
- **Snap-back（スナップバック）**: 誰かがリンクを解決すると、タスクが前の人に戻る
- **チェーン深度**: 最大20段階
- **循環防止**: アクティブなチェーンメンバーには接続不可（解決済みメンバーへは可）

---

## 機能

### スレッドチェーンシステム
- **Connect / Resolve**: タスクを引き渡し、スナップバックで自動的に戻ってくる
- **クイックチェーン作成**: `タスク名 > @ユーザーB > @ユーザーC` と入力するだけでタスクとチェーンを一括作成
- **グラフ可視化**: スレッドチェーンをインタラクティブなネットワークグラフで表示（Obsidian風）

### クイックタスク入力
ワークスペース下部のチャット風入力バー：

```
Frontend review > @kim > @lee
```

- `>` セパレーターでタスク作成とチェーン接続を同時実行
- `@` でユーザーオートコンプリートを起動
- キーボードで完全操作可能（↑↓で選択、Tab/Enterで確定）

### ブロッカー
- 外部依存関係を明示的な**ブロッカー**としてマーク（単なるコメントではなく）
- ThreadLinkのブロッカータイプ: `PERSON`（デフォルト） | `BLOCKER`
- アクティブなブロッカーがあるタスクは「ブロック中」セクションに移動

### グループ（パブリック＆プライベート）
- **パブリックグループ**: ワークスペース全メンバーに表示（Slackのパブリックチャンネルと同様）
- **プライベートグループ**: 招待制、メンバーのみ表示
- パブリック/プライベートはいつでも切り替え可能
- 個別メンバーまたはチーム単位での一括招待

### SharedSpace（ワークスペース間コラボレーション）
- 異なるワークスペース間（異なるチーム/企業間）で共有スペースを作成
- ワークスペースの境界を超えたスレッドチェーンの接続
- 各ワークスペースの自律性を維持

### Slack連携
| コマンド | 説明 |
|---------|------|
| `/ito create <タスク名>` | タスクを作成 |
| `/ito list` | 自分のタスク一覧 |
| `/ito connect` | スレッド接続（近日公開） |
| `/ito resolve` | スレッド解決（近日公開） |
| `/ito help` | ヘルプ |

スレッド通知（受信、スナップバック、完了）はSlack DMとして送信されます。

### カレンダービュー
- 月間グリッド：完了タスク（緑）と期日が近いタスク（オレンジ）
- 日付クリックでタスク詳細を展開
- Googleカレンダー＆Outlookカレンダー OAuth連携

### チーム＆ワークスペースコラボレーション
- **ロール**: OWNER / ADMIN / MEMBER / GUEST（読み取り専用＋解決のみ）
- **チームダッシュボード**: メンバー別ワークロードとタスク統計
- **ワークスペース設定**: 名前、説明、メンバーロール管理

### 通知
- **リアルタイム**: Socket.IOによる即時配信
- **デスクトップ**: Tauriによるネイティブシステム通知
- **Web**: ブラウザ Notification APIフォールバック
- **Slack**: 全通知タイプをDMとして転送（オプション）

### 国際化（i18n）
9言語対応 — 設定画面で変更可能：

| 言語 | コード |
|------|--------|
| English | `en` |
| 한국어 | `ko` |
| 日本語 | `ja` |
| 简体中文 | `zh-CN` |
| 繁體中文 | `zh-TW` |
| Español | `es` |
| Français | `fr` |
| Deutsch | `de` |
| Português | `pt` |

### テーマ
ライト / ダーク / 自動（OS設定に連動） — サイドバーの3段階スイッチで切り替え。

---

## 技術スタック

| 領域 | 技術 |
|------|------|
| **バックエンド** | NestJS 11, PostgreSQL 16, Prisma 5 |
| **フロントエンド** | Next.js 16 (Static Export), React 19 |
| **デスクトップ** | Tauri v2 (macOS, Windows, Linux) |
| **状態管理** | Zustand v5 |
| **UI** | Tailwind CSS v4, shadcn/ui v4 |
| **リアルタイム** | Socket.IO |
| **認証** | JWT + Passport (メール/パスワード, Google, GitHub OAuth) |
| **メール** | Resend（オプション） |
| **Slack** | @slack/web-api（オプション） |
| **グラフ** | @xyflow/react + @dagrejs/dagre |
| **i18n** | next-intl |
| **テスト** | Jest (API E2E), Vitest + Playwright (フロントエンド) |
| **モノレポ** | pnpm workspaces + Turborepo |

---

## プロジェクト構成

```
ito/
├── apps/
│   ├── api/                          # NestJS バックエンド
│   │   ├── prisma/
│   │   │   └── schema.prisma         # データベーススキーマ
│   │   ├── src/
│   │   │   ├── auth/                 # 認証 (JWT, OAuth)
│   │   │   ├── users/                # ユーザープロフィール、検索、設定
│   │   │   ├── workspaces/           # ワークスペース CRUD、招待、設定
│   │   │   ├── teams/                # チーム管理、ダッシュボード
│   │   │   ├── tasks/                # タスク CRUD、フィルター、カレンダー
│   │   │   ├── threads/              # スレッド connect/resolve/chain（コアロジック）
│   │   │   ├── task-groups/          # パブリック/プライベートグループ
│   │   │   ├── notifications/        # 通知サービス
│   │   │   ├── slack/                # Slack連携
│   │   │   ├── calendar/             # 外部カレンダー連携
│   │   │   ├── email/                # メール送信 (Resend)
│   │   │   ├── activities/           # アクティビティログ
│   │   │   ├── files/                # ファイル添付
│   │   │   ├── chat/                 # タスク別チャットメッセージ
│   │   │   ├── shared-spaces/        # ワークスペース間コラボレーション
│   │   │   ├── websocket/            # Socket.IO ゲートウェイ
│   │   │   └── common/               # ガード、フィルター、Prisma
│   │   ├── test/                     # E2Eテスト
│   │   └── Dockerfile                # 本番用Dockerビルド
│   │
│   └── desktop/                      # Tauri + Next.js フロントエンド
│       ├── src/
│       │   ├── app/
│       │   │   ├── (app)/            # 認証済みルート
│       │   │   ├── (auth)/           # ログイン / 登録 / OAuthコールバック
│       │   │   └── invite/           # 招待承認ページ
│       │   ├── components/           # UIコンポーネント
│       │   ├── stores/               # Zustand ストア
│       │   ├── messages/             # i18n翻訳ファイル（9言語）
│       │   └── lib/                  # APIクライアント、WebSocket、ユーティリティ
│       ├── src-tauri/                # Tauriネイティブ設定
│       └── vercel.json               # Vercelデプロイ設定
│
├── packages/
│   └── shared/                       # 共有型/定数
│
└── docker-compose.yml                # 開発用PostgreSQL
```

---

## はじめに

### 前提条件

- Node.js 20+
- pnpm 9+
- PostgreSQL 16（またはDocker）
- Rust + Tauri CLI（デスクトップビルドのみ）

### ローカル開発

```bash
# 1. 依存関係のインストール
pnpm install

# 2. PostgreSQLの起動（Docker）
docker compose up -d

# 3. 環境変数の設定
cp apps/api/.env.example apps/api/.env
cp apps/desktop/.env.example apps/desktop/.env.local

# 4. データベースマイグレーションの実行
cd apps/api && npx prisma migrate dev

# 5. 開発サーバーの起動
pnpm dev    # API (3011) + Desktop (3010)
```

### コマンド

```bash
pnpm dev              # 全開発サーバー
pnpm dev:api          # APIのみ（ポート3011）
pnpm dev:desktop      # デスクトップのみ（ポート3010）
pnpm build            # フルビルド

# テスト
cd apps/api && pnpm test:e2e           # バックエンド E2E
cd apps/desktop && pnpm test           # フロントエンド ユニット (Vitest)
cd apps/desktop && pnpm test:e2e       # フロントエンド E2E (Playwright)

# ツール
cd apps/api && npx prisma studio       # データベース GUI
```

---

## 環境変数

すべての外部連携は**オプション**です。環境変数が空の場合、該当機能は自動的に無効化されます。

### `apps/api/.env`

| 変数 | 説明 | 必須 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL接続文字列 | ✅ |
| `JWT_SECRET` | JWT署名キー | ✅ |
| `JWT_REFRESH_SECRET` | リフレッシュトークン署名キー | ✅ |
| `API_PORT` | APIポート（デフォルト: 3011） | |
| `FRONTEND_URL` | フロントエンドURL | |
| `GOOGLE_CLIENT_ID` | Google OAuth | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | |
| `GITHUB_CLIENT_ID` | GitHub OAuth | |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | |
| `RESEND_API_KEY` | 招待メール | |
| `SLACK_BOT_TOKEN` | Slack連携 | |
| `SLACK_SIGNING_SECRET` | Slackリクエスト検証 | |
| `GOOGLE_CALENDAR_CLIENT_ID` | Googleカレンダー | |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Googleカレンダー | |
| `OUTLOOK_CLIENT_ID` | Outlookカレンダー | |
| `OUTLOOK_CLIENT_SECRET` | Outlookカレンダー | |

### `apps/desktop/.env.local`

| 変数 | 説明 | 必須 |
|------|------|------|
| `NEXT_PUBLIC_API_URL` | APIサーバーURL（デフォルト: `http://localhost:3011`） | ✅ |

---

## 連携ガイド

### Slack

1. https://api.slack.com/apps → **Create New App**（From Scratch）
2. **Slash Commands** → `/ito` を追加（Request URL: `https://your-api-domain/slack/commands`）
3. **Event Subscriptions** → 有効化（Request URL: `https://your-api-domain/slack/events`）
4. **OAuth & Permissions** → Bot Token Scopes: `commands`, `chat:write`, `users:read`, `users:read.email`
5. **Install to Workspace** → Bot Tokenをコピー → `SLACK_BOT_TOKEN`
6. **Basic Information** → Signing Secret → `SLACK_SIGNING_SECRET`

### Googleカレンダー

1. https://console.cloud.google.com → Google Calendar APIを有効化
2. **Credentials** → OAuth Client ID（Webアプリケーション）
3. リダイレクトURI: `https://your-api-domain/calendar/google/callback`
4. Client ID/Secretを `.env` に設定
5. ユーザー側: 設定 → カレンダー連携 → 「Googleカレンダーを接続」

### Outlookカレンダー

1. https://portal.azure.com → **App registrations** → 新規登録
2. リダイレクトURI: `https://your-api-domain/calendar/outlook/callback`
3. API権限: `Calendars.ReadWrite`
4. Client ID/Secretを `.env` に設定

---

## テスト

```bash
# テストデータベースの作成（初回のみ）
createdb ito_test

# バックエンド E2E
cd apps/api && pnpm test:e2e

# フロントエンド ユニット/統合テスト
cd apps/desktop && pnpm test

# フロントエンド E2E
cd apps/desktop && pnpm test:e2e
```

### バックエンド E2Eテスト

| 領域 | 件数 | カバレッジ |
|------|------|-----------|
| Auth | 10 | サインアップ、ログイン、トークンリフレッシュ、401チェック |
| Workspaces | 10 | CRUD、招待、承認、GUESTロール、設定 |
| Teams | 13 | CRUD、メンバー管理、ダッシュボード、タスクフィルター |
| Tasks | 12 | CRUD、フィルター、カレンダーエンドポイント、completedAt |
| Threads | 13 | 接続、循環チェーン、スナップバック、権限 |
| Notifications | 5 | 自動作成、一覧、フィルター、既読マーク |

### フロントエンドテスト

| ツール | 件数 | カバレッジ |
|--------|------|-----------|
| Vitest | 45 | Zustandストア（auth、task、workspace、notification）、ユーティリティ |
| Playwright | 6 | ログイン/登録のクリティカルパス |

---

## デプロイ

### アーキテクチャ

```
┌─ Vercel ──────────────┐      ┌─ EC2 (t3.small) ──────────────┐
│  itothread.com        │ ──▶  │  Caddy (自動HTTPS)             │
│  (Next.js Static)     │      │    └─ api.itothread.com        │
└───────────────────────┘      │       └─ ito-api:3011          │
                               │  PostgreSQL 16                  │
                               └─────────────────────────────────┘
```

### Dockerによるセルフホスティング

```bash
git clone https://github.com/GTKorea/ito.git
cd ito
cp apps/api/.env.example apps/api/.env
# apps/api/.env をデータベースとシークレットで編集

docker compose -f docker-compose.prod.yml up -d
```

### Vercel（フロントエンド）

1. VercelでGitHubリポジトリを接続
2. Root Directory: `apps/desktop`
3. Framework Preset: `Other`（Static Export）
4. 環境変数: `NEXT_PUBLIC_API_URL=https://your-api-domain`

---

## デザイン

Linearにインスパイアされたテーマシステム（ライト / ダーク / 自動）：

| 要素 | ダーク | ライト |
|------|--------|--------|
| 背景 | `#0A0A0A` | `#FFFFFF` |
| サーフェス | `#1A1A1A` | `#F5F5F5` |
| フォント | Inter / Geist | Inter / Geist |

---

## コントリビューション

コントリビューションを歓迎します！ガイドラインは [CONTRIBUTING.md](./CONTRIBUTING.md) をご覧ください。

## ライセンス

このプロジェクトは [AGPL-3.0](./LICENSE) ライセンスの下で公開されています。
