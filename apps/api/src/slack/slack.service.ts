import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebClient } from '@slack/web-api';
import { PrismaService } from '../common/prisma/prisma.service';
import { TodosService } from '../todos/todos.service';
import { SlackCommandDto } from './dto/slack-command.dto';
import * as crypto from 'crypto';

@Injectable()
export class SlackService implements OnModuleInit {
  private readonly logger = new Logger(SlackService.name);
  private client: WebClient | null = null;
  private signingSecret: string | null = null;
  private enabled = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private todosService: TodosService,
  ) {}

  onModuleInit() {
    const botToken = this.configService.get<string>('SLACK_BOT_TOKEN');
    const signingSecret = this.configService.get<string>(
      'SLACK_SIGNING_SECRET',
    );

    if (botToken && signingSecret) {
      this.client = new WebClient(botToken);
      this.signingSecret = signingSecret;
      this.enabled = true;
      this.logger.log('Slack integration initialized');
    } else {
      this.logger.warn(
        'SLACK_BOT_TOKEN or SLACK_SIGNING_SECRET not configured — Slack integration disabled',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

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

  async sendMessage(
    channel: string,
    text: string,
    blocks?: any[],
  ): Promise<void> {
    if (!this.client) {
      this.logger.debug('Slack message skipped (not configured)');
      return;
    }

    try {
      await this.client.chat.postMessage({ channel, text, blocks });
    } catch (error) {
      this.logger.error(`Failed to send Slack message to ${channel}`, error);
    }
  }

  async sendNotification(
    userId: string,
    notification: { type: string; title: string; data?: any },
  ): Promise<void> {
    if (!this.client) return;

    const slackUser = await this.findSlackUser(userId);
    if (!slackUser || !slackUser.slackChannelId) return;

    const text = this.formatNotification(notification);
    await this.sendMessage(slackUser.slackChannelId, text);
  }

  async findSlackUser(userId: string) {
    return this.prisma.slackUser.findFirst({
      where: { userId },
      include: { slackWorkspace: true },
    });
  }

  private formatNotification(notification: {
    type: string;
    title: string;
    data?: any;
  }): string {
    const data = notification.data || {};
    const todoTitle = data.todoTitle || notification.title;
    const fromUser = data.fromUserName || 'Someone';

    switch (notification.type) {
      case 'THREAD_RECEIVED':
        return `\u{1F9F5} ${fromUser}\uB2D8\uC774 '${todoTitle}' \uD0DC\uC2A4\uD06C\uB97C \uB118\uACBC\uC2B5\uB2C8\uB2E4`;
      case 'THREAD_SNAPPED':
        return `\u{1F519} '${todoTitle}' \uD0DC\uC2A4\uD06C\uAC00 \uB418\uB3CC\uC544\uC654\uC2B5\uB2C8\uB2E4`;
      case 'THREAD_COMPLETED':
        return `\u2705 '${todoTitle}' \uD0DC\uC2A4\uD06C\uC758 \uC2E4\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4`;
      case 'WORKSPACE_INVITE':
        return `\u{1F4E8} \uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4 \uCD08\uB300\uAC00 \uB3C4\uCC29\uD588\uC2B5\uB2C8\uB2E4`;
      case 'TODO_ASSIGNED':
        return `\u{1F4CB} '${todoTitle}' \uD0DC\uC2A4\uD06C\uAC00 \uBC30\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4`;
      case 'TODO_COMPLETED':
        return `\u2705 '${todoTitle}' \uD0DC\uC2A4\uD06C\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4`;
      default:
        return notification.title;
    }
  }

  async handleCommand(
    payload: SlackCommandDto,
  ): Promise<{ response_type?: string; text?: string; blocks?: any[] }> {
    const parts = payload.text.trim().split(/\s+/);
    const subcommand = parts[0]?.toLowerCase() || 'help';
    const args = parts.slice(1).join(' ');

    switch (subcommand) {
      case 'create':
        return this.handleCreateCommand(payload, args);
      case 'list':
        return this.handleListCommand(payload);
      case 'connect':
        return {
          response_type: 'ephemeral',
          text: ':construction: `connect` \uBA85\uB839\uC5B4\uB294 \uC900\uBE44 \uC911\uC785\uB2C8\uB2E4 (Coming soon)',
        };
      case 'resolve':
        return {
          response_type: 'ephemeral',
          text: ':construction: `resolve` \uBA85\uB839\uC5B4\uB294 \uC900\uBE44 \uC911\uC785\uB2C8\uB2E4 (Coming soon)',
        };
      default:
        return this.handleHelpCommand();
    }
  }

  private async handleCreateCommand(
    payload: SlackCommandDto,
    title: string,
  ): Promise<{ response_type: string; text: string }> {
    if (!title) {
      return {
        response_type: 'ephemeral',
        text: ':warning: \uD0DC\uC2A4\uD06C \uC774\uB984\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694. \uC608: `/ito create \uB9AC\uD3EC\uD2B8 \uC791\uC131`',
      };
    }

    const mapping = await this.resolveSlackUser(
      payload.team_id,
      payload.user_id,
    );
    if (!mapping) {
      return {
        response_type: 'ephemeral',
        text: ':x: Slack \uACC4\uC815\uC774 ito\uC640 \uC5F0\uB3D9\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. \uBA3C\uC800 ito\uC5D0\uC11C Slack \uC5F0\uB3D9\uC744 \uC124\uC815\uD574\uC8FC\uC138\uC694.',
      };
    }

    try {
      const todo = await this.todosService.create(
        { title },
        mapping.slackWorkspace.workspaceId,
        mapping.userId,
      );

      return {
        response_type: 'ephemeral',
        text: `:white_check_mark: \uD0DC\uC2A4\uD06C\uAC00 \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4: *${todo.title}*`,
      };
    } catch (error) {
      this.logger.error('Failed to create todo from Slack command', error);
      return {
        response_type: 'ephemeral',
        text: ':x: \uD0DC\uC2A4\uD06C \uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
      };
    }
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
        text: ':x: Slack \uACC4\uC815\uC774 ito\uC640 \uC5F0\uB3D9\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.',
      };
    }

    try {
      const todos = await this.todosService.findAllInWorkspace(
        mapping.slackWorkspace.workspaceId,
        mapping.userId,
        { assignedToMe: true },
      );

      if (todos.length === 0) {
        return {
          response_type: 'ephemeral',
          text: ':clipboard: \uBC30\uC815\uB41C \uD0DC\uC2A4\uD06C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
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
            text: ':clipboard: \uB0B4 \uD0DC\uC2A4\uD06C \uBAA9\uB85D',
          },
        },
        { type: 'divider' },
      ];

      for (const todo of todos.slice(0, 10)) {
        const emoji = statusEmoji[todo.status] || ':white_circle:';
        const priority =
          todo.priority === 'URGENT'
            ? ':fire:'
            : todo.priority === 'HIGH'
              ? ':arrow_up:'
              : '';
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} ${priority} *${todo.title}*\nStatus: \`${todo.status}\``,
          },
        });
      }

      if (todos.length > 10) {
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `... \uC678 ${todos.length - 10}\uAC1C\uC758 \uD0DC\uC2A4\uD06C\uAC00 \uB354 \uC788\uC2B5\uB2C8\uB2E4`,
            },
          ],
        });
      }

      return {
        response_type: 'ephemeral',
        blocks,
        text: `\uBC30\uC815\uB41C \uD0DC\uC2A4\uD06C ${todos.length}\uAC1C`,
      };
    } catch (error) {
      this.logger.error('Failed to list todos from Slack command', error);
      return {
        response_type: 'ephemeral',
        text: ':x: \uD0DC\uC2A4\uD06C \uBAA9\uB85D \uC870\uD68C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.',
      };
    }
  }

  private handleHelpCommand(): {
    response_type: string;
    blocks: any[];
    text: string;
  } {
    return {
      response_type: 'ephemeral',
      text: 'ito Slack \uBA85\uB839\uC5B4 \uB3C4\uC6C0\uB9D0',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: ':thread: ito \uBA85\uB839\uC5B4',
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: [
              '`/ito create <\uD0DC\uC2A4\uD06C\uBA85>` — \uC0C8 \uD0DC\uC2A4\uD06C \uC0DD\uC131',
              '`/ito list` — \uB0B4 \uD0DC\uC2A4\uD06C \uBAA9\uB85D',
              '`/ito connect @user` — \uC2E4 \uC5F0\uACB0 (\uC900\uBE44 \uC911)',
              '`/ito resolve` — \uC2E4 \uC644\uB8CC (\uC900\uBE44 \uC911)',
              '`/ito help` — \uB3C4\uC6C0\uB9D0',
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

    const slackUser = await this.prisma.slackUser.findUnique({
      where: {
        slackUserId_slackWorkspaceId: {
          slackUserId,
          slackWorkspaceId: slackWorkspace.id,
        },
      },
      include: { slackWorkspace: true },
    });

    return slackUser;
  }
}
