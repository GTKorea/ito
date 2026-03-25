# ito (糸) — Colaboracao de Tarefas Baseada em Fios

> Conecte colegas de equipe com **fios (threads)**, delegue tarefas e receba-as de volta automaticamente quando concluidas.

[English](./README.md) | [한국어](./README.ko.md)

![NestJS](https://img.shields.io/badge/NestJS-11-ea2845?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-v2-ffc131?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square)
![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)

---

## O Problema

Toda ferramenta de tarefas trata a delegacao como uma via de mao unica: atribuir → concluido.

Mas o trabalho real vai e volta entre pessoas. Voce pede para alguem revisar algo, essa pessoa precisa da opiniao de outra, e eventualmente tudo precisa voltar para voce. No Jira, Asana ou Linear, voce perde o controle desse fluxo e acaba perguntando "onde esta aquela tarefa?" no Slack.

## A Solucao: Cadeias de Fios

O ito conecta tarefas com **fios (threads)** — como um elastico esticado entre pessoas. Quando alguem termina sua parte, a tarefa automaticamente **retorna (snap-back)** pela cadeia.

```
A (cria) ──thread──▶ B ──thread──▶ C ──thread──▶ D
                                          │
                                     D resolve
                                          │
                                  retorna para C
                                  C resolve → retorna para B
                                  B resolve → retorna para A
                                  A marca como concluido ✓
```

- **Conectar (Connect)**: O responsavel atual conecta a tarefa a proxima pessoa → status se torna `IN_PROGRESS`
- **Encaminhar (Forward)**: O link do responsavel anterior automaticamente se torna `FORWARDED`
- **Retorno (Snap-back)**: Quando alguem resolve seu link, a tarefa retorna para a pessoa anterior
- **Profundidade da cadeia**: Ate 20 niveis
- **Protecao contra ciclos**: Nao e possivel conectar a membros ativos da cadeia (membros com status resolvido sao permitidos)

---

## Funcionalidades

### Sistema de Cadeia de Fios
- **Conectar / Resolver**: Delegue tarefas e receba-as de volta automaticamente via snap-back
- **Criacao rapida de cadeia**: Digite `nome da tarefa > @usuarioB > @usuarioC` para criar uma tarefa e cadeia de uma so vez
- **Visualizacao em grafo**: Veja cadeias de fios como um grafo de rede interativo (estilo Obsidian)

### Entrada Rapida de Tarefas
Barra de entrada estilo chat na parte inferior do workspace:

```
Revisao do frontend > @kim > @lee
```

- O separador `>` cria a tarefa e encadeia simultaneamente
- `@` aciona o autocompletar de usuarios
- Totalmente navegavel por teclado (↑↓ para selecionar, Tab/Enter para confirmar)

### Bloqueadores
- Marque dependencias externas como **bloqueadores** explicitos (nao apenas comentarios)
- Tipo de bloqueador no ThreadLink: `PERSON` (padrao) | `BLOCKER`
- Tarefas com bloqueadores ativos sao movidas para a secao "Bloqueado"

### Grupos (Publicos e Privados)
- **Grupos publicos**: Visiveis para todos os membros do workspace (como canais publicos do Slack)
- **Grupos privados**: Apenas por convite, visiveis somente para membros
- Alterne entre Publico/Privado a qualquer momento
- Convide membros individuais ou equipes inteiras de uma vez

### SharedSpace (Colaboracao Entre Workspaces)
- Crie espacos compartilhados entre diferentes workspaces (diferentes equipes/empresas)
- Conecte cadeias de fios atraves das fronteiras de workspaces
- Cada workspace mantem sua propria autonomia

### Integracao com Slack
| Comando | Descricao |
|---------|-----------|
| `/ito create <nome da tarefa>` | Criar uma tarefa |
| `/ito list` | Listar minhas tarefas |
| `/ito connect` | Conectar fio (em breve) |
| `/ito resolve` | Resolver fio (em breve) |
| `/ito help` | Ajuda |

Notificacoes de fios (recebido, retorno, concluido) sao enviadas como DMs no Slack.

### Visualizacao de Calendario
- Grade mensal: tarefas concluidas (verde) e datas de vencimento proximas (laranja)
- Clique em uma data para expandir os detalhes da tarefa
- Integracao OAuth com Google Calendar e Outlook Calendar

### Equipe e Colaboracao no Workspace
- **Funcoes**: OWNER / ADMIN / MEMBER / GUEST (somente leitura + somente resolver)
- **Painel da equipe**: Carga de trabalho por membro e estatisticas de tarefas
- **Configuracoes do workspace**: Nome, descricao, gerenciamento de funcoes dos membros

### Notificacoes
- **Tempo real**: Socket.IO para entrega instantanea
- **Desktop**: Notificacoes nativas do sistema via Tauri
- **Web**: Fallback com API de Notificacoes do navegador
- **Slack**: Todos os tipos de notificacao encaminhados como DMs (opcional)

### Internacionalizacao (i18n)
9 idiomas suportados — alteravel nas Configuracoes:

| Idioma | Codigo |
|--------|--------|
| English | `en` |
| 한국어 | `ko` |
| 日本語 | `ja` |
| 简体中文 | `zh-CN` |
| 繁體中文 | `zh-TW` |
| Español | `es` |
| Français | `fr` |
| Deutsch | `de` |
| Português | `pt` |

### Temas
Claro / Escuro / Automatico (segue a configuracao do SO) — alternado via interruptor de 3 opcoes na barra lateral.

---

## Stack Tecnologica

| Area | Tecnologia |
|------|------------|
| **Backend** | NestJS 11, PostgreSQL 16, Prisma 5 |
| **Frontend** | Next.js 16 (Static Export), React 19 |
| **Desktop** | Tauri v2 (macOS, Windows, Linux) |
| **Estado** | Zustand v5 |
| **UI** | Tailwind CSS v4, shadcn/ui v4 |
| **Tempo real** | Socket.IO |
| **Autenticacao** | JWT + Passport (Email/Senha, Google, GitHub OAuth) |
| **Email** | Resend (opcional) |
| **Slack** | @slack/web-api (opcional) |
| **Grafo** | @xyflow/react + @dagrejs/dagre |
| **i18n** | next-intl |
| **Testes** | Jest (API E2E), Vitest + Playwright (Frontend) |
| **Monorepo** | pnpm workspaces + Turborepo |

---

## Estrutura do Projeto

```
ito/
├── apps/
│   ├── api/                          # Backend NestJS
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Schema do banco de dados
│   │   ├── src/
│   │   │   ├── auth/                 # Autenticacao (JWT, OAuth)
│   │   │   ├── users/                # Perfis de usuario, busca, preferencias
│   │   │   ├── workspaces/           # CRUD de workspaces, convites, configuracoes
│   │   │   ├── teams/                # Gerenciamento de equipes, painel
│   │   │   ├── tasks/                # CRUD de tarefas, filtros, calendario
│   │   │   ├── threads/              # Conectar/resolver/cadeia de fios (logica principal)
│   │   │   ├── task-groups/          # Grupos publicos/privados
│   │   │   ├── notifications/        # Servico de notificacoes
│   │   │   ├── slack/                # Integracao com Slack
│   │   │   ├── calendar/             # Integracao com calendario externo
│   │   │   ├── email/                # Envio de email (Resend)
│   │   │   ├── activities/           # Log de atividades
│   │   │   ├── files/                # Anexos de arquivos
│   │   │   ├── chat/                 # Mensagens de chat por tarefa
│   │   │   ├── shared-spaces/        # Colaboracao entre workspaces
│   │   │   ├── websocket/            # Gateway Socket.IO
│   │   │   └── common/               # Guards, filtros, Prisma
│   │   ├── test/                     # Testes E2E
│   │   └── Dockerfile                # Build Docker para producao
│   │
│   └── desktop/                      # Frontend Tauri + Next.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── (app)/            # Rotas autenticadas
│       │   │   ├── (auth)/           # Login / Registro / Callback OAuth
│       │   │   └── invite/           # Pagina de aceitacao de convite
│       │   ├── components/           # Componentes de UI
│       │   ├── stores/               # Stores Zustand
│       │   ├── messages/             # Arquivos de traducao i18n (9 idiomas)
│       │   └── lib/                  # Cliente API, WebSocket, utilitarios
│       ├── src-tauri/                # Configuracao nativa Tauri
│       └── vercel.json               # Configuracao de deploy Vercel
│
├── packages/
│   └── shared/                       # Tipos/constantes compartilhados
│
└── docker-compose.yml                # PostgreSQL para desenvolvimento
```

---

## Primeiros Passos

### Pre-requisitos

- Node.js 20+
- pnpm 9+
- PostgreSQL 16 (ou Docker)
- Rust + Tauri CLI (apenas para builds desktop)

### Desenvolvimento Local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Iniciar PostgreSQL (Docker)
docker compose up -d

# 3. Configurar variaveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/desktop/.env.example apps/desktop/.env.local

# 4. Executar migracoes do banco de dados
cd apps/api && npx prisma migrate dev

# 5. Iniciar servidores de desenvolvimento
pnpm dev    # API (3011) + Desktop (3010)
```

### Comandos

```bash
pnpm dev              # Todos os servidores de desenvolvimento
pnpm dev:api          # Apenas API (porta 3011)
pnpm dev:desktop      # Apenas Desktop (porta 3010)
pnpm build            # Build completo

# Testes
cd apps/api && pnpm test:e2e           # E2E do backend
cd apps/desktop && pnpm test           # Unitarios do frontend (Vitest)
cd apps/desktop && pnpm test:e2e       # E2E do frontend (Playwright)

# Ferramentas
cd apps/api && npx prisma studio       # GUI do banco de dados
```

---

## Variaveis de Ambiente

Todas as integracoes externas sao **opcionais**. Se uma variavel de ambiente estiver vazia, a funcionalidade e automaticamente desativada.

### `apps/api/.env`

| Variavel | Descricao | Obrigatorio |
|----------|-----------|-------------|
| `DATABASE_URL` | String de conexao PostgreSQL | ✅ |
| `JWT_SECRET` | Chave de assinatura JWT | ✅ |
| `JWT_REFRESH_SECRET` | Chave de assinatura do refresh token | ✅ |
| `API_PORT` | Porta da API (padrao: 3011) | |
| `FRONTEND_URL` | URL do frontend | |
| `GOOGLE_CLIENT_ID` | Google OAuth | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | |
| `GITHUB_CLIENT_ID` | GitHub OAuth | |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | |
| `RESEND_API_KEY` | Emails de convite | |
| `SLACK_BOT_TOKEN` | Integracao com Slack | |
| `SLACK_SIGNING_SECRET` | Verificacao de requisicoes do Slack | |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google Calendar | |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google Calendar | |
| `OUTLOOK_CLIENT_ID` | Outlook Calendar | |
| `OUTLOOK_CLIENT_SECRET` | Outlook Calendar | |

### `apps/desktop/.env.local`

| Variavel | Descricao | Obrigatorio |
|----------|-----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL do servidor da API (padrao: `http://localhost:3011`) | ✅ |

---

## Guias de Integracao

### Slack

1. https://api.slack.com/apps → **Create New App** (From Scratch)
2. **Slash Commands** → Adicione `/ito` (Request URL: `https://seu-dominio-api/slack/commands`)
3. **Event Subscriptions** → Ative (Request URL: `https://seu-dominio-api/slack/events`)
4. **OAuth & Permissions** → Bot Token Scopes: `commands`, `chat:write`, `users:read`, `users:read.email`
5. **Install to Workspace** → Copie o Bot Token → `SLACK_BOT_TOKEN`
6. **Basic Information** → Signing Secret → `SLACK_SIGNING_SECRET`

### Google Calendar

1. https://console.cloud.google.com → Ative a Google Calendar API
2. **Credentials** → OAuth Client ID (Web application)
3. Redirect URI: `https://seu-dominio-api/calendar/google/callback`
4. Defina Client ID/Secret no `.env`
5. Usuarios: Configuracoes → Integracoes de Calendario → "Conectar Google Calendar"

### Outlook Calendar

1. https://portal.azure.com → **App registrations** → Novo registro
2. Redirect URI: `https://seu-dominio-api/calendar/outlook/callback`
3. Permissoes da API: `Calendars.ReadWrite`
4. Defina Client ID/Secret no `.env`

---

## Testes

```bash
# Criar banco de dados de teste (apenas na primeira vez)
createdb ito_test

# E2E do backend
cd apps/api && pnpm test:e2e

# Unitarios/integracao do frontend
cd apps/desktop && pnpm test

# E2E do frontend
cd apps/desktop && pnpm test:e2e
```

### Testes E2E do Backend

| Area | Quantidade | Cobertura |
|------|------------|-----------|
| Auth | 10 | Cadastro, login, refresh de token, verificacoes 401 |
| Workspaces | 10 | CRUD, convites, aceitacao, funcao GUEST, configuracoes |
| Teams | 13 | CRUD, gerenciamento de membros, painel, filtros de tarefas |
| Tasks | 12 | CRUD, filtros, endpoint de calendario, completedAt |
| Threads | 13 | Conectar, cadeias circulares, snap-back, permissoes |
| Notifications | 5 | Criacao automatica, listagem, filtro, marcar como lido |

### Testes do Frontend

| Ferramenta | Quantidade | Cobertura |
|------------|------------|-----------|
| Vitest | 45 | Stores Zustand (auth, task, workspace, notification), utilitarios |
| Playwright | 6 | Fluxos criticos de login/registro |

---

## Deploy

### Arquitetura

```
┌─ Vercel ──────────────┐      ┌─ EC2 (t3.small) ──────────────┐
│  itothread.com        │ ──▶  │  Caddy (HTTPS automatico)      │
│  (Next.js Static)     │      │    └─ api.itothread.com        │
└───────────────────────┘      │       └─ ito-api:3011          │
                               │  PostgreSQL 16                  │
                               └─────────────────────────────────┘
```

### Auto-hospedagem com Docker

```bash
git clone https://github.com/GTKorea/ito.git
cd ito
cp apps/api/.env.example apps/api/.env
# Edite apps/api/.env com seu banco de dados e segredos

docker compose -f docker-compose.prod.yml up -d
```

### Vercel (Frontend)

1. Conecte o repositorio GitHub no Vercel
2. Root Directory: `apps/desktop`
3. Framework Preset: `Other` (Static Export)
4. Variaveis de Ambiente: `NEXT_PUBLIC_API_URL=https://seu-dominio-api`

---

## Design

Sistema de temas inspirado no Linear (Claro / Escuro / Automatico):

| Elemento | Escuro | Claro |
|----------|--------|-------|
| Fundo | `#0A0A0A` | `#FFFFFF` |
| Superficie | `#1A1A1A` | `#F5F5F5` |
| Fonte | Inter / Geist | Inter / Geist |

---

## Contribuindo

Contribuicoes sao bem-vindas! Consulte [CONTRIBUTING.md](./CONTRIBUTING.md) para as diretrizes.

## Licenca

Este projeto esta licenciado sob a [AGPL-3.0](./LICENSE).
