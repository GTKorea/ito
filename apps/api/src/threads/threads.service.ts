import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const MAX_CHAIN_DEPTH = 20;

@Injectable()
export class ThreadsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Connect a todo to another user via a thread link.
   * The todo's assignee changes to the target user.
   */
  async connect(
    todoId: string,
    fromUserId: string,
    toUserId: string,
    message?: string,
  ) {
    // Prevent self-connection
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot connect a thread to yourself');
    }

    const todo = await this.prisma.todo.findUnique({
      where: { id: todoId },
      include: { threadLinks: { orderBy: { chainIndex: 'asc' } } },
    });

    if (!todo) throw new NotFoundException('Todo not found');

    // Only current assignee can connect to someone else
    if (todo.assigneeId !== fromUserId) {
      throw new ForbiddenException(
        'Only the current assignee can connect this todo',
      );
    }

    // Check circular: target user must not already be in the chain
    const usersInChain = new Set<string>();
    usersInChain.add(todo.creatorId);
    for (const link of todo.threadLinks) {
      usersInChain.add(link.fromUserId);
      usersInChain.add(link.toUserId);
    }
    if (usersInChain.has(toUserId)) {
      throw new BadRequestException(
        'This user is already part of the thread chain',
      );
    }

    // Check max depth
    const nextIndex = todo.threadLinks.length;
    if (nextIndex >= MAX_CHAIN_DEPTH) {
      throw new BadRequestException(
        `Thread chain cannot exceed ${MAX_CHAIN_DEPTH} connections`,
      );
    }

    // Mark current user's status as FORWARDED if they have a pending link
    const currentLink = todo.threadLinks.find(
      (l) => l.toUserId === fromUserId && l.status === 'PENDING',
    );

    const [threadLink] = await this.prisma.$transaction([
      // Create new link
      this.prisma.threadLink.create({
        data: {
          todoId,
          fromUserId,
          toUserId,
          message,
          chainIndex: nextIndex,
        },
        include: {
          fromUser: { select: { id: true, name: true } },
          toUser: { select: { id: true, name: true } },
        },
      }),
      // Update todo assignee and status
      this.prisma.todo.update({
        where: { id: todoId },
        data: { assigneeId: toUserId, status: 'BLOCKED' },
      }),
      // Mark current link as forwarded
      ...(currentLink
        ? [
            this.prisma.threadLink.update({
              where: { id: currentLink.id },
              data: { status: 'FORWARDED' },
            }),
          ]
        : []),
    ]);

    // Notify target user
    await this.notificationsService.create({
      userId: toUserId,
      type: 'THREAD_RECEIVED',
      title: 'New thread connected to you',
      body: message || `${threadLink.fromUser.name} connected a task to you`,
      data: { todoId, threadLinkId: threadLink.id },
    });

    return threadLink;
  }

  /**
   * Resolve the current thread link — snap back to the previous person.
   * The previous person becomes the new assignee and gets notified.
   */
  async resolve(threadLinkId: string, userId: string) {
    const link = await this.prisma.threadLink.findUnique({
      where: { id: threadLinkId },
      include: {
        todo: { include: { threadLinks: { orderBy: { chainIndex: 'asc' } } } },
      },
    });

    if (!link) throw new NotFoundException('Thread link not found');
    if (link.toUserId !== userId) {
      throw new ForbiddenException('Only the recipient can resolve this link');
    }
    if (link.status !== 'PENDING') {
      throw new BadRequestException('This link is not pending');
    }

    // Mark this link as completed
    await this.prisma.threadLink.update({
      where: { id: link.id },
      data: { status: 'COMPLETED', resolvedAt: new Date() },
    });

    // Determine who gets the task back
    const previousUser = link.fromUserId;

    // Check if the previous user's link should be updated back to PENDING
    const previousLink = link.todo.threadLinks.find(
      (l) => l.toUserId === previousUser && l.status === 'FORWARDED',
    );

    if (previousLink) {
      // Snap back: previous person's link becomes PENDING again
      await this.prisma.threadLink.update({
        where: { id: previousLink.id },
        data: { status: 'PENDING' },
      });
    }

    // Update todo assignee to the previous user
    await this.prisma.todo.update({
      where: { id: link.todoId },
      data: {
        assigneeId: previousUser,
        status:
          previousUser === link.todo.creatorId ? 'IN_PROGRESS' : 'BLOCKED',
      },
    });

    // Notify the previous user
    await this.notificationsService.create({
      userId: previousUser,
      type: 'THREAD_SNAPPED',
      title: 'Thread resolved — your turn',
      body: 'A dependency was resolved and the task is back to you',
      data: { todoId: link.todoId, threadLinkId: link.id },
    });

    return { message: 'Thread link resolved', snapBackTo: previousUser };
  }

  /**
   * Get all thread links for a specific todo
   */
  async getChain(todoId: string) {
    return this.prisma.threadLink.findMany({
      where: { todoId },
      include: {
        fromUser: { select: { id: true, name: true, avatarUrl: true } },
        toUser: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { chainIndex: 'asc' },
    });
  }

  /**
   * Get threads connected to/from a user (their "thread inbox/outbox")
   */
  async getMyThreads(userId: string, workspaceId: string) {
    const [incoming, outgoing] = await Promise.all([
      this.prisma.threadLink.findMany({
        where: {
          toUserId: userId,
          status: 'PENDING',
          todo: { workspaceId },
        },
        include: {
          todo: { select: { id: true, title: true, priority: true } },
          fromUser: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.threadLink.findMany({
        where: {
          fromUserId: userId,
          status: { in: ['PENDING', 'FORWARDED'] },
          todo: { workspaceId },
        },
        include: {
          todo: { select: { id: true, title: true, priority: true } },
          toUser: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { incoming, outgoing };
  }
}
