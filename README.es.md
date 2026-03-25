# ito (糸) — Colaboracion de Tareas Basada en Hilos

> Conecta a tus companeros de equipo con **hilos**, delega tareas y recupéralas automáticamente cuando estén listas.

[English](./README.md) | [한국어](./README.ko.md)

![NestJS](https://img.shields.io/badge/NestJS-11-ea2845?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-v2-ffc131?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square)
![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)

---

## El Problema

Todas las herramientas de tareas tratan la delegación como una calle de un solo sentido: asignar → hecho.

Pero el trabajo real rebota entre personas. Le pides a alguien que revise algo, esa persona necesita la opinión de otra, y eventualmente todo tiene que volver a ti. En Jira, Asana o Linear, pierdes el rastro de este flujo y terminas preguntando "¿dónde está esa tarea?" en Slack.

## La Solución: Cadenas de Hilos

ito conecta tareas con **hilos** — como una banda elástica estirada entre personas. Cuando alguien termina su parte, la tarea automáticamente **vuelve de golpe** a través de la cadena.

```
A (crear) ──hilo──▶ B ──hilo──▶ C ──hilo──▶ D
                                          │
                                     D resuelve
                                          │
                                  vuelve de golpe a C
                                  C resuelve → vuelve de golpe a B
                                  B resuelve → vuelve de golpe a A
                                  A marca como completado ✓
```

- **Conectar**: El responsable actual conecta la tarea a la siguiente persona → el estado pasa a `IN_PROGRESS`
- **Reenviar**: El enlace del responsable anterior automáticamente pasa a `FORWARDED`
- **Snap-back**: Cuando alguien resuelve su enlace, la tarea regresa a la persona anterior
- **Profundidad de cadena**: Hasta 20 niveles
- **Protección circular**: No se puede conectar a miembros activos de la cadena (los miembros resueltos sí)

---

## Características

### Sistema de Cadena de Hilos
- **Conectar / Resolver**: Delega tareas y recupéralas automáticamente mediante snap-back
- **Creación rápida de cadenas**: Escribe `nombre de tarea > @usuarioB > @usuarioC` para crear una tarea y cadena de un solo golpe
- **Visualización en grafo**: Visualiza las cadenas de hilos como un grafo de red interactivo (estilo Obsidian)

### Entrada Rápida de Tareas
Barra de entrada estilo chat en la parte inferior del espacio de trabajo:

```
Revisión frontend > @kim > @lee
```

- El separador `>` crea la tarea y la encadena simultáneamente
- `@` activa el autocompletado de usuarios
- Completamente navegable con teclado (↑↓ para seleccionar, Tab/Enter para confirmar)

### Bloqueadores
- Marca dependencias externas como **bloqueadores** explícitos (no solo comentarios)
- Tipo de bloqueador en ThreadLink: `PERSON` (por defecto) | `BLOCKER`
- Las tareas con bloqueadores activos se mueven a una sección "Bloqueado"

### Grupos (Públicos y Privados)
- **Grupos públicos**: Visibles para todos los miembros del espacio de trabajo (como canales públicos de Slack)
- **Grupos privados**: Solo por invitación, visibles únicamente para miembros
- Alterna entre Público/Privado en cualquier momento
- Invita miembros individuales o equipos completos a la vez

### SharedSpace (Colaboración entre Espacios de Trabajo)
- Crea espacios compartidos entre diferentes espacios de trabajo (diferentes equipos/empresas)
- Conecta cadenas de hilos a través de los límites de espacios de trabajo
- Cada espacio de trabajo mantiene su propia autonomía

### Integración con Slack
| Comando | Descripción |
|---------|-------------|
| `/ito create <nombre de tarea>` | Crear una tarea |
| `/ito list` | Listar mis tareas |
| `/ito connect` | Conectar hilo (próximamente) |
| `/ito resolve` | Resolver hilo (próximamente) |
| `/ito help` | Ayuda |

Las notificaciones de hilos (recibidos, snap-back, completados) se envían como mensajes directos de Slack.

### Vista de Calendario
- Cuadrícula mensual: tareas completadas (verde) y fechas de vencimiento próximas (naranja)
- Haz clic en una fecha para expandir los detalles de la tarea
- Integración OAuth con Google Calendar y Outlook Calendar

### Equipo y Colaboración en el Espacio de Trabajo
- **Roles**: OWNER / ADMIN / MEMBER / GUEST (solo lectura + solo resolver)
- **Panel del equipo**: Carga de trabajo y estadísticas de tareas por miembro
- **Configuración del espacio de trabajo**: Nombre, descripción, gestión de roles de miembros

### Notificaciones
- **Tiempo real**: Socket.IO para entrega instantánea
- **Escritorio**: Notificaciones nativas del sistema vía Tauri
- **Web**: Alternativa con la API de notificaciones del navegador
- **Slack**: Todos los tipos de notificaciones reenviados como mensajes directos (opcional)

### Internacionalización (i18n)
9 idiomas soportados — se puede cambiar en Configuración:

| Idioma | Código |
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
Claro / Oscuro / Automático (sigue la configuración del SO) — se alterna mediante un interruptor de 3 posiciones en la barra lateral.

---

## Stack Tecnológico

| Área | Tecnología |
|------|------------|
| **Backend** | NestJS 11, PostgreSQL 16, Prisma 5 |
| **Frontend** | Next.js 16 (Static Export), React 19 |
| **Escritorio** | Tauri v2 (macOS, Windows, Linux) |
| **Estado** | Zustand v5 |
| **UI** | Tailwind CSS v4, shadcn/ui v4 |
| **Tiempo real** | Socket.IO |
| **Autenticación** | JWT + Passport (Email/PW, Google, GitHub OAuth) |
| **Email** | Resend (opcional) |
| **Slack** | @slack/web-api (opcional) |
| **Grafo** | @xyflow/react + @dagrejs/dagre |
| **i18n** | next-intl |
| **Pruebas** | Jest (API E2E), Vitest + Playwright (Frontend) |
| **Monorepo** | pnpm workspaces + Turborepo |

---

## Estructura del Proyecto

```
ito/
├── apps/
│   ├── api/                          # Backend NestJS
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Esquema de base de datos
│   │   ├── src/
│   │   │   ├── auth/                 # Autenticación (JWT, OAuth)
│   │   │   ├── users/                # Perfiles de usuario, búsqueda, preferencias
│   │   │   ├── workspaces/           # CRUD de espacios de trabajo, invitaciones, configuración
│   │   │   ├── teams/                # Gestión de equipos, panel
│   │   │   ├── tasks/                # CRUD de tareas, filtros, calendario
│   │   │   ├── threads/              # Conectar/resolver/cadena de hilos (lógica principal)
│   │   │   ├── task-groups/          # Grupos públicos/privados
│   │   │   ├── notifications/        # Servicio de notificaciones
│   │   │   ├── slack/                # Integración con Slack
│   │   │   ├── calendar/             # Integración con calendario externo
│   │   │   ├── email/                # Envío de emails (Resend)
│   │   │   ├── activities/           # Registro de actividad
│   │   │   ├── files/                # Archivos adjuntos
│   │   │   ├── chat/                 # Mensajes de chat por tarea
│   │   │   ├── shared-spaces/        # Colaboración entre espacios de trabajo
│   │   │   ├── websocket/            # Gateway Socket.IO
│   │   │   └── common/               # Guards, filtros, Prisma
│   │   ├── test/                     # Pruebas E2E
│   │   └── Dockerfile                # Build Docker de producción
│   │
│   └── desktop/                      # Frontend Tauri + Next.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── (app)/            # Rutas autenticadas
│       │   │   ├── (auth)/           # Inicio de sesión / Registro / Callback OAuth
│       │   │   └── invite/           # Página de aceptación de invitación
│       │   ├── components/           # Componentes UI
│       │   ├── stores/               # Stores Zustand
│       │   ├── messages/             # Archivos de traducción i18n (9 idiomas)
│       │   └── lib/                  # Cliente API, WebSocket, utilidades
│       ├── src-tauri/                # Configuración nativa Tauri
│       └── vercel.json               # Configuración de despliegue en Vercel
│
├── packages/
│   └── shared/                       # Tipos/constantes compartidos
│
└── docker-compose.yml                # PostgreSQL para desarrollo
```

---

## Primeros Pasos

### Requisitos Previos

- Node.js 20+
- pnpm 9+
- PostgreSQL 16 (o Docker)
- Rust + Tauri CLI (solo para builds de escritorio)

### Desarrollo Local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Iniciar PostgreSQL (Docker)
docker compose up -d

# 3. Configurar variables de entorno
cp apps/api/.env.example apps/api/.env
cp apps/desktop/.env.example apps/desktop/.env.local

# 4. Ejecutar migraciones de base de datos
cd apps/api && npx prisma migrate dev

# 5. Iniciar servidores de desarrollo
pnpm dev    # API (3011) + Desktop (3010)
```

### Comandos

```bash
pnpm dev              # Todos los servidores de desarrollo
pnpm dev:api          # Solo API (puerto 3011)
pnpm dev:desktop      # Solo Desktop (puerto 3010)
pnpm build            # Build completo

# Pruebas
cd apps/api && pnpm test:e2e           # E2E del backend
cd apps/desktop && pnpm test           # Unitarias del frontend (Vitest)
cd apps/desktop && pnpm test:e2e       # E2E del frontend (Playwright)

# Herramientas
cd apps/api && npx prisma studio       # GUI de base de datos
```

---

## Variables de Entorno

Todas las integraciones externas son **opcionales**. Si una variable de entorno está vacía, la funcionalidad se desactiva automáticamente.

### `apps/api/.env`

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | ✅ |
| `JWT_SECRET` | Clave de firma JWT | ✅ |
| `JWT_REFRESH_SECRET` | Clave de firma del token de actualización | ✅ |
| `API_PORT` | Puerto de la API (por defecto: 3011) | |
| `FRONTEND_URL` | URL del frontend | |
| `GOOGLE_CLIENT_ID` | Google OAuth | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | |
| `GITHUB_CLIENT_ID` | GitHub OAuth | |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | |
| `RESEND_API_KEY` | Emails de invitación | |
| `SLACK_BOT_TOKEN` | Integración con Slack | |
| `SLACK_SIGNING_SECRET` | Verificación de solicitudes de Slack | |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google Calendar | |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google Calendar | |
| `OUTLOOK_CLIENT_ID` | Outlook Calendar | |
| `OUTLOOK_CLIENT_SECRET` | Outlook Calendar | |

### `apps/desktop/.env.local`

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_API_URL` | URL del servidor API (por defecto: `http://localhost:3011`) | ✅ |

---

## Guías de Integración

### Slack

1. https://api.slack.com/apps → **Create New App** (From Scratch)
2. **Slash Commands** → Agregar `/ito` (Request URL: `https://tu-dominio-api/slack/commands`)
3. **Event Subscriptions** → Habilitar (Request URL: `https://tu-dominio-api/slack/events`)
4. **OAuth & Permissions** → Bot Token Scopes: `commands`, `chat:write`, `users:read`, `users:read.email`
5. **Install to Workspace** → Copiar Bot Token → `SLACK_BOT_TOKEN`
6. **Basic Information** → Signing Secret → `SLACK_SIGNING_SECRET`

### Google Calendar

1. https://console.cloud.google.com → Habilitar Google Calendar API
2. **Credentials** → OAuth Client ID (Web application)
3. Redirect URI: `https://tu-dominio-api/calendar/google/callback`
4. Establecer Client ID/Secret en `.env`
5. Usuarios: Configuración → Integraciones de Calendario → "Conectar Google Calendar"

### Outlook Calendar

1. https://portal.azure.com → **App registrations** → Nuevo registro
2. Redirect URI: `https://tu-dominio-api/calendar/outlook/callback`
3. Permisos de API: `Calendars.ReadWrite`
4. Establecer Client ID/Secret en `.env`

---

## Pruebas

```bash
# Crear base de datos de prueba (solo la primera vez)
createdb ito_test

# E2E del backend
cd apps/api && pnpm test:e2e

# Unitarias/integración del frontend
cd apps/desktop && pnpm test

# E2E del frontend
cd apps/desktop && pnpm test:e2e
```

### Pruebas E2E del Backend

| Área | Cantidad | Cobertura |
|------|----------|-----------|
| Auth | 10 | Registro, inicio de sesión, renovación de token, verificaciones 401 |
| Workspaces | 10 | CRUD, invitaciones, aceptación, rol GUEST, configuración |
| Teams | 13 | CRUD, gestión de miembros, panel, filtros de tareas |
| Tasks | 12 | CRUD, filtros, endpoint de calendario, completedAt |
| Threads | 13 | Conectar, cadenas circulares, snap-back, permisos |
| Notifications | 5 | Creación automática, listado, filtro, marcar como leído |

### Pruebas del Frontend

| Herramienta | Cantidad | Cobertura |
|-------------|----------|-----------|
| Vitest | 45 | Stores Zustand (auth, task, workspace, notification), utilidades |
| Playwright | 6 | Flujos críticos de inicio de sesión/registro |

---

## Despliegue

### Arquitectura

```
┌─ Vercel ──────────────┐      ┌─ EC2 (t3.small) ──────────────┐
│  itothread.com        │ ──▶  │  Caddy (HTTPS automático)      │
│  (Next.js Static)     │      │    └─ api.itothread.com        │
└───────────────────────┘      │       └─ ito-api:3011          │
                               │  PostgreSQL 16                  │
                               └─────────────────────────────────┘
```

### Autoalojamiento con Docker

```bash
git clone https://github.com/GTKorea/ito.git
cd ito
cp apps/api/.env.example apps/api/.env
# Edita apps/api/.env con tu base de datos y secretos

docker compose -f docker-compose.prod.yml up -d
```

### Vercel (Frontend)

1. Conecta el repositorio de GitHub en Vercel
2. Directorio raíz: `apps/desktop`
3. Framework Preset: `Other` (Static Export)
4. Variables de entorno: `NEXT_PUBLIC_API_URL=https://tu-dominio-api`

---

## Diseño

Sistema de temas inspirado en Linear (Claro / Oscuro / Automático):

| Elemento | Oscuro | Claro |
|----------|--------|-------|
| Fondo | `#0A0A0A` | `#FFFFFF` |
| Superficie | `#1A1A1A` | `#F5F5F5` |
| Fuente | Inter / Geist | Inter / Geist |

---

## Contribuir

¡Las contribuciones son bienvenidas! Consulta [CONTRIBUTING.md](./CONTRIBUTING.md) para ver las pautas.

## Licencia

Este proyecto está licenciado bajo la [AGPL-3.0](./LICENSE).
