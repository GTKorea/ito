import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WsGateway } from '../websocket/ws.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: WsGateway,
    @Optional()
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService?: NotificationsService,
  ) {}

  /**
   * Check if a user is a participant of a task
   * (creator, current assignee, or in any thread link as sender/receiver)
   */
  async isParticipant(taskId: string, userId: string): Promise<boolean> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        creatorId: true,
        assigneeId: true,
        threadLinks: {
          select: { fromUserId: true, toUserId: true },
        },
      },
    });

    if (!task) return false;

    if (task.creatorId === userId || task.assigneeId === userId) return true;

    return task.threadLinks.some(
      (link) => link.fromUserId === userId || link.toUserId === userId,
    );
  }

  /**
   * Get paginated messages for a task (latest first, cursor-based)
   */
  async getMessages(
    taskId: string,
    userId: string,
    cursor?: string,
    limit = 50,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const isAllowed = await this.isParticipant(taskId, userId);
    if (!isAllowed)
      throw new ForbiddenException('Not a participant of this task');

    const messages = await this.prisma.chatMessage.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return {
      messages: items,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Send a message to a task chat
   */
  async sendMessage(taskId: string, userId: string, content: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        creatorId: true,
        assigneeId: true,
        threadLinks: {
          select: { fromUserId: true, toUserId: true },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    const isAllowed = await this.isParticipant(taskId, userId);
    if (!isAllowed)
      throw new ForbiddenException('Not a participant of this task');

    const message = await this.prisma.chatMessage.create({
      data: {
        content,
        taskId,
        senderId: userId,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Broadcast to the task chat room via WebSocket
    this.wsGateway.server
      ?.to(`task-chat:${taskId}`)
      .emit('newMessage', message);

    // Send notifications to other participants
    if (this.notificationsService) {
      const participantIds = new Set<string>();
      if (task.creatorId) participantIds.add(task.creatorId);
      if (task.assigneeId) participantIds.add(task.assigneeId);
      for (const link of task.threadLinks) {
        participantIds.add(link.fromUserId);
        participantIds.add(link.toUserId);
      }
      // Remove sender
      participantIds.delete(userId);

      const senderName = message.sender.name;
      const preview =
        content.length > 50 ? content.slice(0, 50) + '...' : content;

      const notifications = Array.from(participantIds).map((recipientId) =>
        this.notificationsService!.create({
          userId: recipientId,
          type: 'CHAT_MESSAGE',
          title: `${senderName}: ${preview}`,
          body: `New message in "${task.title}"`,
          data: {
            taskId,
            taskTitle: task.title,
            senderName,
            senderUserId: userId,
          },
        }),
      );

      // Fire and forget - don't block message sending
      Promise.allSettled(notifications).catch(() => {});
    }

    return message;
  }
}
