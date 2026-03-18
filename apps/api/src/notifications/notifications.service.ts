import { Injectable, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { WsGateway } from '../websocket/ws.gateway';
import { SlackService } from '../slack/slack.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: WsGateway,
    @Optional() @Inject(SlackService) private slackService?: SlackService,
  ) {}

  async create(data: {
    userId: string;
    type: NotificationType | string;
    title: string;
    body?: string;
    data?: any;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as NotificationType,
        title: data.title,
        body: data.body,
        data: data.data,
      },
    });

    // Push via WebSocket in real-time
    this.wsGateway.sendToUser(data.userId, 'notification:new', notification);

    // Push via Slack DM if connected
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

    return notification;
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
}
