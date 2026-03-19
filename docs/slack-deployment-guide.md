# Slack App Deployment Guide

This guide covers creating the ito Slack app, configuring OAuth for multi-workspace installs, and submitting to the Slack App Directory.

## 1. Create Slack App from Manifest

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** > **From an app manifest**
3. Select a development workspace
4. Paste the contents of `docs/slack-app-manifest.json`
5. Review and click **Create**

After creation, note these values from **Settings > Basic Information**:
- **Client ID** → `SLACK_CLIENT_ID`
- **Client Secret** → `SLACK_CLIENT_SECRET`
- **Signing Secret** → `SLACK_SIGNING_SECRET`

## 2. Environment Variables

Add these to your API environment (`.env` or production secrets):

```env
# Required — always needed for Slack integration
SLACK_SIGNING_SECRET=<from Basic Information>

# Required for OAuth install flow (multi-workspace / App Directory)
SLACK_CLIENT_ID=<from Basic Information>
SLACK_CLIENT_SECRET=<from Basic Information>

# Optional — single-workspace fallback (not needed with OAuth)
SLACK_BOT_TOKEN=<from OAuth & Permissions, only for dev/single workspace>

# Optional — used to build the OAuth redirect URI
# Defaults to http://localhost:<API_PORT>
API_URL=https://api.itothread.com
```

## 3. Test the Install Flow

### Local Development

1. Use a tunneling tool (ngrok, Cloudflare Tunnel) to expose your local API:
   ```bash
   ngrok http 3011
   ```

2. Temporarily update your Slack app settings:
   - **OAuth & Permissions > Redirect URLs**: Add `https://<your-tunnel>/slack/oauth/callback`
   - **Slash Commands**: Update the URL to `https://<your-tunnel>/slack/commands`
   - **Event Subscriptions**: Update the URL to `https://<your-tunnel>/slack/events`

3. Set `API_URL` in your local `.env`:
   ```env
   API_URL=https://<your-tunnel>
   ```

4. Visit `http://localhost:3011/slack/install` — you should be redirected to Slack's OAuth consent screen.

5. Authorize the app. You should be redirected back to your frontend at `/settings/integrations?slack=success`.

6. Verify a `SlackWorkspace` record was created in the database:
   ```bash
   cd apps/api && npx prisma studio
   ```

### Production

1. Ensure `API_URL=https://api.itothread.com` is set in production environment.
2. Confirm the Slack app's redirect URL is `https://api.itothread.com/slack/oauth/callback`.
3. Visit `https://api.itothread.com/slack/install` to test the flow.

## 4. How It Works

The install flow follows Slack's OAuth v2 spec:

1. User visits `GET /slack/install`
2. Server redirects to `https://slack.com/oauth/v2/authorize` with client ID and scopes
3. User authorizes in Slack
4. Slack redirects to `GET /slack/oauth/callback?code=...`
5. Server exchanges the code for a bot access token via `oauth.v2.access`
6. Server creates/updates a `SlackWorkspace` record with the team's bot token
7. User is redirected to the frontend success page

Each workspace that installs the app gets its own bot token stored in `SlackWorkspace.accessToken`. Slash commands and event handlers automatically use the per-workspace token.

## 5. Slack App Directory Submission

### Prerequisites

Before submitting, ensure:

- [ ] The app has a clear name, description, and icon
- [ ] OAuth install flow works end-to-end in production
- [ ] Slash commands work correctly after install
- [ ] The app handles token revocation (when a workspace uninstalls)
- [ ] A landing page exists describing the app (e.g., `https://itothread.com/integrations/slack`)
- [ ] A privacy policy URL is configured
- [ ] A support email or URL is configured

### App Directory Requirements

1. **App listing page**: Go to **Manage Distribution > Share Your App with Other Workspaces** and complete all required fields:
   - Short description (up to 140 characters)
   - Long description
   - App icon (512x512 minimum)
   - Category (Productivity)
   - Support URL
   - Privacy policy URL

2. **Remove hard-coded tokens**: The app must use OAuth for installation, not a single `SLACK_BOT_TOKEN`. The OAuth flow implemented in this project handles this.

3. **Activate public distribution**: In **Manage Distribution**, check all items and click **Activate Public Distribution**.

### Submission Steps

1. Go to **Manage Distribution > Submit to App Directory**
2. Complete the submission form:
   - Confirm OAuth scopes are minimal and justified
   - Provide test instructions for Slack reviewers
   - Describe what each slash command does
3. Submit for review

### Review Timeline

- Slack reviews typically take 1-3 weeks
- They may request changes or ask questions
- Once approved, the app appears in the Slack App Directory

### Post-Approval

- Monitor installs via the Slack app dashboard
- Handle the `app_uninstalled` event to clean up `SlackWorkspace` records (add this to event handling)
- Keep scopes minimal — adding new scopes requires re-approval

## 6. Database Schema

The OAuth flow uses these Prisma models:

```
SlackWorkspace
├── id            (cuid)
├── slackTeamId   (unique — Slack workspace ID)
├── slackTeamName
├── accessToken   (bot token from OAuth)
├── botUserId     (bot user ID)
├── scope         (granted scopes)
├── workspaceId   (linked ito workspace)
└── updatedAt

SlackUser
├── id
├── slackUserId
├── slackWorkspaceId
├── userId        (linked ito user)
└── slackChannelId (for DM notifications)
```

## 7. Troubleshooting

**OAuth redirect fails with "missing_code"**
- Check that `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are set
- Verify the redirect URL in Slack app settings matches `<API_URL>/slack/oauth/callback`

**Slash commands return "Invalid signature"**
- Verify `SLACK_SIGNING_SECRET` matches the value in Slack app settings
- Ensure the raw request body is preserved (NestJS raw body middleware must be enabled)

**Bot can't send messages after install**
- Check that the `chat:write` scope is included
- Verify the `SlackWorkspace.accessToken` was stored correctly
- The bot must be invited to the channel or use DMs
