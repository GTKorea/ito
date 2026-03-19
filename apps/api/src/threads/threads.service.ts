import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';

const MAX_CHAIN_DEPTH = 20;

@Injectable()
export class ThreadsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private activityService: ActivityService,
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
        data: { assigneeId: toUserId, status: 'IN_PROGRESS' },
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

    await this.activityService.log({
      workspaceId: todo.workspaceId,
      userId: fromUserId,
      action: 'CONNECTED',
      entityType: 'ThreadLink',
      entityId: threadLink.id,
      metadata: { todoId, toUserId },
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
        status: 'IN_PROGRESS',
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

    await this.activityService.log({
      workspaceId: link.todo.workspaceId,
      userId,
      action: 'RESOLVED',
      entityType: 'ThreadLink',
      entityId: threadLinkId,
      metadata: { todoId: link.todoId },
    });

    return { message: 'Thread link resolved', snapBackTo: previousUser };
  }

  /**
   * Connect a chain of users to a todo in a single transaction.
   * Creates links: creator → userIds[0] → userIds[1] → ... → userIds[N-1]
   * The last user in the chain becomes the assignee.
   */
  async connectChain(
    todoId: string,
    creatorId: string,
    userIds: string[],
  ): Promise<{ todo: any; threadLinks: any[] }> {
    // 1. Validate todo exists and creator is the current assignee
    const todo = await this.prisma.todo.findUnique({
      where: { id: todoId },
      include: { threadLinks: { orderBy: { chainIndex: 'asc' } } },
    });

    if (!todo) throw new NotFoundException('Todo not found');

    if (todo.assigneeId !== creatorId) {
      throw new ForbiddenException(
        'Only the current assignee can connect this todo',
      );
    }

    // 2. Validate no self-connections and no duplicates in the chain
    const allUsers = [creatorId, ...userIds];
    for (let i = 0; i < userIds.length; i++) {
      if (allUsers[i] === userIds[i]) {
        throw new BadRequestException('Cannot connect a thread to yourself');
      }
    }

    // Check for circular connections with existing active chain
    const usersInActiveChain = new Set<string>();
    usersInActiveChain.add(todo.creatorId);
    for (const link of todo.threadLinks) {
      if (link.status === 'PENDING' || link.status === 'FORWARDED') {
        usersInActiveChain.add(link.fromUserId);
        usersInActiveChain.add(link.toUserId);
      }
    }
    for (const userId of userIds) {
      if (usersInActiveChain.has(userId)) {
        throw new BadRequestException(
          'A user in the chain is already part of the active thread chain',
        );
      }
    }

    // Also check for duplicates within the new chain itself
    const newChainSet = new Set<string>();
    for (const userId of userIds) {
      if (newChainSet.has(userId)) {
        throw new BadRequestException(
          'Duplicate user in the chain',
        );
      }
      newChainSet.add(userId);
    }

    // 3. Validate chain depth won't exceed MAX_CHAIN_DEPTH
    const startIndex = todo.threadLinks.length;
    if (startIndex + userIds.length > MAX_CHAIN_DEPTH) {
      throw new BadRequestException(
        `Thread chain cannot exceed ${MAX_CHAIN_DEPTH} connections`,
      );
    }

    // 4. Execute in a single transaction
    const currentLink = todo.threadLinks.find(
      (l) => l.toUserId === creatorId && l.status === 'PENDING',
    );

    const threadLinks: any[] = [];

    const result = await this.prisma.$transaction(async (tx) => {
      // Mark current user's link as FORWARDED if they have a pending link
      if (currentLink) {
        await tx.threadLink.update({
          where: { id: currentLink.id },
          data: { status: 'FORWARDED' },
        });
      }

      let previousUserId = creatorId;

      for (let i = 0; i < userIds.length; i++) {
        const toUserId = userIds[i];
        const isLast = i === userIds.length - 1;

        const link = await tx.threadLink.create({
          data: {
            todoId,
            fromUserId: previousUserId,
            toUserId,
            chainIndex: startIndex + i,
            status: isLast ? 'PENDING' : 'FORWARDED',
          },
          include: {
            fromUser: { select: { id: true, name: true } },
            toUser: { select: { id: true, name: true } },
          },
        });

        threadLinks.push(link);
        previousUserId = toUserId;
      }

      // Set todo assignee to last user in chain
      const lastUserId = userIds[userIds.length - 1];
      const updatedTodo = await tx.todo.update({
        where: { id: todoId },
        data: { assigneeId: lastUserId, status: 'IN_PROGRESS' },
      });

      return updatedTodo;
    });

    // 5. Send THREAD_RECEIVED notification to each user in the chain
    for (const link of threadLinks) {
      await this.notificationsService.create({
        userId: link.toUserId,
        type: 'THREAD_RECEIVED',
        title: 'New thread connected to you',
        body: `${link.fromUser.name} connected a task to you`,
        data: { todoId, threadLinkId: link.id },
      });
    }

    // 6. Log activity
    await this.activityService.log({
      workspaceId: todo.workspaceId,
      userId: creatorId,
      action: 'CONNECTED',
      entityType: 'ThreadLink',
      entityId: threadLinks[0].id,
      metadata: { todoId, chainUserIds: userIds },
    });

    return { todo: result, threadLinks };
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
   * Get a task graph for the current user — all todos where they are
   * creator, assignee, or appear in the thread chain.
   */
  async getTaskGraph(
    userId: string,
    workspaceId: string,
    scope?: string,
    statusFilter?: string[],
    priorityFilter?: string[],
  ) {
    const statusCondition =
      scope === 'active'
        ? { status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] as any[] } }
        : scope === 'completed'
          ? { status: 'COMPLETED' as any }
          : {};

    const extraFilters: any = {};
    if (statusFilter && statusFilter.length > 0) {
      extraFilters.status = { in: statusFilter };
    }
    if (priorityFilter && priorityFilter.length > 0) {
      extraFilters.priority = { in: priorityFilter };
    }

    const todos = await this.prisma.todo.findMany({
      where: {
        workspaceId,
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
          { threadLinks: { some: { fromUserId: userId } } },
          { threadLinks: { some: { toUserId: userId } } },
        ],
        ...statusCondition,
        ...extraFilters,
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        threadLinks: {
          include: {
            fromUser: { select: { id: true, name: true, avatarUrl: true } },
            toUser: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { chainIndex: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Post-process: add myRole for each todo
    return todos.map((todo) => {
      let myRole: 'creator' | 'assignee' | 'chain_member' = 'chain_member';
      if (todo.creatorId === userId) {
        myRole = 'creator';
      } else if (todo.assigneeId === userId) {
        myRole = 'assignee';
      }
      return { ...todo, myRole };
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
          toUser: { select: { id: true, name: true, avatarUrl: true } },
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
          fromUser: { select: { id: true, name: true, avatarUrl: true } },
          toUser: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { incoming, outgoing };
  }
}
