import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { WsGateway } from '../websocket/ws.gateway';
import { SlackService } from '../slack/slack.service';
import { EmailService } from '../email/email.service';
import { NotificationPreferenceItemDto } from './dto/update-preferences.dto';

const ALL_NOTIFICATION_TYPES = Object.values(NotificationType);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private wsGateway: WsGateway,
    @Optional() @Inject(SlackService) private slackService?: SlackService,
    @Optional() @Inject(EmailService) private emailService?: EmailService,
  ) {}

  async create(data: {
    userId: string;
    type: NotificationType | string;
    title: string;
    body?: string;
    data?: any;
  }) {
    // Check user preferences
    const preference = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_type: {
          userId: data.userId,
          type: data.type as NotificationType,
        },
      },
    });

    // Default: inApp=true, email=false, slack=false
    const inApp = preference?.inApp ?? true;
    const emailEnabled = preference?.email ?? false;
    const slackEnabled = preference?.slack ?? false;
    const slackWebhookUrl = preference?.slackWebhookUrl;

    let notification: any = null;

    // Create in-app notification if enabled
    if (inApp) {
      notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type as NotificationType,
          title: data.title,
          body: data.body,
          data: data.data,
        },
      });

      // Push via WebSocket in real-time
      this.wsGateway.sendToUser(
        data.userId,
        'notification:new',
        notification,
      );
    }

    // Push via Slack DM if connected (existing integration)
    if (this.slackService?.isEnabled()) {
      this.slackService
        .sendNotification(data.userId, {
          type: data.type as string,
          title: data.title,
          data: data.data,
        })
        .catch(() => {
          // Slack notification failures should not affect the main flow
        });
    }

    // Send via Slack webhook if preference enabled and URL set
    if (slackEnabled && slackWebhookUrl) {
      this.sendSlackWebhook(slackWebhookUrl, data.title, data.body).catch(
        () => {
          // Webhook failures should not affect the main flow
        },
      );
    }

    // Send email notification if preference enabled
    if (emailEnabled && this.emailService) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { email: true },
      });
      if (user?.email) {
        this.sendNotificationEmail(user.email, data.title, data.body).catch(
          () => {
            // Email failures should not affect the main flow
          },
        );
      }
    }

    return notification;
  }

  private async sendSlackWebhook(
    webhookUrl: string,
    title: string,
    body?: string,
  ) {
    try {
      const text = body ? `*${title}*\n${body}` : `*${title}*`;
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
    } catch (error) {
      this.logger.error('Failed to send Slack webhook notification', error);
    }
  }

  private async sendNotificationEmail(
    to: string,
    title: string,
    body?: string,
  ) {
    if (!this.emailService) return;
    try {
      // Use Resend directly via the email service's internal resend instance
      // For now, we reuse the invite email pattern with a simple HTML body
      const { Resend } = await import('resend');
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) return;

      const resend = new Resend(apiKey);
      const from = process.env.RESEND_FROM || 'ito <noreply@itothread.com>';
      await resend.emails.send({
        from,
        to,
        subject: `[ito] ${title}`,
        html: `<div style="font-family: sans-serif; color: #333;"><h3>${title}</h3>${body ? `<p>${body}</p>` : ''}<hr/><p style="font-size: 12px; color: #999;">You received this because email notifications are enabled in your ito settings.</p></div>`,
      });
    } catch (error) {
      this.logger.error(`Failed to send notification email to ${to}`, error);
    }
  }

  async findAllForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async getPreferences(userId: string) {
    const existing = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });

    // Return preferences for all types, filling in defaults for missing ones
    return ALL_NOTIFICATION_TYPES.map((type) => {
      const pref = existing.find((p) => p.type === type);
      return {
        type,
        inApp: pref?.inApp ?? true,
        email: pref?.email ?? false,
        slack: pref?.slack ?? false,
        slackWebhookUrl: pref?.slackWebhookUrl ?? null,
      };
    });
  }

  async updatePreferences(
    userId: string,
    preferences: NotificationPreferenceItemDto[],
  ) {
    const results = await Promise.all(
      preferences.map((pref) =>
        this.prisma.notificationPreference.upsert({
          where: {
            userId_type: { userId, type: pref.type },
          },
          create: {
            userId,
            type: pref.type,
            inApp: pref.inApp,
            email: pref.email,
            slack: pref.slack,
            slackWebhookUrl: pref.slackWebhookUrl,
          },
          update: {
            inApp: pref.inApp,
            email: pref.email,
            slack: pref.slack,
            slackWebhookUrl: pref.slackWebhookUrl,
          },
        }),
      ),
    );

    return results;
  }
}
