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
   * Check if a user is a participant of a todo
   * (creator, current assignee, or in any thread link as sender/receiver)
   */
  async isParticipant(todoId: string, userId: string): Promise<boolean> {
    const todo = await this.prisma.todo.findUnique({
      where: { id: todoId },
      select: {
        creatorId: true,
        assigneeId: true,
        threadLinks: {
          select: { fromUserId: true, toUserId: true },
        },
      },
    });

    if (!todo) return false;

    if (todo.creatorId === userId || todo.assigneeId === userId) return true;

    return todo.threadLinks.some(
      (link) => link.fromUserId === userId || link.toUserId === userId,
    );
  }

  /**
   * Get paginated messages for a todo (latest first, cursor-based)
   */
  async getMessages(
    todoId: string,
    userId: string,
    cursor?: string,
    limit = 50,
  ) {
    const todo = await this.prisma.todo.findUnique({
      where: { id: todoId },
      select: { id: true },
    });
    if (!todo) throw new NotFoundException('Todo not found');

    const isAllowed = await this.isParticipant(todoId, userId);
    if (!isAllowed)
      throw new ForbiddenException('Not a participant of this todo');

    const messages = await this.prisma.chatMessage.findMany({
      where: { todoId },
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
   * Send a message to a todo chat
   */
  async sendMessage(todoId: string, userId: string, content: string) {
    const todo = await this.prisma.todo.findUnique({
      where: { id: todoId },
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
    if (!todo) throw new NotFoundException('Todo not found');

    const isAllowed = await this.isParticipant(todoId, userId);
    if (!isAllowed)
      throw new ForbiddenException('Not a participant of this todo');

    const message = await this.prisma.chatMessage.create({
      data: {
        content,
        todoId,
        senderId: userId,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Broadcast to the todo chat room via WebSocket
    this.wsGateway.server
      ?.to(`todo-chat:${todoId}`)
      .emit('newMessage', message);

    // Send notifications to other participants
    if (this.notificationsService) {
      const participantIds = new Set<string>();
      if (todo.creatorId) participantIds.add(todo.creatorId);
      if (todo.assigneeId) participantIds.add(todo.assigneeId);
      for (const link of todo.threadLinks) {
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
          body: `New message in "${todo.title}"`,
          data: {
            todoId,
            todoTitle: todo.title,
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
