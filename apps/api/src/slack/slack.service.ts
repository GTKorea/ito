import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebClient } from '@slack/web-api';
import { PrismaService } from '../common/prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { ThreadsService } from '../threads/threads.service';
import { SlackCommandDto } from './dto/slack-command.dto';
import * as crypto from 'crypto';

const SLACK_OAUTH_AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_OAUTH_BOT_SCOPES = [
  'commands',
  'chat:write',
  'im:write',
  'users:read',
  'users:read.email',
];

@Injectable()
export class SlackService implements OnModuleInit {
  private readonly logger = new Logger(SlackService.name);
  /** Fallback client for single-workspace setup (SLACK_BOT_TOKEN) */
  private defaultClient: WebClient | null = null;
  private signingSecret: string | null = null;
  private enabled = false;

  // OAuth credentials (for multi-workspace / App Directory)
  private clientId: string | null = null;
  private clientSecret: string | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private tasksService: TasksService,
    @Optional() private threadsService: ThreadsService,
  ) {}

  onModuleInit() {
    const botToken = this.configService.get<string>('SLACK_BOT_TOKEN');
    const signingSecret = this.configService.get<string>(
      'SLACK_SIGNING_SECRET',
    );
    this.clientId = this.configService.get<string>('SLACK_CLIENT_ID') || null;
    this.clientSecret =
      this.configService.get<string>('SLACK_CLIENT_SECRET') || null;

    if (signingSecret) {
      this.signingSecret = signingSecret;
      this.enabled = true;
    }

    if (botToken) {
      this.defaultClient = new WebClient(botToken);
    }

    if (this.enabled) {
      this.logger.log('Slack integration initialized');
      if (this.clientId && this.clientSecret) {
        this.logger.log('Slack OAuth (multi-workspace) enabled');
      }
    } else {
      this.logger.warn(
        'SLACK_SIGNING_SECRET not configured — Slack integration disabled',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async getSlackWorkspaceByItoWorkspace(workspaceId: string) {
    return this.prisma.slackWorkspace.findFirst({
      where: { workspaceId },
    });
  }

  // ──────────────────── OAuth Install Flow ────────────────────

  isOAuthConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  getInstallUrl(state?: string): string {
    if (!this.clientId) {
      throw new Error('SLACK_CLIENT_ID is not configured');
    }

    const redirectUri = this.getOAuthRedirectUri();
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: SLACK_OAUTH_BOT_SCOPES.join(','),
      redirect_uri: redirectUri,
    });

    if (state) {
      params.set('state', state);
    }

    return `${SLACK_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  }

  async handleOAuthCallback(
    code: string,
    workspaceId: string,
  ): Promise<{ slackTeamId: string; slackTeamName: string }> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Slack OAuth credentials are not configured');
    }

    // Validate the ito workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new Error('Invalid workspace ID');
    }

    const tempClient = new WebClient();
    const result = await tempClient.oauth.v2.access({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.getOAuthRedirectUri(),
    });

    if (!result.ok) {
      throw new Error(`Slack OAuth failed: ${result.error}`);
    }

    const teamId = result.team?.id;
    const teamName = result.team?.name || 'Unknown';
    const botToken = result.access_token;
    const botUserId = result.bot_user_id;
    const scope = result.scope;

    if (!teamId || !botToken) {
      throw new Error('Invalid OAuth response from Slack');
    }

    // Upsert the SlackWorkspace record
    await this.prisma.slackWorkspace.upsert({
      where: { slackTeamId: teamId },
      update: {
        slackTeamName: teamName,
        accessToken: botToken,
        botUserId: botUserId || null,
        scope: scope || null,
        workspaceId,
      },
      create: {
        slackTeamId: teamId,
        slackTeamName: teamName,
        accessToken: botToken,
        botUserId: botUserId || null,
        scope: scope || null,
        workspaceId,
      },
    });

    this.logger.log(
      `Slack workspace installed: ${teamName} (${teamId}) → ito workspace ${workspaceId}`,
    );

    return { slackTeamId: teamId, slackTeamName: teamName };
  }

  private getOAuthRedirectUri(): string {
    const apiUrl =
      this.configService.get<string>('API_URL') ||
      `http://localhost:${this.configService.get<string>('API_PORT') || '3011'}`;
    return `${apiUrl}/slack/oauth/callback`;
  }

  // ──────────────────── Signature Verification ────────────────────

  verifySignature(
    signingSecret: string,
    headers: Record<string, string>,
    rawBody: string,
  ): boolean {
    const timestamp = headers['x-slack-request-timestamp'];
    const signature = headers['x-slack-signature'];

    if (!timestamp || !signature) return false;

    // Reject requests older than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

    const sigBasestring = `v0:${timestamp}:${rawBody}`;
    const mySignature =
      'v0=' +
      crypto
        .createHmac('sha256', signingSecret)
        .update(sigBasestring, 'utf8')
        .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf8'),
      Buffer.from(signature, 'utf8'),
    );
  }

  verifyRequest(headers: Record<string, string>, rawBody: string): boolean {
    if (!this.signingSecret) return false;
    return this.verifySignature(this.signingSecret, headers, rawBody);
  }

  // ──────────────────── Messaging ────────────────────

  /**
   * Get a WebClient for the given Slack team. Falls back to the default
   * client (SLACK_BOT_TOKEN) if no per-workspace token is stored.
   */
  private async getClientForTeam(
    slackTeamId?: string,
  ): Promise<WebClient | null> {
    if (slackTeamId) {
      const workspace = await this.prisma.slackWorkspace.findUnique({
        where: { slackTeamId },
      });
      if (workspace?.accessToken) {
        return new WebClient(workspace.accessToken);
      }
    }
    return this.defaultClient;
  }

  async sendMessage(
    channel: string,
    text: string,
    blocks?: any[],
    slackTeamId?: string,
  ): Promise<void> {
    const client = await this.getClientForTeam(slackTeamId);
    if (!client) {
      this.logger.debug('Slack message skipped (no client available)');
      return;
    }

    try {
      await client.chat.postMessage({ channel, text, blocks });
    } catch (error) {
      this.logger.error(`Failed to send Slack message to ${channel}`, error);
    }
  }

  async sendNotification(
    userId: string,
    notification: { type: string; title: string; data?: any },
  ): Promise<void> {
    const slackUser = await this.findSlackUser(userId);
    if (!slackUser) return;

    const client = await this.getClientForTeam(
      slackUser.slackWorkspace.slackTeamId,
    );
    if (!client) return;

    // Auto-open DM channel if not yet stored
    let channelId = slackUser.slackChannelId;
    if (!channelId) {
      try {
        const dm = await client.conversations.open({
          users: slackUser.slackUserId,
        });
        channelId = dm.channel?.id || null;
        if (channelId) {
          await this.prisma.slackUser.update({
            where: { id: slackUser.id },
            data: { slackChannelId: channelId },
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to open DM channel for Slack user ${slackUser.slackUserId}`,
          error,
        );
        return;
      }
    }

    if (!channelId) return;

    const text = this.formatNotification(notification);
    try {
      await client.chat.postMessage({ channel: channelId, text });
    } catch (error) {
      this.logger.error(
        `Failed to send Slack notification to user ${userId}`,
        error,
      );
    }
  }

  async findSlackUser(userId: string) {
    return this.prisma.slackUser.findFirst({
      where: { userId },
      include: { slackWorkspace: true },
    });
  }

  // ──────────────────── SlackUser Linking (Code-based) ────────────────────

  /**
   * Generate a 6-char alphanumeric link code for the authenticated ito user.
   * The code expires in 5 minutes and is single-use.
   */
  async generateLinkCode(
    userId: string,
    workspaceId: string,
  ): Promise<{ code: string; expiresAt: Date }> {
    // Delete any unused codes for this user/workspace
    await this.prisma.slackLinkCode.deleteMany({
      where: { userId, workspaceId, usedAt: null },
    });

    const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.slackLinkCode.create({
      data: { code, userId, workspaceId, expiresAt },
    });

    return { code, expiresAt };
  }

  /**
   * Complete the linking process: validate the code and create the SlackUser mapping.
   * Called from the `/ito link <code>` slash command.
   */
  async completeLinking(
    code: string,
    slackUserId: string,
    slackTeamId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const linkCode = await this.prisma.slackLinkCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!linkCode) {
      return { success: false, error: '유효하지 않은 코드입니다.' };
    }
    if (linkCode.usedAt) {
      return { success: false, error: '이미 사용된 코드입니다.' };
    }
    if (linkCode.expiresAt < new Date()) {
      return { success: false, error: '만료된 코드입니다. ito 설정에서 새 코드를 발급받아주세요.' };
    }

    const slackWorkspace = await this.prisma.slackWorkspace.findUnique({
      where: { slackTeamId },
    });
    if (!slackWorkspace) {
      return { success: false, error: '이 Slack 워크스페이스는 ito와 연결되어 있지 않습니다.' };
    }

    if (slackWorkspace.workspaceId !== linkCode.workspaceId) {
      return { success: false, error: '코드가 발급된 ito 워크스페이스와 이 Slack 워크스페이스가 일치하지 않습니다.' };
    }

    // Upsert the SlackUser mapping
    await this.prisma.slackUser.upsert({
      where: {
        slackUserId_slackWorkspaceId: {
          slackUserId,
          slackWorkspaceId: slackWorkspace.id,
        },
      },
      update: { userId: linkCode.userId },
      create: {
        slackUserId,
        slackWorkspaceId: slackWorkspace.id,
        userId: linkCode.userId,
      },
    });

    // Mark code as used
    await this.prisma.slackLinkCode.update({
      where: { id: linkCode.id },
      data: { usedAt: new Date() },
    });

    this.logger.log(
      `Linked Slack user ${slackUserId} → ito user ${linkCode.userId} via code`,
    );

    return { success: true };
  }

  /**
   * Unlink the current user's Slack account from their ito account.
   */
  async unlinkSlackUser(
    userId: string,
    workspaceId: string,
  ): Promise<boolean> {
    const slackWorkspace = await this.prisma.slackWorkspace.findFirst({
      where: { workspaceId },
    });
    if (!slackWorkspace) return false;

    const deleted = await this.prisma.slackUser.deleteMany({
      where: { userId, slackWorkspaceId: slackWorkspace.id },
    });

    return deleted.count > 0;
  }

  /**
   * Get the link status for a user in a workspace.
   */
  async getUserLinkStatus(
    userId: string,
    workspaceId: string,
  ): Promise<{ linked: boolean; slackUserId?: string }> {
    const slackWorkspace = await this.prisma.slackWorkspace.findFirst({
      where: { workspaceId },
    });
    if (!slackWorkspace) return { linked: false };

    const slackUser = await this.prisma.slackUser.findFirst({
      where: { userId, slackWorkspaceId: slackWorkspace.id },
    });

    return slackUser
      ? { linked: true, slackUserId: slackUser.slackUserId }
      : { linked: false };
  }

  // ──────────────────── App Uninstall ────────────────────

  async handleAppUninstalled(slackTeamId: string): Promise<void> {
    const slackWorkspace = await this.prisma.slackWorkspace.findUnique({
      where: { slackTeamId },
    });
    if (!slackWorkspace) return;

    // Cascade delete will remove related SlackUser records
    await this.prisma.slackWorkspace.delete({
      where: { id: slackWorkspace.id },
    });

    this.logger.log(
      `Slack workspace uninstalled: ${slackWorkspace.slackTeamName} (${slackTeamId})`,
    );
  }

  private formatNotification(notification: {
    type: string;
    title: string;
    data?: any;
  }): string {
    const data = notification.data || {};
    const taskTitle = data.taskTitle || notification.title;
    const fromUser = data.fromUserName || 'Someone';

    switch (notification.type) {
      case 'THREAD_RECEIVED':
        return `\u{1F9F5} ${fromUser}\uB2D8\uC774 '${taskTitle}' \uD0DC\uC2A4\uD06C\uB97C \uB118\uACBC\uC2B5\uB2C8\uB2E4`;
      case 'THREAD_SNAPPED':
        return `\u{1F519} '${taskTitle}' \uD0DC\uC2A4\uD06C\uAC00 \uB418\uB3CC\uC544\uC654\uC2B5\uB2C8\uB2E4`;
      case 'THREAD_COMPLETED':
        return `\u2705 '${taskTitle}' \uD0DC\uC2A4\uD06C\uC758 \uC2E4\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4`;
      case 'WORKSPACE_INVITE':
        return `\u{1F4E8} \uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4 \uCD08\uB300\uAC00 \uB3C4\uCC29\uD588\uC2B5\uB2C8\uB2E4`;
      case 'TASK_ASSIGNED':
        return `\u{1F4CB} '${taskTitle}' \uD0DC\uC2A4\uD06C\uAC00 \uBC30\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4`;
      case 'TASK_COMPLETED':
        return `\u2705 '${taskTitle}' \uD0DC\uC2A4\uD06C\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4`;
      default:
        return notification.title;
    }
  }

  // ──────────────────── Slash Commands ────────────────────

  async handleCommand(
    payload: SlackCommandDto,
  ): Promise<{ response_type?: string; text?: string; blocks?: any[] }> {
    const text = payload.text.trim();
    if (!text) return this.handleHelpCommand();

    const parts = text.split(/\s+/);
    const subcommand = parts[0]?.toLowerCase();

    // Handle known subcommands
    switch (subcommand) {
      case 'list':
        return this.handleListCommand(payload);
      case 'link':
        return this.handleLinkCommand(payload, parts.slice(1).join(' '));
      case 'help':
        return this.handleHelpCommand();
    }

    // Everything else: treat as task creation with optional chain
    // Syntax: /ito <태스크 제목> > @유저1 > @유저2
    return this.handleTaskCreationWithChain(payload, text);
  }

  private async handleTaskCreationWithChain(
    payload: SlackCommandDto,
    text: string,
  ): Promise<{ response_type: string; text: string }> {
    // Split by ' > ' to get segments
    const segments = text.split(/\s*>\s*/);
    const title = segments[0]?.trim();
    const mentionSegments = segments.slice(1).map((s) => s.trim()).filter(Boolean);

    if (!title) {
      return {
        response_type: 'ephemeral',
        text: ':warning: 태스크 이름을 입력해주세요. 예: `/ito 리포트 작성` 또는 `/ito 리포트 작성 > @유저`',
      };
    }

    // Resolve the command invoker
    const mapping = await this.resolveSlackUser(
      payload.team_id,
      payload.user_id,
    );
    if (!mapping) {
      return {
        response_type: 'ephemeral',
        text: ':x: Slack 계정이 ito와 연동되지 않았습니다. ito 설정에서 연동 코드를 발급받은 뒤 `/ito link <코드>`를 실행해주세요.',
      };
    }

    // If no chain users, just create the task
    if (mentionSegments.length === 0) {
      return this.createTaskOnly(mapping, title);
    }

    // Resolve all Slack mentions to ito user IDs
    const chainUserIds: string[] = [];
    for (const mention of mentionSegments) {
      const userId = await this.resolveSlackMention(payload.team_id, mention);
      if (!userId) {
        return {
          response_type: 'ephemeral',
          text: `:warning: ${mention}의 ito 계정이 연결되어 있지 않습니다. \`/ito link <코드>\`로 계정을 연결해주세요.`,
        };
      }
      chainUserIds.push(userId);
    }

    // Create task + connect chain
    try {
      const task = await this.tasksService.create(
        { title },
        mapping.slackWorkspace.workspaceId,
        mapping.userId,
      );

      if (this.threadsService) {
        await this.threadsService.connectChain(task.id, mapping.userId, chainUserIds);
      } else {
        this.logger.warn('ThreadsService not available, skipping chain connection');
      }

      const chainDisplay = mentionSegments.join(' → ');
      return {
        response_type: 'ephemeral',
        text: `:white_check_mark: 태스크가 생성되었습니다: *${task.title}*\n:thread: 체인: 나 → ${chainDisplay}`,
      };
    } catch (error) {
      this.logger.error('Failed to create task with chain from Slack command', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      return {
        response_type: 'ephemeral',
        text: `:x: 태스크 생성에 실패했습니다: ${errorMessage}`,
      };
    }
  }

  private async createTaskOnly(
    mapping: { userId: string; slackWorkspace: { workspaceId: string } },
    title: string,
  ): Promise<{ response_type: string; text: string }> {
    try {
      const task = await this.tasksService.create(
        { title },
        mapping.slackWorkspace.workspaceId,
        mapping.userId,
      );

      return {
        response_type: 'ephemeral',
        text: `:white_check_mark: 태스크가 생성되었습니다: *${task.title}*`,
      };
    } catch (error) {
      this.logger.error('Failed to create task from Slack command', error);
      return {
        response_type: 'ephemeral',
        text: ':x: 태스크 생성에 실패했습니다. 다시 시도해주세요.',
      };
    }
  }

  private async resolveSlackMention(
    slackTeamId: string,
    mentionText: string,
  ): Promise<string | null> {
    // Parse <@UXXXXXX> format
    const match = mentionText.match(/<@(U[A-Z0-9]+)>/);
    if (!match) return null;
    const slackUserId = match[1];

    const slackUser = await this.prisma.slackUser.findFirst({
      where: {
        slackUserId,
        slackWorkspace: { slackTeamId },
      },
    });
    return slackUser?.userId || null;
  }

  private async handleListCommand(
    payload: SlackCommandDto,
  ): Promise<{ response_type: string; text?: string; blocks?: any[] }> {
    const mapping = await this.resolveSlackUser(
      payload.team_id,
      payload.user_id,
    );
    if (!mapping) {
      return {
        response_type: 'ephemeral',
        text: ':x: Slack 계정이 ito와 연동되지 않았습니다.',
      };
    }

    try {
      const tasks = await this.tasksService.findAllInWorkspace(
        mapping.slackWorkspace.workspaceId,
        mapping.userId,
        { assignedToMe: true },
      );

      if (tasks.length === 0) {
        return {
          response_type: 'ephemeral',
          text: ':clipboard: 배정된 태스크가 없습니다.',
        };
      }

      const statusEmoji: Record<string, string> = {
        OPEN: ':white_circle:',
        IN_PROGRESS: ':large_blue_circle:',
        BLOCKED: ':red_circle:',
        COMPLETED: ':white_check_mark:',
        CANCELLED: ':no_entry_sign:',
      };

      const blocks: any[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: ':clipboard: 내 태스크 목록',
          },
        },
        { type: 'divider' },
      ];

      for (const task of tasks.slice(0, 10)) {
        const emoji = statusEmoji[task.status] || ':white_circle:';
        const priority =
          task.priority === 'URGENT'
            ? ':fire:'
            : task.priority === 'HIGH'
              ? ':arrow_up:'
              : '';
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} ${priority} *${task.title}*\nStatus: \`${task.status}\``,
          },
        });
      }

      if (tasks.length > 10) {
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `... 외 ${tasks.length - 10}개의 태스크가 더 있습니다`,
            },
          ],
        });
      }

      return {
        response_type: 'ephemeral',
        blocks,
        text: `배정된 태스크 ${tasks.length}개`,
      };
    } catch (error) {
      this.logger.error('Failed to list tasks from Slack command', error);
      return {
        response_type: 'ephemeral',
        text: ':x: 태스크 목록 조회에 실패했습니다.',
      };
    }
  }

  private async handleLinkCommand(
    payload: SlackCommandDto,
    code: string,
  ): Promise<{ response_type: string; text: string }> {
    if (!code) {
      return {
        response_type: 'ephemeral',
        text: ':warning: 인증 코드를 입력해주세요. 예: `/ito link ABC123`\nito 설정 페이지에서 코드를 발급받을 수 있습니다.',
      };
    }

    const result = await this.completeLinking(
      code,
      payload.user_id,
      payload.team_id,
    );

    if (!result.success) {
      return {
        response_type: 'ephemeral',
        text: `:x: ${result.error}`,
      };
    }

    return {
      response_type: 'ephemeral',
      text: ':white_check_mark: ito 계정과 Slack이 성공적으로 연동되었습니다! 이제 `/ito <태스크명>`, `/ito list` 명령어를 사용할 수 있습니다.',
    };
  }

  private handleHelpCommand(): {
    response_type: string;
    blocks: any[];
    text: string;
  } {
    return {
      response_type: 'ephemeral',
      text: 'ito Slack 명령어 도움말',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: ':thread: ito 명령어',
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: [
              '`/ito <태스크 제목>` — 태스크 생성',
              '`/ito <태스크 제목> > @유저1 > @유저2` — 태스크 생성 + 체인 연결',
              '`/ito list` — 내 태스크 목록',
              '`/ito link <코드>` — 계정 연결',
              '`/ito help` — 도움말',
            ].join('\n'),
          },
        },
      ],
    };
  }

  private async resolveSlackUser(slackTeamId: string, slackUserId: string) {
    const slackWorkspace = await this.prisma.slackWorkspace.findUnique({
      where: { slackTeamId },
    });
    if (!slackWorkspace) return null;

    return this.prisma.slackUser.findUnique({
      where: {
        slackUserId_slackWorkspaceId: {
          slackUserId,
          slackWorkspaceId: slackWorkspace.id,
        },
      },
      include: { slackWorkspace: true },
    });
  }
}
