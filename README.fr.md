# ito (糸) — Collaboration de taches basee sur les fils

> Connectez vos coequipiers avec des **fils**, transmettez les taches et recuperez-les automatiquement une fois terminees.

[English](./README.md) | [한국어](./README.ko.md)

![NestJS](https://img.shields.io/badge/NestJS-11-ea2845?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-v2-ffc131?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square)
![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)

---

## Le probleme

Chaque outil de gestion de taches traite la delegation comme une voie a sens unique : assigner → termine.

Mais le travail reel rebondit entre les personnes. Vous demandez a quelqu'un de relire quelque chose, cette personne a besoin de l'avis de quelqu'un d'autre, et finalement tout doit vous revenir. Avec Jira, Asana ou Linear, vous perdez le fil de ce flux et finissez par demander « ou en est cette tache ? » sur Slack.

## La solution : les chaines de fils

ito connecte les taches avec des **fils** — comme un elastique tendu entre les personnes. Lorsque quelqu'un termine sa partie, la tache **revient automatiquement** a travers la chaine.

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

- **Connecter** : L'assignataire actuel connecte la tache a la personne suivante → le statut devient `IN_PROGRESS`
- **Transmettre** : Le lien de l'assignataire precedent passe automatiquement a `FORWARDED`
- **Retour elastique** : Lorsque quelqu'un resout son lien, la tache revient a la personne precedente
- **Profondeur de chaine** : Jusqu'a 20 niveaux
- **Protection circulaire** : Impossible de se connecter aux membres actifs de la chaine (les membres ayant resolu sont autorises)

---

## Fonctionnalites

### Systeme de chaines de fils
- **Connecter / Resoudre** : Transmettez les taches et recuperez-les automatiquement via le retour elastique
- **Creation rapide de chaine** : Tapez `nom de tache > @utilisateurB > @utilisateurC` pour creer une tache et une chaine en une seule action
- **Visualisation en graphe** : Visualisez les chaines de fils sous forme de graphe interactif (style Obsidian)

### Saisie rapide de taches
Barre de saisie style chat en bas de l'espace de travail :

```
Frontend review > @kim > @lee
```

- Le separateur `>` cree la tache et la chaine simultanement
- `@` declenche l'autocompletion des utilisateurs
- Entierement navigable au clavier (↑↓ pour selectionner, Tab/Entree pour confirmer)

### Bloqueurs
- Marquez les dependances externes comme des **bloqueurs** explicites (pas de simples commentaires)
- Type de bloqueur sur ThreadLink : `PERSON` (par defaut) | `BLOCKER`
- Les taches avec des bloqueurs actifs sont deplacees dans une section « Bloque »

### Groupes (publics et prives)
- **Groupes publics** : Visibles par tous les membres de l'espace de travail (comme les canaux publics Slack)
- **Groupes prives** : Sur invitation uniquement, visibles seulement par les membres
- Basculez entre public et prive a tout moment
- Invitez des membres individuels ou des equipes entieres en une seule fois

### SharedSpace (collaboration inter-espaces de travail)
- Creez des espaces partages entre differents espaces de travail (differentes equipes/entreprises)
- Connectez des chaines de fils au-dela des frontieres des espaces de travail
- Chaque espace de travail conserve sa propre autonomie

### Integration Slack
| Commande | Description |
|----------|-------------|
| `/ito create <nom de tache>` | Creer une tache |
| `/ito list` | Lister mes taches |
| `/ito connect` | Connecter un fil (bientot disponible) |
| `/ito resolve` | Resoudre un fil (bientot disponible) |
| `/ito help` | Aide |

Les notifications de fil (reception, retour elastique, acheve) sont envoyees en messages prives Slack.

### Vue calendrier
- Grille mensuelle : taches terminees (vert) et dates d'echeance a venir (orange)
- Cliquez sur une date pour afficher les details des taches
- Integration OAuth avec Google Calendar et Outlook Calendar

### Equipes et collaboration en espace de travail
- **Roles** : OWNER / ADMIN / MEMBER / GUEST (lecture seule + resolution uniquement)
- **Tableau de bord d'equipe** : Charge de travail et statistiques de taches par membre
- **Parametres de l'espace de travail** : Nom, description, gestion des roles des membres

### Notifications
- **Temps reel** : Socket.IO pour une livraison instantanee
- **Bureau** : Notifications systeme natives via Tauri
- **Web** : API Notification du navigateur en solution de repli
- **Slack** : Tous les types de notifications transmis en messages prives (optionnel)

### Internationalisation (i18n)
9 langues prises en charge — modifiable dans les parametres :

| Langue | Code |
|--------|------|
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
Clair / Sombre / Auto (suit le reglage du systeme) — bascule via un interrupteur a 3 positions dans la barre laterale.

---

## Stack technique

| Domaine | Technologie |
|---------|-------------|
| **Backend** | NestJS 11, PostgreSQL 16, Prisma 5 |
| **Frontend** | Next.js 16 (Static Export), React 19 |
| **Bureau** | Tauri v2 (macOS, Windows, Linux) |
| **Etat** | Zustand v5 |
| **UI** | Tailwind CSS v4, shadcn/ui v4 |
| **Temps reel** | Socket.IO |
| **Authentification** | JWT + Passport (Email/mot de passe, Google, GitHub OAuth) |
| **Email** | Resend (optionnel) |
| **Slack** | @slack/web-api (optionnel) |
| **Graphe** | @xyflow/react + @dagrejs/dagre |
| **i18n** | next-intl |
| **Tests** | Jest (API E2E), Vitest + Playwright (Frontend) |
| **Monorepo** | pnpm workspaces + Turborepo |

---

## Structure du projet

```
ito/
├── apps/
│   ├── api/                          # Backend NestJS
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Schema de la base de donnees
│   │   ├── src/
│   │   │   ├── auth/                 # Authentification (JWT, OAuth)
│   │   │   ├── users/                # Profils utilisateurs, recherche, preferences
│   │   │   ├── workspaces/           # CRUD des espaces de travail, invitations, parametres
│   │   │   ├── teams/                # Gestion des equipes, tableau de bord
│   │   │   ├── tasks/                # CRUD des taches, filtres, calendrier
│   │   │   ├── threads/              # Connexion/resolution/chaine de fils (logique principale)
│   │   │   ├── task-groups/          # Groupes publics/prives
│   │   │   ├── notifications/        # Service de notifications
│   │   │   ├── slack/                # Integration Slack
│   │   │   ├── calendar/             # Integration calendrier externe
│   │   │   ├── email/                # Envoi d'emails (Resend)
│   │   │   ├── activities/           # Journal d'activites
│   │   │   ├── files/                # Pieces jointes
│   │   │   ├── chat/                 # Messages de chat par tache
│   │   │   ├── shared-spaces/        # Collaboration inter-espaces de travail
│   │   │   ├── websocket/            # Passerelle Socket.IO
│   │   │   └── common/               # Guards, filtres, Prisma
│   │   ├── test/                     # Tests E2E
│   │   └── Dockerfile                # Build Docker de production
│   │
│   └── desktop/                      # Frontend Tauri + Next.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── (app)/            # Routes authentifiees
│       │   │   ├── (auth)/           # Connexion / Inscription / Callback OAuth
│       │   │   └── invite/           # Page d'acceptation d'invitation
│       │   ├── components/           # Composants UI
│       │   ├── stores/               # Stores Zustand
│       │   ├── messages/             # Fichiers de traduction i18n (9 langues)
│       │   └── lib/                  # Client API, WebSocket, utilitaires
│       ├── src-tauri/                # Configuration native Tauri
│       └── vercel.json               # Configuration de deploiement Vercel
│
├── packages/
│   └── shared/                       # Types/constantes partages
│
└── docker-compose.yml                # PostgreSQL de developpement
```

---

## Demarrage rapide

### Prerequis

- Node.js 20+
- pnpm 9+
- PostgreSQL 16 (ou Docker)
- Rust + Tauri CLI (uniquement pour les builds bureau)

### Developpement local

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

### Commandes

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

## Variables d'environnement

Toutes les integrations externes sont **optionnelles**. Si une variable d'environnement est vide, la fonctionnalite est automatiquement desactivee.

### `apps/api/.env`

| Variable | Description | Requis |
|----------|-------------|--------|
| `DATABASE_URL` | Chaine de connexion PostgreSQL | ✅ |
| `JWT_SECRET` | Cle de signature JWT | ✅ |
| `JWT_REFRESH_SECRET` | Cle de signature du token de rafraichissement | ✅ |
| `API_PORT` | Port de l'API (par defaut : 3011) | |
| `FRONTEND_URL` | URL du frontend | |
| `GOOGLE_CLIENT_ID` | Google OAuth | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | |
| `GITHUB_CLIENT_ID` | GitHub OAuth | |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | |
| `RESEND_API_KEY` | Emails d'invitation | |
| `SLACK_BOT_TOKEN` | Integration Slack | |
| `SLACK_SIGNING_SECRET` | Verification des requetes Slack | |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google Calendar | |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google Calendar | |
| `OUTLOOK_CLIENT_ID` | Outlook Calendar | |
| `OUTLOOK_CLIENT_SECRET` | Outlook Calendar | |

### `apps/desktop/.env.local`

| Variable | Description | Requis |
|----------|-------------|--------|
| `NEXT_PUBLIC_API_URL` | URL du serveur API (par defaut : `http://localhost:3011`) | ✅ |

---

## Guides d'integration

### Slack

1. https://api.slack.com/apps → **Create New App** (From Scratch)
2. **Slash Commands** → Ajouter `/ito` (Request URL : `https://votre-domaine-api/slack/commands`)
3. **Event Subscriptions** → Activer (Request URL : `https://votre-domaine-api/slack/events`)
4. **OAuth & Permissions** → Bot Token Scopes : `commands`, `chat:write`, `users:read`, `users:read.email`
5. **Install to Workspace** → Copier le Bot Token → `SLACK_BOT_TOKEN`
6. **Basic Information** → Signing Secret → `SLACK_SIGNING_SECRET`

### Google Calendar

1. https://console.cloud.google.com → Activer l'API Google Calendar
2. **Credentials** → OAuth Client ID (Application Web)
3. URI de redirection : `https://votre-domaine-api/calendar/google/callback`
4. Definir le Client ID/Secret dans `.env`
5. Utilisateurs : Parametres → Integrations calendrier → « Connecter Google Calendar »

### Outlook Calendar

1. https://portal.azure.com → **App registrations** → Nouvelle inscription
2. URI de redirection : `https://votre-domaine-api/calendar/outlook/callback`
3. Permissions API : `Calendars.ReadWrite`
4. Definir le Client ID/Secret dans `.env`

---

## Tests

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

### Tests E2E du backend

| Domaine | Nombre | Couverture |
|---------|--------|------------|
| Auth | 10 | Inscription, connexion, rafraichissement de token, verifications 401 |
| Workspaces | 10 | CRUD, invitations, acceptation, role GUEST, parametres |
| Teams | 13 | CRUD, gestion des membres, tableau de bord, filtres de taches |
| Tasks | 12 | CRUD, filtres, endpoint calendrier, completedAt |
| Threads | 13 | Connexion, chaines circulaires, retour elastique, permissions |
| Notifications | 5 | Creation automatique, liste, filtre, marquer comme lu |

### Tests du frontend

| Outil | Nombre | Couverture |
|-------|--------|------------|
| Vitest | 45 | Stores Zustand (auth, task, workspace, notification), utilitaires |
| Playwright | 6 | Parcours critiques connexion/inscription |

---

## Deploiement

### Architecture

```
┌─ Vercel ──────────────┐      ┌─ EC2 (t3.small) ──────────────┐
│  itothread.com        │ ──▶  │  Caddy (auto HTTPS)            │
│  (Next.js Static)     │      │    └─ api.itothread.com        │
└───────────────────────┘      │       └─ ito-api:3011          │
                               │  PostgreSQL 16                  │
                               └─────────────────────────────────┘
```

### Auto-hebergement avec Docker

```bash
git clone https://github.com/GTKorea/ito.git
cd ito
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your database and secrets

docker compose -f docker-compose.prod.yml up -d
```

### Vercel (Frontend)

1. Connectez le depot GitHub sur Vercel
2. Repertoire racine : `apps/desktop`
3. Preset de framework : `Other` (Static Export)
4. Variables d'environnement : `NEXT_PUBLIC_API_URL=https://votre-domaine-api`

---

## Design

Systeme de themes inspire de Linear (Clair / Sombre / Auto) :

| Element | Sombre | Clair |
|---------|--------|-------|
| Arriere-plan | `#0A0A0A` | `#FFFFFF` |
| Surface | `#1A1A1A` | `#F5F5F5` |
| Police | Inter / Geist | Inter / Geist |

---

## Contribuer

Les contributions sont les bienvenues ! Veuillez consulter [CONTRIBUTING.md](./CONTRIBUTING.md) pour les directives.

## Licence

Ce projet est distribue sous la licence [AGPL-3.0](./LICENSE).
