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
   * Connect a task to one or more users via thread links.
   * Single user: behaves as before (A → B).
   * Multiple users: creates parallel branches with a shared groupId (A → B, A → C).
   */
  async connect(
    taskId: string,
    fromUserId: string,
    toUserIds: string[],
    message?: string,
  ) {
    if (toUserIds.length === 0) {
      throw new BadRequestException('At least one target user is required');
    }
    if (toUserIds.length > 20) {
      throw new BadRequestException('Cannot connect to more than 20 users at once');
    }

    // Check for duplicates in toUserIds
    const uniqueIds = new Set(toUserIds);
    if (uniqueIds.size !== toUserIds.length) {
      throw new BadRequestException('Duplicate user IDs in the connection list');
    }

    // Prevent self-connection
    for (const toUserId of toUserIds) {
      if (fromUserId === toUserId) {
        throw new BadRequestException('Cannot connect a thread to yourself');
      }
    }

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { threadLinks: { orderBy: { chainIndex: 'asc' } } },
    });

    if (!task) throw new NotFoundException('Task not found');

    // Only current assignee can connect to someone else
    if (task.assigneeId !== fromUserId) {
      throw new ForbiddenException(
        'Only the current assignee can connect this task',
      );
    }

    // Check max depth
    const nextIndex = task.threadLinks.length;
    if (nextIndex + toUserIds.length > MAX_CHAIN_DEPTH) {
      throw new BadRequestException(
        `Thread chain cannot exceed ${MAX_CHAIN_DEPTH} connections`,
      );
    }

    // Check for circular references — no user in toUserIds should be in the active chain
    const usersInActiveChain = new Set<string>();
    for (const link of task.threadLinks) {
      if (link.status === 'PENDING' || link.status === 'FORWARDED') {
        usersInActiveChain.add(link.fromUserId);
        if (link.toUserId) usersInActiveChain.add(link.toUserId);
      }
    }
    // Also add the task creator if they are still part of the active chain
    usersInActiveChain.add(task.creatorId);

    for (const toUserId of toUserIds) {
      if (usersInActiveChain.has(toUserId)) {
        throw new BadRequestException(
          'Cannot connect to a user who is already in the active thread chain',
        );
      }
    }

    // Mark current user's status as FORWARDED if they have a pending link
    const currentLink = task.threadLinks.find(
      (l) => l.toUserId === fromUserId && l.status === 'PENDING',
    );

    const isMulti = toUserIds.length > 1;

    // Generate a groupId for multi-connect
    const groupId = isMulti ? this.generateCuid() : null;

    const threadLinks = await this.prisma.$transaction(async (tx) => {
      // Mark current link as forwarded
      if (currentLink) {
        await tx.threadLink.update({
          where: { id: currentLink.id },
          data: { status: 'FORWARDED' },
        });
      }

      const created = [];
      for (let i = 0; i < toUserIds.length; i++) {
        const link = await tx.threadLink.create({
          data: {
            taskId,
            fromUserId,
            toUserId: toUserIds[i],
            message,
            chainIndex: nextIndex + i,
            groupId,
          },
          include: {
            fromUser: { select: { id: true, name: true } },
            toUser: { select: { id: true, name: true } },
          },
        });
        created.push(link);
      }

      // For multi-connect: keep assignee as the sender (they are waiting for all to complete)
      // For single connect: assign to the target user (original behavior)
      if (isMulti) {
        await tx.task.update({
          where: { id: taskId },
          data: { status: 'IN_PROGRESS' },
        });
      } else {
        await tx.task.update({
          where: { id: taskId },
          data: { assigneeId: toUserIds[0], status: 'IN_PROGRESS' },
        });
      }

      return created;
    });

    // Notify all target users
    for (const link of threadLinks) {
      if (!link.toUserId) continue; // Skip blocker links (no recipient)
      await this.notificationsService.create({
        userId: link.toUserId,
        type: 'THREAD_RECEIVED',
        title: 'New thread connected to you',
        body: message || `${link.fromUser.name} connected a task to you`,
        data: { taskId, threadLinkId: link.id, groupId },
      });
    }

    await this.activityService.log({
      workspaceId: task.workspaceId,
      userId: fromUserId,
      action: 'CONNECTED',
      entityType: 'ThreadLink',
      entityId: threadLinks[0].id,
      metadata: { taskId, toUserIds, groupId },
    });

    // Return single link for backward compat, array for multi
    return isMulti ? threadLinks : threadLinks[0];
  }

  /**
   * Resolve the current thread link — snap back to the previous person.
   * For grouped (parallel) links: only snap back when ALL links in the group are completed.
   */
  async resolve(threadLinkId: string, userId: string) {
    const link = await this.prisma.threadLink.findUnique({
      where: { id: threadLinkId },
      include: {
        task: { include: { threadLinks: { orderBy: { chainIndex: 'asc' } } } },
      },
    });

    if (!link) throw new NotFoundException('Thread link not found');
    if (link.toUserId !== userId) {
      throw new ForbiddenException('Only the recipient can resolve this link');
    }
    if (link.status !== 'PENDING') {
      throw new BadRequestException('This link is not pending');
    }

    const previousUser = link.fromUserId;

    // Check if this is part of a group
    const isGrouped = !!link.groupId;

    await this.prisma.$transaction(async (tx) => {
      // Mark this link as completed
      await tx.threadLink.update({
        where: { id: link.id },
        data: { status: 'COMPLETED', resolvedAt: new Date() },
      });

      if (isGrouped) {
        // Check if all other links in the group are now completed
        const groupLinks = await tx.threadLink.findMany({
          where: { groupId: link.groupId!, id: { not: link.id } },
        });

        const allCompleted = groupLinks.every((l) => l.status === 'COMPLETED');

        if (allCompleted) {
          // All parallel branches done — snap back to the sender
          const previousLink = link.task.threadLinks.find(
            (l) => l.toUserId === previousUser && l.status === 'FORWARDED',
          );

          if (previousLink) {
            await tx.threadLink.update({
              where: { id: previousLink.id },
              data: { status: 'PENDING' },
            });
          }

          await tx.task.update({
            where: { id: link.taskId },
            data: {
              assigneeId: previousUser,
              status: 'IN_PROGRESS',
            },
          });
        }
        // If not all completed, just leave the task as-is — still waiting
      } else {
        // Original single-link resolve logic
        const previousLink = link.task.threadLinks.find(
          (l) => l.toUserId === previousUser && l.status === 'FORWARDED',
        );

        if (previousLink) {
          await tx.threadLink.update({
            where: { id: previousLink.id },
            data: { status: 'PENDING' },
          });
        }

        await tx.task.update({
          where: { id: link.taskId },
          data: {
            assigneeId: previousUser,
            status: 'IN_PROGRESS',
          },
        });
      }
    });

    // Determine notification type based on group completion
    if (isGrouped) {
      const groupLinks = await this.prisma.threadLink.findMany({
        where: { groupId: link.groupId! },
      });
      const allCompleted = groupLinks.every((l) => l.status === 'COMPLETED');

      if (allCompleted) {
        // Notify the sender that all parallel branches are done
        await this.notificationsService.create({
          userId: previousUser,
          type: 'THREAD_SNAPPED',
          title: 'All parallel threads resolved — your turn',
          body: 'All parallel dependencies were resolved and the task is back to you',
          data: { taskId: link.taskId, threadLinkId: link.id, groupId: link.groupId },
        });
      } else {
        // Notify the sender that one branch is done (partial progress)
        const completedCount = groupLinks.filter((l) => l.status === 'COMPLETED').length;
        await this.notificationsService.create({
          userId: previousUser,
          type: 'THREAD_COMPLETED',
          title: 'A parallel thread was resolved',
          body: `${completedCount}/${groupLinks.length} parallel threads completed`,
          data: { taskId: link.taskId, threadLinkId: link.id, groupId: link.groupId },
        });
      }
    } else {
      // Original notification
      await this.notificationsService.create({
        userId: previousUser,
        type: 'THREAD_SNAPPED',
        title: 'Thread resolved — your turn',
        body: 'A dependency was resolved and the task is back to you',
        data: { taskId: link.taskId, threadLinkId: link.id },
      });
    }

    await this.activityService.log({
      workspaceId: link.task.workspaceId,
      userId,
      action: 'RESOLVED',
      entityType: 'ThreadLink',
      entityId: threadLinkId,
      metadata: { taskId: link.taskId, groupId: link.groupId },
    });

    return { message: 'Thread link resolved', snapBackTo: previousUser, groupId: link.groupId };
  }

  /**
   * Decline a thread link — reject the task and snap back to sender.
   */
  async decline(threadLinkId: string, userId: string, reason?: string) {
    const link = await this.prisma.threadLink.findUnique({
      where: { id: threadLinkId },
      include: { task: true },
    });

    if (!link) throw new NotFoundException('Thread link not found');
    if (link.toUserId !== userId) {
      throw new ForbiddenException('Only the recipient can decline');
    }
    if (link.status !== 'PENDING') {
      throw new BadRequestException('Only pending links can be declined');
    }

    return this.prisma.$transaction(async (tx) => {
      // Cancel the current link
      await tx.threadLink.update({
        where: { id: threadLinkId },
        data: { status: 'CANCELLED' },
      });

      // Find previous forwarded link (same task, fromUserId of this link as toUserId, status FORWARDED)
      const prevLink = await tx.threadLink.findFirst({
        where: {
          taskId: link.taskId,
          toUserId: link.fromUserId,
          status: 'FORWARDED',
        },
      });

      if (prevLink) {
        await tx.threadLink.update({
          where: { id: prevLink.id },
          data: { status: 'PENDING' },
        });
      }

      // Update task assignee back to fromUser
      await tx.task.update({
        where: { id: link.taskId },
        data: { assigneeId: link.fromUserId },
      });

      // Send notification to the sender
      await this.notificationsService.create({
        userId: link.fromUserId,
        type: 'THREAD_DECLINED',
        title: 'Thread declined',
        body: reason
          ? `Your thread was declined: ${reason}`
          : 'Your thread was declined',
        data: {
          taskId: link.taskId,
          taskTitle: link.task.title,
          declinedBy: userId,
          reason: reason || null,
        },
      });

      // Log activity
      await this.activityService.log({
        workspaceId: link.task.workspaceId,
        userId,
        action: 'DECLINED',
        entityType: 'ThreadLink',
        entityId: threadLinkId,
        metadata: { taskId: link.taskId, reason },
      });

      return { success: true };
    });
  }

  /**
   * Get all thread links in a group.
   */
  async getGroupLinks(groupId: string) {
    const links = await this.prisma.threadLink.findMany({
      where: { groupId },
      include: {
        fromUser: { select: { id: true, name: true, avatarUrl: true } },
        toUser: { select: { id: true, name: true, avatarUrl: true } },
        task: { select: { id: true, title: true, status: true } },
      },
      orderBy: { chainIndex: 'asc' },
    });

    if (links.length === 0) {
      throw new NotFoundException('Group not found');
    }

    const completedCount = links.filter((l) => l.status === 'COMPLETED').length;

    return {
      groupId,
      links,
      total: links.length,
      completed: completedCount,
      allCompleted: completedCount === links.length,
    };
  }

  /**
   * Connect a chain of users to a task in a single transaction.
   * Creates links: creator → userIds[0] → userIds[1] → ... → userIds[N-1]
   * The last user in the chain becomes the assignee.
   */
  async connectChain(
    taskId: string,
    creatorId: string,
    userIds: string[],
  ): Promise<{ task: any; threadLinks: any[] }> {
    // 1. Validate task exists and creator is the current assignee
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { threadLinks: { orderBy: { chainIndex: 'asc' } } },
    });

    if (!task) throw new NotFoundException('Task not found');

    if (task.assigneeId !== creatorId) {
      throw new ForbiddenException(
        'Only the current assignee can connect this task',
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
    usersInActiveChain.add(task.creatorId);
    for (const link of task.threadLinks) {
      if (link.status === 'PENDING' || link.status === 'FORWARDED') {
        usersInActiveChain.add(link.fromUserId);
        if (link.toUserId) usersInActiveChain.add(link.toUserId);
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
    const startIndex = task.threadLinks.length;
    if (startIndex + userIds.length > MAX_CHAIN_DEPTH) {
      throw new BadRequestException(
        `Thread chain cannot exceed ${MAX_CHAIN_DEPTH} connections`,
      );
    }

    // 4. Execute in a single transaction
    const currentLink = task.threadLinks.find(
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
            taskId,
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

      // Set task assignee to last user in chain
      const lastUserId = userIds[userIds.length - 1];
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: { assigneeId: lastUserId, status: 'IN_PROGRESS' },
      });

      return updatedTask;
    });

    // 5. Send THREAD_RECEIVED notification to each user in the chain
    for (const link of threadLinks) {
      await this.notificationsService.create({
        userId: link.toUserId,
        type: 'THREAD_RECEIVED',
        title: 'New thread connected to you',
        body: `${link.fromUser.name} connected a task to you`,
        data: { taskId, threadLinkId: link.id },
      });
    }

    // 6. Log activity
    await this.activityService.log({
      workspaceId: task.workspaceId,
      userId: creatorId,
      action: 'CONNECTED',
      entityType: 'ThreadLink',
      entityId: threadLinks[0].id,
      metadata: { taskId, chainUserIds: userIds },
    });

    return { task: result, threadLinks };
  }

  /**
   * Get all thread links for a specific task
   */
  async getChain(taskId: string) {
    return this.prisma.threadLink.findMany({
      where: { taskId },
      include: {
        fromUser: { select: { id: true, name: true, avatarUrl: true } },
        toUser: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { chainIndex: 'asc' },
    });
  }

  /**
   * Get a task graph for the current user — all tasks where they are
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
        ? { status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] as const } }
        : scope === 'completed'
          ? { status: 'COMPLETED' as const }
          : {};

    const extraFilters: any = {};
    if (statusFilter && statusFilter.length > 0) {
      extraFilters.status = { in: statusFilter };
    }
    if (priorityFilter && priorityFilter.length > 0) {
      extraFilters.priority = { in: priorityFilter };
    }

    const tasks = await this.prisma.task.findMany({
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

    // Post-process: add myRole for each task
    return tasks.map((task) => {
      let myRole: 'creator' | 'assignee' | 'chain_member' = 'chain_member';
      if (task.creatorId === userId) {
        myRole = 'creator';
      } else if (task.assigneeId === userId) {
        myRole = 'assignee';
      }
      return { ...task, myRole };
    });
  }

  /**
   * Connect a blocker (external dependency) to a task.
   * The task becomes BLOCKED and the creator can self-resolve when the blocker is cleared.
   */
  async connectBlocker(
    taskId: string,
    fromUserId: string,
    blockerNote: string,
  ) {
    if (!blockerNote || blockerNote.trim().length === 0) {
      throw new BadRequestException('Blocker note is required');
    }

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { threadLinks: { orderBy: { chainIndex: 'asc' } } },
    });

    if (!task) throw new NotFoundException('Task not found');

    if (task.assigneeId !== fromUserId) {
      throw new ForbiddenException(
        'Only the current assignee can add a blocker',
      );
    }

    const nextIndex = task.threadLinks.length;
    if (nextIndex >= MAX_CHAIN_DEPTH) {
      throw new BadRequestException(
        `Thread chain cannot exceed ${MAX_CHAIN_DEPTH} connections`,
      );
    }

    // Mark current user's pending link as FORWARDED if exists
    const currentLink = task.threadLinks.find(
      (l) => l.toUserId === fromUserId && l.status === 'PENDING',
    );

    const threadLink = await this.prisma.$transaction(async (tx) => {
      if (currentLink) {
        await tx.threadLink.update({
          where: { id: currentLink.id },
          data: { status: 'FORWARDED' },
        });
      }

      const link = await tx.threadLink.create({
        data: {
          taskId,
          fromUserId,
          toUserId: null,
          type: 'BLOCKER',
          blockerNote: blockerNote.trim(),
          chainIndex: nextIndex,
          status: 'PENDING',
        },
        include: {
          fromUser: { select: { id: true, name: true } },
        },
      });

      // Mark task as BLOCKED
      await tx.task.update({
        where: { id: taskId },
        data: { status: 'BLOCKED' },
      });

      return link;
    });

    await this.activityService.log({
      workspaceId: task.workspaceId,
      userId: fromUserId,
      action: 'BLOCKED',
      entityType: 'ThreadLink',
      entityId: threadLink.id,
      metadata: { taskId, blockerNote: blockerNote.trim() },
    });

    return threadLink;
  }

  /**
   * Resolve a blocker — the creator self-resolves when the external dependency is cleared.
   */
  async resolveBlocker(threadLinkId: string, userId: string) {
    const link = await this.prisma.threadLink.findUnique({
      where: { id: threadLinkId },
      include: {
        task: { include: { threadLinks: { orderBy: { chainIndex: 'asc' } } } },
      },
    });

    if (!link) throw new NotFoundException('Thread link not found');
    if (link.type !== 'BLOCKER') {
      throw new BadRequestException('This link is not a blocker');
    }
    if (link.fromUserId !== userId) {
      throw new ForbiddenException('Only the blocker creator can resolve it');
    }
    if (link.status !== 'PENDING') {
      throw new BadRequestException('This blocker is not pending');
    }

    await this.prisma.$transaction(async (tx) => {
      // Mark blocker as completed
      await tx.threadLink.update({
        where: { id: link.id },
        data: { status: 'COMPLETED', resolvedAt: new Date() },
      });

      // Restore previous forwarded link if exists
      const previousLink = link.task.threadLinks.find(
        (l) => l.toUserId === userId && l.status === 'FORWARDED',
      );
      if (previousLink) {
        await tx.threadLink.update({
          where: { id: previousLink.id },
          data: { status: 'PENDING' },
        });
      }

      // Restore task to IN_PROGRESS
      await tx.task.update({
        where: { id: link.taskId },
        data: { status: 'IN_PROGRESS' },
      });
    });

    await this.activityService.log({
      workspaceId: link.task.workspaceId,
      userId,
      action: 'RESOLVED',
      entityType: 'ThreadLink',
      entityId: threadLinkId,
      metadata: { taskId: link.taskId, blockerNote: link.blockerNote },
    });

    return { message: 'Blocker resolved' };
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
          task: { workspaceId },
        },
        include: {
          task: { select: { id: true, title: true, priority: true } },
          fromUser: { select: { id: true, name: true, avatarUrl: true } },
          toUser: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.threadLink.findMany({
        where: {
          fromUserId: userId,
          status: { in: ['PENDING', 'FORWARDED'] },
          task: { workspaceId },
        },
        include: {
          task: { select: { id: true, title: true, priority: true } },
          fromUser: { select: { id: true, name: true, avatarUrl: true } },
          toUser: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { incoming, outgoing };
  }

  /**
   * Pull a specific thread link — nudge the recipient to respond.
   * Only the sender (fromUser) of a PENDING PERSON link can pull.
   * 5-minute cooldown between pulls.
   */
  async pullThread(threadLinkId: string, userId: string) {
    const link = await this.prisma.threadLink.findUnique({
      where: { id: threadLinkId },
      include: {
        task: true,
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });

    if (!link) throw new NotFoundException('Thread link not found');
    if (link.fromUserId !== userId) {
      throw new ForbiddenException('Only the sender can pull this thread');
    }
    if (link.status !== 'PENDING') {
      throw new BadRequestException('Can only pull pending thread links');
    }
    if (link.type !== 'PERSON') {
      throw new BadRequestException('Can only pull person-type thread links');
    }

    // Check 5-minute cooldown
    if (link.lastPulledAt) {
      const cooldownMs = 5 * 60 * 1000;
      const elapsed = Date.now() - new Date(link.lastPulledAt).getTime();
      if (elapsed < cooldownMs) {
        throw new BadRequestException('Please wait before pulling again');
      }
    }

    await this.prisma.threadLink.update({
      where: { id: threadLinkId },
      data: { lastPulledAt: new Date() },
    });

    if (link.toUserId) {
      await this.notificationsService.create({
        userId: link.toUserId,
        type: 'THREAD_PULLED',
        title: `${link.fromUser.name}님이 실을 당겼습니다`,
        body: `"${link.task.title}" 태스크를 확인해주세요`,
        data: {
          taskId: link.taskId,
          taskTitle: link.task.title,
          pullerName: link.fromUser.name,
          pullerUserId: link.fromUserId,
        },
      });
    }

    return { success: true };
  }

  /**
   * Pull the current assignee of a task — nudge them to respond.
   * Only the task creator can pull. 5-minute cooldown.
   */
  async pullCurrentAssignee(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.creatorId !== userId) {
      throw new ForbiddenException('Only the task creator can pull the assignee');
    }
    if (task.assigneeId === userId) {
      throw new BadRequestException('Cannot pull yourself');
    }

    // Check 5-minute cooldown
    if (task.lastPulledAt) {
      const cooldownMs = 5 * 60 * 1000;
      const elapsed = Date.now() - new Date(task.lastPulledAt).getTime();
      if (elapsed < cooldownMs) {
        throw new BadRequestException('Please wait before pulling again');
      }
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: { lastPulledAt: new Date() },
    });

    await this.notificationsService.create({
      userId: task.assigneeId,
      type: 'THREAD_PULLED',
      title: `${task.creator.name}님이 실을 당겼습니다`,
      body: `"${task.title}" 태스크를 확인해주세요`,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        pullerName: task.creator.name,
        pullerUserId: task.creatorId,
      },
    });

    return { success: true };
  }

  /**
   * Generate a simple cuid-like unique identifier for grouping.
   */
  private generateCuid(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `grp_${timestamp}${random}`;
  }
}
