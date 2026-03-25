# ito (糸) — Fadenbasierte Aufgaben-Zusammenarbeit

> Verbinde Teammitglieder mit **Fäden (Threads)**, übergib Aufgaben und erhalte sie automatisch zurück, wenn sie erledigt sind.

[English](./README.md) | [한국어](./README.ko.md)

![NestJS](https://img.shields.io/badge/NestJS-11-ea2845?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-v2-ffc131?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square)
![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)

---

## Das Problem

Jedes Aufgaben-Tool behandelt Delegation als Einbahnstraße: zuweisen → erledigt.

Aber echte Arbeit springt zwischen Personen hin und her. Du bittest jemanden um eine Überprüfung, diese Person braucht Input von jemand anderem, und am Ende muss alles wieder zu dir zurückkommen. In Jira, Asana oder Linear verliert man den Überblick über diesen Ablauf und fragt am Ende auf Slack: „Wo ist diese Aufgabe?"

## Die Lösung: Fadenketten (Thread Chains)

ito verbindet Aufgaben mit **Fäden** — wie ein Gummiband, das zwischen Personen gespannt wird. Wenn jemand seinen Teil erledigt, **springt die Aufgabe automatisch zurück** (Snap-back) durch die Kette.

```
A (erstellt) ──Faden──▶ B ──Faden──▶ C ──Faden──▶ D
                                          │
                                     D löst auf
                                          │
                                  springt zurück zu C
                                  C löst auf → springt zurück zu B
                                  B löst auf → springt zurück zu A
                                  A markiert als erledigt ✓
```

- **Verbinden (Connect)**: Der aktuelle Bearbeiter verbindet die Aufgabe mit der nächsten Person → Status wird `IN_PROGRESS`
- **Weiterleiten (Forward)**: Die Verknüpfung des vorherigen Bearbeiters wird automatisch zu `FORWARDED`
- **Snap-back**: Wenn jemand seine Verknüpfung auflöst, kehrt die Aufgabe zur vorherigen Person zurück
- **Kettentiefe**: Bis zu 20 Ebenen
- **Zirkulärschutz**: Verbindung zu aktiven Kettengliedern nicht möglich (aufgelöste Mitglieder sind erlaubt)

---

## Funktionen

### Fadenketten-System
- **Verbinden / Auflösen**: Aufgaben übergeben und automatisch per Snap-back zurückerhalten
- **Schnelle Kettenerstellung**: Tippe `Aufgabenname > @benutzerB > @benutzerC` ein, um eine Aufgabe und Kette in einem Schritt zu erstellen
- **Graphvisualisierung**: Fadenketten als interaktives Netzwerkdiagramm anzeigen (im Obsidian-Stil)

### Schnelle Aufgabeneingabe
Chat-ähnliche Eingabeleiste am unteren Rand des Arbeitsbereichs:

```
Frontend Review > @kim > @lee
```

- `>` als Trennzeichen erstellt die Aufgabe und die Kette gleichzeitig
- `@` löst die Benutzervervollständigung aus
- Vollständig per Tastatur bedienbar (↑↓ zum Auswählen, Tab/Enter zum Bestätigen)

### Blocker
- Externe Abhängigkeiten als explizite **Blocker** markieren (nicht nur als Kommentare)
- Blocker-Typ auf ThreadLink: `PERSON` (Standard) | `BLOCKER`
- Aufgaben mit aktiven Blockern werden in den Bereich „Blockiert" verschoben

### Gruppen (Öffentlich & Privat)
- **Öffentliche Gruppen**: Für alle Workspace-Mitglieder sichtbar (wie öffentliche Slack-Kanäle)
- **Private Gruppen**: Nur auf Einladung, nur für Mitglieder sichtbar
- Jederzeit zwischen Öffentlich/Privat umschaltbar
- Einzelne Mitglieder oder ganze Teams auf einmal einladen

### SharedSpace (Workspace-übergreifende Zusammenarbeit)
- Gemeinsame Räume zwischen verschiedenen Workspaces erstellen (verschiedene Teams/Unternehmen)
- Fadenketten über Workspace-Grenzen hinweg verbinden
- Jeder Workspace behält seine eigene Autonomie

### Slack-Integration
| Befehl | Beschreibung |
|--------|--------------|
| `/ito create <Aufgabenname>` | Aufgabe erstellen |
| `/ito list` | Meine Aufgaben auflisten |
| `/ito connect` | Faden verbinden (in Kürze verfügbar) |
| `/ito resolve` | Faden auflösen (in Kürze verfügbar) |
| `/ito help` | Hilfe |

Thread-Benachrichtigungen (empfangen, Snap-back, abgeschlossen) werden als Slack-Direktnachrichten gesendet.

### Kalenderansicht
- Monatsraster: Erledigte Aufgaben (grün) und anstehende Fälligkeitsdaten (orange)
- Auf ein Datum klicken, um Aufgabendetails aufzuklappen
- Google Calendar & Outlook Calendar OAuth-Integration

### Team- & Workspace-Zusammenarbeit
- **Rollen**: OWNER / ADMIN / MEMBER / GUEST (nur lesen + nur auflösen)
- **Team-Dashboard**: Arbeitsbelastung und Aufgabenstatistiken pro Mitglied
- **Workspace-Einstellungen**: Name, Beschreibung, Mitgliederrollen-Verwaltung

### Benachrichtigungen
- **Echtzeit**: Socket.IO für sofortige Zustellung
- **Desktop**: Native Systembenachrichtigungen über Tauri
- **Web**: Browser Notification API als Fallback
- **Slack**: Alle Benachrichtigungstypen als Direktnachrichten weitergeleitet (optional)

### Internationalisierung (i18n)
9 Sprachen unterstützt — in den Einstellungen änderbar:

| Sprache | Code |
|---------|------|
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
Hell / Dunkel / Automatisch (folgt der Betriebssystem-Einstellung) — umschaltbar über einen 3-Wege-Schalter in der Seitenleiste.

---

## Technologie-Stack

| Bereich | Technologie |
|---------|-------------|
| **Backend** | NestJS 11, PostgreSQL 16, Prisma 5 |
| **Frontend** | Next.js 16 (Static Export), React 19 |
| **Desktop** | Tauri v2 (macOS, Windows, Linux) |
| **State** | Zustand v5 |
| **UI** | Tailwind CSS v4, shadcn/ui v4 |
| **Echtzeit** | Socket.IO |
| **Authentifizierung** | JWT + Passport (E-Mail/Passwort, Google, GitHub OAuth) |
| **E-Mail** | Resend (optional) |
| **Slack** | @slack/web-api (optional) |
| **Graph** | @xyflow/react + @dagrejs/dagre |
| **i18n** | next-intl |
| **Tests** | Jest (API E2E), Vitest + Playwright (Frontend) |
| **Monorepo** | pnpm workspaces + Turborepo |

---

## Projektstruktur

```
ito/
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Datenbankschema
│   │   ├── src/
│   │   │   ├── auth/                 # Authentifizierung (JWT, OAuth)
│   │   │   ├── users/                # Benutzerprofile, Suche, Einstellungen
│   │   │   ├── workspaces/           # Workspace CRUD, Einladungen, Einstellungen
│   │   │   ├── teams/                # Teamverwaltung, Dashboard
│   │   │   ├── tasks/                # Aufgaben CRUD, Filter, Kalender
│   │   │   ├── threads/              # Faden verbinden/auflösen/Kette (Kernlogik)
│   │   │   ├── task-groups/          # Öffentliche/Private Gruppen
│   │   │   ├── notifications/        # Benachrichtigungsdienst
│   │   │   ├── slack/                # Slack-Integration
│   │   │   ├── calendar/             # Externe Kalender-Integration
│   │   │   ├── email/                # E-Mail-Versand (Resend)
│   │   │   ├── activities/           # Aktivitätsprotokoll
│   │   │   ├── files/                # Dateianhänge
│   │   │   ├── chat/                 # Aufgabenbezogene Chat-Nachrichten
│   │   │   ├── shared-spaces/        # Workspace-übergreifende Zusammenarbeit
│   │   │   ├── websocket/            # Socket.IO Gateway
│   │   │   └── common/               # Guards, Filter, Prisma
│   │   ├── test/                     # E2E-Tests
│   │   └── Dockerfile                # Produktions-Docker-Build
│   │
│   └── desktop/                      # Tauri + Next.js Frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── (app)/            # Authentifizierte Routen
│       │   │   ├── (auth)/           # Anmeldung / Registrierung / OAuth-Callback
│       │   │   └── invite/           # Einladungsannahme-Seite
│       │   ├── components/           # UI-Komponenten
│       │   ├── stores/               # Zustand Stores
│       │   ├── messages/             # i18n-Übersetzungsdateien (9 Sprachen)
│       │   └── lib/                  # API-Client, WebSocket, Hilfsfunktionen
│       ├── src-tauri/                # Tauri Native-Konfiguration
│       └── vercel.json               # Vercel-Bereitstellungskonfiguration
│
├── packages/
│   └── shared/                       # Gemeinsame Typen/Konstanten
│
└── docker-compose.yml                # Entwicklungs-PostgreSQL
```

---

## Erste Schritte

### Voraussetzungen

- Node.js 20+
- pnpm 9+
- PostgreSQL 16 (oder Docker)
- Rust + Tauri CLI (nur für Desktop-Builds)

### Lokale Entwicklung

```bash
# 1. Abhängigkeiten installieren
pnpm install

# 2. PostgreSQL starten (Docker)
docker compose up -d

# 3. Umgebungsvariablen einrichten
cp apps/api/.env.example apps/api/.env
cp apps/desktop/.env.example apps/desktop/.env.local

# 4. Datenbankmigrationen ausführen
cd apps/api && npx prisma migrate dev

# 5. Entwicklungsserver starten
pnpm dev    # API (3011) + Desktop (3010)
```

### Befehle

```bash
pnpm dev              # Alle Entwicklungsserver
pnpm dev:api          # Nur API (Port 3011)
pnpm dev:desktop      # Nur Desktop (Port 3010)
pnpm build            # Vollständiger Build

# Tests
cd apps/api && pnpm test:e2e           # Backend E2E
cd apps/desktop && pnpm test           # Frontend Unit (Vitest)
cd apps/desktop && pnpm test:e2e       # Frontend E2E (Playwright)

# Werkzeuge
cd apps/api && npx prisma studio       # Datenbank-GUI
```

---

## Umgebungsvariablen

Alle externen Integrationen sind **optional**. Wenn eine Umgebungsvariable leer ist, wird die Funktion automatisch deaktiviert.

### `apps/api/.env`

| Variable | Beschreibung | Erforderlich |
|----------|--------------|--------------|
| `DATABASE_URL` | PostgreSQL-Verbindungszeichenfolge | ✅ |
| `JWT_SECRET` | JWT-Signaturschlüssel | ✅ |
| `JWT_REFRESH_SECRET` | Refresh-Token-Signaturschlüssel | ✅ |
| `API_PORT` | API-Port (Standard: 3011) | |
| `FRONTEND_URL` | Frontend-URL | |
| `GOOGLE_CLIENT_ID` | Google OAuth | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | |
| `GITHUB_CLIENT_ID` | GitHub OAuth | |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | |
| `RESEND_API_KEY` | Einladungs-E-Mails | |
| `SLACK_BOT_TOKEN` | Slack-Integration | |
| `SLACK_SIGNING_SECRET` | Slack-Anfrage-Verifizierung | |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google Calendar | |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google Calendar | |
| `OUTLOOK_CLIENT_ID` | Outlook Calendar | |
| `OUTLOOK_CLIENT_SECRET` | Outlook Calendar | |

### `apps/desktop/.env.local`

| Variable | Beschreibung | Erforderlich |
|----------|--------------|--------------|
| `NEXT_PUBLIC_API_URL` | API-Server-URL (Standard: `http://localhost:3011`) | ✅ |

---

## Integrations-Anleitungen

### Slack

1. https://api.slack.com/apps → **Create New App** (From Scratch)
2. **Slash Commands** → `/ito` hinzufügen (Request URL: `https://deine-api-domain/slack/commands`)
3. **Event Subscriptions** → Aktivieren (Request URL: `https://deine-api-domain/slack/events`)
4. **OAuth & Permissions** → Bot Token Scopes: `commands`, `chat:write`, `users:read`, `users:read.email`
5. **Install to Workspace** → Bot Token kopieren → `SLACK_BOT_TOKEN`
6. **Basic Information** → Signing Secret → `SLACK_SIGNING_SECRET`

### Google Calendar

1. https://console.cloud.google.com → Google Calendar API aktivieren
2. **Credentials** → OAuth Client ID (Webanwendung)
3. Redirect URI: `https://deine-api-domain/calendar/google/callback`
4. Client ID/Secret in `.env` eintragen
5. Benutzer: Einstellungen → Kalender-Integrationen → „Google Calendar verbinden"

### Outlook Calendar

1. https://portal.azure.com → **App registrations** → Neue Registrierung
2. Redirect URI: `https://deine-api-domain/calendar/outlook/callback`
3. API-Berechtigungen: `Calendars.ReadWrite`
4. Client ID/Secret in `.env` eintragen

---

## Tests

```bash
# Testdatenbank erstellen (nur beim ersten Mal)
createdb ito_test

# Backend E2E
cd apps/api && pnpm test:e2e

# Frontend Unit/Integration
cd apps/desktop && pnpm test

# Frontend E2E
cd apps/desktop && pnpm test:e2e
```

### Backend E2E-Tests

| Bereich | Anzahl | Abdeckung |
|---------|--------|-----------|
| Auth | 10 | Registrierung, Anmeldung, Token-Aktualisierung, 401-Prüfungen |
| Workspaces | 10 | CRUD, Einladungen, Annahme, GUEST-Rolle, Einstellungen |
| Teams | 13 | CRUD, Mitgliederverwaltung, Dashboard, Aufgabenfilter |
| Aufgaben | 12 | CRUD, Filter, Kalender-Endpunkt, completedAt |
| Threads | 13 | Verbinden, zirkuläre Ketten, Snap-back, Berechtigungen |
| Benachrichtigungen | 5 | Automatische Erstellung, Liste, Filter, als gelesen markieren |

### Frontend-Tests

| Werkzeug | Anzahl | Abdeckung |
|----------|--------|-----------|
| Vitest | 45 | Zustand Stores (Auth, Aufgabe, Workspace, Benachrichtigung), Hilfsfunktionen |
| Playwright | 6 | Kritische Pfade für Anmeldung/Registrierung |

---

## Bereitstellung

### Architektur

```
┌─ Vercel ──────────────┐      ┌─ EC2 (t3.small) ──────────────┐
│  itothread.com        │ ──▶  │  Caddy (automatisches HTTPS)   │
│  (Next.js Static)     │      │    └─ api.itothread.com        │
└───────────────────────┘      │       └─ ito-api:3011          │
                               │  PostgreSQL 16                  │
                               └─────────────────────────────────┘
```

### Selbst hosten mit Docker

```bash
git clone https://github.com/GTKorea/ito.git
cd ito
cp apps/api/.env.example apps/api/.env
# apps/api/.env mit deiner Datenbank und Secrets bearbeiten

docker compose -f docker-compose.prod.yml up -d
```

### Vercel (Frontend)

1. GitHub-Repository auf Vercel verbinden
2. Root Directory: `apps/desktop`
3. Framework Preset: `Other` (Static Export)
4. Umgebungsvariablen: `NEXT_PUBLIC_API_URL=https://deine-api-domain`

---

## Design

Von Linear inspiriertes Theme-System (Hell / Dunkel / Automatisch):

| Element | Dunkel | Hell |
|---------|--------|------|
| Hintergrund | `#0A0A0A` | `#FFFFFF` |
| Oberfläche | `#1A1A1A` | `#F5F5F5` |
| Schriftart | Inter / Geist | Inter / Geist |

---

## Mitwirken

Wir freuen uns über Beiträge! Bitte siehe [CONTRIBUTING.md](./CONTRIBUTING.md) für Richtlinien.

## Lizenz

Dieses Projekt ist lizenziert unter der [AGPL-3.0](./LICENSE).
