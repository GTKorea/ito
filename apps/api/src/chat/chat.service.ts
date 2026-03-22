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
   * Get paginated top-level messages for a task (latest first, cursor-based)
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
      where: { taskId, parentId: null },
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
        files: {
          select: {
            id: true,
            filename: true,
            url: true,
            size: true,
            mimeType: true,
          },
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
   * Get paginated thread replies for a parent message
   */
  async getThreadReplies(
    taskId: string,
    parentId: string,
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

    const parentMessage = await this.prisma.chatMessage.findUnique({
      where: { id: parentId },
      select: { id: true, taskId: true },
    });
    if (!parentMessage || parentMessage.taskId !== taskId)
      throw new NotFoundException('Parent message not found');

    const messages = await this.prisma.chatMessage.findMany({
      where: { taskId, parentId },
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
        files: {
          select: {
            id: true,
            filename: true,
            url: true,
            size: true,
            mimeType: true,
          },
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
  async sendMessage(
    taskId: string,
    userId: string,
    content: string,
    parentId?: string,
    fileIds?: string[],
  ) {
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

    // Validate parent message if provided
    if (parentId) {
      const parent = await this.prisma.chatMessage.findUnique({
        where: { id: parentId },
        select: { id: true, taskId: true },
      });
      if (!parent || parent.taskId !== taskId)
        throw new NotFoundException('Parent message not found');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        content,
        taskId,
        senderId: userId,
        ...(parentId ? { parentId } : {}),
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
        files: {
          select: {
            id: true,
            filename: true,
            url: true,
            size: true,
            mimeType: true,
          },
        },
      },
    });

    // Attach files if provided
    if (fileIds && fileIds.length > 0) {
      await this.prisma.file.updateMany({
        where: { id: { in: fileIds } },
        data: { chatMessageId: message.id },
      });

      // Refetch files for the response
      const files = await this.prisma.file.findMany({
        where: { chatMessageId: message.id },
        select: {
          id: true,
          filename: true,
          url: true,
          size: true,
          mimeType: true,
        },
      });
      (message as any).files = files;
    }

    // Increment parent's replyCount if this is a thread reply
    if (parentId) {
      await this.prisma.chatMessage.update({
        where: { id: parentId },
        data: { replyCount: { increment: 1 } },
      });

      // Broadcast thread reply
      this.wsGateway.server
        ?.to(`task-chat:${taskId}`)
        .emit('newThreadReply', message);

      // Also notify the thread room
      this.wsGateway.server
        ?.to(`thread:${parentId}`)
        .emit('newThreadReply', message);
    } else {
      // Broadcast top-level message
      this.wsGateway.server
        ?.to(`task-chat:${taskId}`)
        .emit('newMessage', message);
    }

    // Send notifications to other participants
    if (this.notificationsService) {
      const participantIds = new Set<string>();
      if (task.creatorId) participantIds.add(task.creatorId);
      if (task.assigneeId) participantIds.add(task.assigneeId);
      for (const link of task.threadLinks) {
        participantIds.add(link.fromUserId);
        if (link.toUserId) participantIds.add(link.toUserId);
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
          body: parentId
            ? `New reply in thread in "${task.title}"`
            : `New message in "${task.title}"`,
          data: {
            taskId,
            taskTitle: task.title,
            senderName,
            senderUserId: userId,
            ...(parentId ? { parentId } : {}),
          },
        }),
      );

      // Fire and forget - don't block message sending
      Promise.allSettled(notifications).catch(() => {});
    }

    return message;
  }

  /**
   * Upload a file for chat
   */
  async uploadChatFile(
    file: Express.Multer.File,
    taskId: string,
    userId: string,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const isAllowed = await this.isParticipant(taskId, userId);
    if (!isAllowed)
      throw new ForbiddenException('Not a participant of this task');

    const { randomUUID } = await import('crypto');
    const { writeFile, mkdir } = await import('fs/promises');
    const { join, extname } = await import('path');

    const UPLOADS_DIR = join(process.cwd(), 'uploads');
    await mkdir(UPLOADS_DIR, { recursive: true });

    const ext = extname(file.originalname);
    const filename = `${randomUUID()}${ext}`;
    const filepath = join(UPLOADS_DIR, filename);

    await writeFile(filepath, file.buffer);

    return this.prisma.file.create({
      data: {
        filename: file.originalname,
        url: `/uploads/${filename}`,
        size: file.size,
        mimeType: file.mimetype,
        uploaderId: userId,
        taskId,
      },
      select: {
        id: true,
        filename: true,
        url: true,
        size: true,
        mimeType: true,
      },
    });
  }
}
