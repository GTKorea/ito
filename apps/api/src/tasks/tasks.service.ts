import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, Optional, forwardRef } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { RemindersService } from '../reminders/reminders.service';
import type { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto, UpdateTaskDto, BatchMoveTasksDto } from './dto/create-task.dto';

/** Shared include for task queries with full thread link details */
const TASK_INCLUDE_FULL = {
  creator: { select: { id: true, name: true, avatarUrl: true } },
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  taskGroup: { select: { id: true, name: true } },
  coCreators: {
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  completionWatchers: {
    include: { watcher: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  threadLinks: {
    include: {
      fromUser: { select: { id: true, name: true, avatarUrl: true } },
      toUser: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { chainIndex: 'asc' as const },
  },
  _count: { select: { threadLinks: true, files: true, chatMessages: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
    @Optional() @Inject(forwardRef(() => RemindersService))
    private remindersService?: RemindersService,
    @Optional() @Inject(forwardRef(() => require('../notifications/notifications.service').NotificationsService))
    private notificationsService?: NotificationsService,
  ) {}

  async create(dto: CreateTaskDto, workspaceId: string, userId: string) {
    // Get max order in workspace to place new task at the bottom
    const maxOrder = await this.prisma.task.aggregate({
      where: { workspaceId },
      _max: { order: true },
    });
    const newOrder = (maxOrder._max.order ?? -1) + 1;

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        creatorId: userId,
        assigneeId: userId,
        workspaceId,
        type: dto.type || undefined,
        voteConfig: dto.voteConfig || undefined,
        teamId: dto.teamId || undefined,
        taskGroupId: dto.taskGroupId || undefined,
        order: newOrder,
        ...(dto.coCreatorIds && dto.coCreatorIds.length > 0
          ? {
              coCreators: {
                create: dto.coCreatorIds
                  .filter((id) => id !== userId)
                  .map((id) => ({ userId: id })),
              },
            }
          : {}),
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        coCreators: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        threadLinks: true,
      },
    });

    await this.activityService.log({
      workspaceId,
      userId,
      action: 'CREATED',
      entityType: 'Task',
      entityId: task.id,
      metadata: { title: task.title },
    });

    return task;
  }

  async findAllInWorkspace(
    workspaceId: string,
    userId: string,
    filter?: {
      assignedToMe?: boolean;
      connectedByMe?: boolean;
      status?: string;
      teamId?: string;
    },
  ) {
    const where: Prisma.TaskWhereInput = { workspaceId };

    if (filter?.connectedByMe) {
      // Tasks I created and connected to others (they are currently working on it)
      where.creatorId = userId;
      where.assigneeId = { not: userId };
      where.threadLinks = {
        some: {
          fromUserId: userId,
          status: { in: ['PENDING', 'FORWARDED'] },
        },
      };
    } else if (filter?.assignedToMe) {
      where.assigneeId = userId;
    }
    if (filter?.status) {
      where.status = filter.status as TaskStatus;
    }
    if (filter?.teamId) {
      where.teamId = filter.teamId;
    }

    return this.prisma.task.findMany({
      where,
      include: TASK_INCLUDE_FULL,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        ...TASK_INCLUDE_FULL,
        files: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.assigneeId !== userId && task.creatorId !== userId) {
      throw new ForbiddenException('Not authorized to update this task');
    }

    // Only the current assignee can change the status
    if (dto.status && task.assigneeId !== userId) {
      throw new ForbiddenException('Only the current assignee can change task status');
    }

    // Cannot revert a completed task
    if (task.status === 'COMPLETED' && dto.status && dto.status !== 'COMPLETED') {
      throw new ForbiddenException('Cannot revert a completed task');
    }

    const data: Prisma.TaskUpdateInput = { ...dto };
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    if (dto.status === 'COMPLETED') data.completedAt = new Date();

    const updated = await this.prisma.task.update({
      where: { id },
      data,
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        threadLinks: true,
      },
    });

    // Cancel reminders when task is completed or cancelled
    if (dto.status === 'COMPLETED' || dto.status === 'CANCELLED') {
      if (this.remindersService) {
        await this.remindersService.cancelTaskReminders(id);
      }
    }

    // Notify completion watchers when task is completed
    if (dto.status === 'COMPLETED' && this.notificationsService) {
      const watchers = await this.prisma.taskCompletionWatcher.findMany({
        where: { taskId: id },
        select: { watcherId: true },
      });
      for (const w of watchers) {
        await this.notificationsService.create({
          userId: w.watcherId,
          type: 'TASK_COMPLETED',
          title: `"${task.title}" completed`,
          body: `Task "${task.title}" has been marked as completed`,
          data: { taskId: id, taskTitle: task.title },
        });
      }
    }

    await this.activityService.log({
      workspaceId: task.workspaceId,
      userId,
      action: 'UPDATED',
      entityType: 'Task',
      entityId: id,
      metadata: { changes: dto },
    });

    return updated;
  }

  async transferTask(taskId: string, newOwnerId: string, requestingUserId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { threadLinks: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.creatorId !== requestingUserId) {
      throw new ForbiddenException('Only the creator can transfer a task');
    }
    if (newOwnerId === requestingUserId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }
    const hasActiveThreads = task.threadLinks.some(
      (l) => l.status === 'PENDING' || l.status === 'FORWARDED',
    );
    if (hasActiveThreads) {
      throw new ForbiddenException('Cannot transfer a task with active thread connections');
    }

    // Remove new owner from co-creators if they were one
    await this.prisma.taskCoCreator.deleteMany({
      where: { taskId, userId: newOwnerId },
    });

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { creatorId: newOwnerId, assigneeId: newOwnerId },
      include: TASK_INCLUDE_FULL,
    });

    await this.activityService.log({
      workspaceId: task.workspaceId,
      userId: requestingUserId,
      action: 'TRANSFERRED',
      entityType: 'Task',
      entityId: taskId,
      metadata: { newOwnerId },
    });

    return updated;
  }

  async findCategorized(workspaceId: string, userId: string, taskGroupId?: string, memberIds?: string[]) {
    const where: Prisma.TaskWhereInput = {
      workspaceId,
    };

    if (taskGroupId) {
      // Group view: show all tasks in the group
      where.taskGroupId = taskGroupId;
      // If member filter is active, narrow down to those members' tasks
      if (memberIds && memberIds.length > 0) {
        where.OR = memberIds.flatMap((mid) => [
          { creatorId: mid },
          { assigneeId: mid },
          { coCreators: { some: { userId: mid } } },
          { threadLinks: { some: { fromUserId: mid } } },
          { threadLinks: { some: { toUserId: mid } } },
        ]);
      }
    } else {
      // All Tasks view: tasks user is involved in + tasks from user's groups
      const userGroupIds = await this.prisma.taskGroupMember.findMany({
        where: { userId, taskGroup: { workspaceId } },
        select: { taskGroupId: true },
      });
      const groupIds = userGroupIds.map((g) => g.taskGroupId);

      if (memberIds && memberIds.length > 0) {
        where.OR = [
          ...memberIds.flatMap((mid) => [
            { creatorId: mid },
            { assigneeId: mid },
            { coCreators: { some: { userId: mid } } },
            { threadLinks: { some: { fromUserId: mid } } },
            { threadLinks: { some: { toUserId: mid } } },
          ]),
          ...(groupIds.length > 0 ? [{ taskGroupId: { in: groupIds } }] : []),
        ];
      } else {
        where.OR = [
          { creatorId: userId },
          { assigneeId: userId },
          { coCreators: { some: { userId } } },
          { threadLinks: { some: { fromUserId: userId } } },
          { threadLinks: { some: { toUserId: userId } } },
          ...(groupIds.length > 0 ? [{ taskGroupId: { in: groupIds } }] : []),
        ];
      }
    }
    const allTasks = await this.prisma.task.findMany({
      where,
      include: TASK_INCLUDE_FULL,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    const actionRequired: typeof allTasks = [];
    const waiting: typeof allTasks = [];
    const completed: typeof allTasks = [];

    for (const task of allTasks) {
      const isActive = !['COMPLETED', 'CANCELLED'].includes(task.status);
      const isAssignee = task.assigneeId === userId;
      const isCreator = task.creatorId === userId;
      const isCoCreator = task.coCreators?.some((cc) => cc.userId === userId) ?? false;

      if (!isActive) {
        completed.push(task);
      } else if (isAssignee && task.status === 'BLOCKED') {
        waiting.push(task);
      } else if (isAssignee) {
        actionRequired.push(task);
      } else if (isCreator) {
        // Creator but not assignee: task has been forwarded to someone else
        const hasActiveForward = task.threadLinks.some(
          (l) => l.fromUserId === userId && (l.status === 'PENDING' || l.status === 'FORWARDED'),
        );
        if (hasActiveForward) {
          waiting.push(task);
        } else {
          actionRequired.push(task);
        }
      } else if (isCoCreator) {
        // Co-creator: sees the task like the creator does
        const hasActiveForward = task.threadLinks.some(
          (l) => l.status === 'PENDING' || l.status === 'FORWARDED',
        );
        if (hasActiveForward) {
          waiting.push(task);
        } else {
          actionRequired.push(task);
        }
      } else if (taskGroupId) {
        // Group view: group member sees other people's active tasks in action required
        actionRequired.push(task);
      } else {
        // All Tasks view: tasks from groups where user is not directly involved
        waiting.push(task);
      }
    }

    return { actionRequired, waiting, completed };
  }

  async getCalendarTasks(
    workspaceId: string,
    start: string,
    end: string,
    userId?: string,
  ) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const baseWhere: Prisma.TaskWhereInput = { workspaceId };
    if (userId) {
      baseWhere.assigneeId = userId;
    }

    const include = {
      creator: { select: { id: true, name: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
    };

    const [completed, upcoming] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          ...baseWhere,
          status: 'COMPLETED',
          completedAt: { gte: startDate, lte: endDate },
        },
        include,
        orderBy: { completedAt: 'asc' },
      }),
      this.prisma.task.findMany({
        where: {
          ...baseWhere,
          dueDate: { gte: startDate, lte: endDate },
          status: { not: 'COMPLETED' },
        },
        include,
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    return { completed, upcoming };
  }

  async delete(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.creatorId !== userId) {
      throw new ForbiddenException('Only the creator can delete a task');
    }

    const deleted = await this.prisma.task.delete({ where: { id } });

    await this.activityService.log({
      workspaceId: task.workspaceId,
      userId,
      action: 'DELETED',
      entityType: 'Task',
      entityId: id,
      metadata: { title: task.title },
    });

    return deleted;
  }

  async addCoCreators(taskId: string, userIds: string[], requestingUserId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.creatorId !== requestingUserId) {
      throw new ForbiddenException('Only the creator (SuperCreator) can manage co-creators');
    }
    const filteredIds = userIds.filter((id) => id !== task.creatorId);
    if (filteredIds.length > 0) {
      await this.prisma.taskCoCreator.createMany({
        data: filteredIds.map((userId) => ({ taskId, userId })),
        skipDuplicates: true,
      });
    }
    return this.findById(taskId);
  }

  async removeCoCreator(taskId: string, coCreatorUserId: string, requestingUserId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.creatorId !== requestingUserId) {
      throw new ForbiddenException('Only the creator (SuperCreator) can manage co-creators');
    }
    await this.prisma.taskCoCreator.deleteMany({
      where: { taskId, userId: coCreatorUserId },
    });
    return this.findById(taskId);
  }

  async addCompletionWatchers(
    taskId: string,
    input: { userIds?: string[]; teamId?: string },
    addedByUserId: string,
    threadLinkId?: string,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { threadLinks: { where: { status: { in: ['PENDING', 'FORWARDED'] } } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    // Resolve user IDs (from direct IDs + team members)
    let watcherIds: string[] = [...(input.userIds || [])];
    if (input.teamId) {
      const teamMembers = await this.prisma.teamMember.findMany({
        where: { teamId: input.teamId },
        select: { userId: true },
      });
      watcherIds.push(...teamMembers.map((m) => m.userId));
    }

    // Exclude: the adder themselves, and the snap-back target (previous person in chain)
    const excludeIds = new Set<string>([addedByUserId]);
    for (const link of task.threadLinks) {
      if (link.toUserId && link.fromUserId) {
        // fromUser will get snap-back notification automatically
        excludeIds.add(link.fromUserId);
      }
    }
    watcherIds = [...new Set(watcherIds)].filter((id) => !excludeIds.has(id));

    if (watcherIds.length > 0) {
      await this.prisma.taskCompletionWatcher.createMany({
        data: watcherIds.map((watcherId) => ({
          taskId,
          watcherId,
          addedById: addedByUserId,
          threadLinkId: threadLinkId || null,
        })),
        skipDuplicates: true,
      });
    }

    return this.findById(taskId);
  }

  async removeCompletionWatcher(taskId: string, watcherId: string, requestingUserId: string) {
    await this.prisma.taskCompletionWatcher.deleteMany({
      where: { taskId, watcherId, addedById: requestingUserId },
    });
    return this.findById(taskId);
  }

  async reorderTasks(workspaceId: string, userId: string, taskIds: string[]) {
    // Verify all tasks belong to this workspace
    const tasks = await this.prisma.task.findMany({
      where: { id: { in: taskIds }, workspaceId },
      select: { id: true },
    });
    if (tasks.length !== taskIds.length) {
      throw new BadRequestException('Some tasks do not belong to this workspace');
    }

    // Update order for each task in a transaction
    await this.prisma.$transaction(
      taskIds.map((id, index) =>
        this.prisma.task.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return { success: true };
  }

  async batchMoveCheck(userId: string, dto: BatchMoveTasksDto) {
    const tasks = await this.prisma.task.findMany({
      where: { id: { in: dto.taskIds } },
      include: {
        ...TASK_INCLUDE_FULL,
        workspace: { select: { id: true, name: true } },
      },
    });

    if (tasks.length === 0) {
      throw new NotFoundException('No tasks found');
    }

    // Check user is member of target workspace
    if (dto.workspaceId) {
      const membership = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId: dto.workspaceId, userId },
        },
      });
      if (!membership) {
        throw new ForbiddenException('You are not a member of the target workspace');
      }
    }

    // Check target group belongs to target workspace
    if (dto.taskGroupId) {
      const targetWorkspaceId = dto.workspaceId || tasks[0]?.workspaceId;
      const group = await this.prisma.taskGroup.findFirst({
        where: { id: dto.taskGroupId, workspaceId: targetWorkspaceId },
      });
      if (!group) {
        throw new BadRequestException('Target group does not belong to the target workspace');
      }
    }

    const movable: typeof tasks = [];
    const blocked: { task: typeof tasks[0]; reason: string }[] = [];

    for (const task of tasks) {
      // Check for active thread chains
      const hasActiveChain = task.threadLinks.some(
        (l) => l.status === 'PENDING' || l.status === 'FORWARDED',
      );
      if (hasActiveChain) {
        blocked.push({ task, reason: 'ACTIVE_CHAIN' });
        continue;
      }

      // Check assignee is member of target workspace (only for cross-workspace moves)
      if (dto.workspaceId && dto.workspaceId !== task.workspaceId) {
        const assigneeMembership = await this.prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId: dto.workspaceId, userId: task.assigneeId },
          },
        });
        if (!assigneeMembership) {
          blocked.push({ task, reason: 'ASSIGNEE_NOT_MEMBER' });
          continue;
        }
      }

      movable.push(task);
    }

    return { movable, blocked };
  }

  async batchMoveExecute(userId: string, dto: BatchMoveTasksDto) {
    const { movable } = await this.batchMoveCheck(userId, dto);

    if (movable.length === 0) {
      throw new BadRequestException('No tasks can be moved');
    }

    const movableIds = movable.map((t) => t.id);
    const data: Prisma.TaskUpdateManyMutationInput & Prisma.TaskUncheckedUpdateManyInput = {};
    if (dto.workspaceId) data.workspaceId = dto.workspaceId;
    if (dto.taskGroupId !== undefined) data.taskGroupId = dto.taskGroupId || null;

    await this.prisma.task.updateMany({
      where: { id: { in: movableIds } },
      data,
    });

    // Log activity for each moved task
    for (const task of movable) {
      await this.activityService.log({
        workspaceId: dto.workspaceId || task.workspaceId,
        userId,
        action: 'UPDATED',
        entityType: 'Task',
        entityId: task.id,
        metadata: { moved: true, targetWorkspaceId: dto.workspaceId, targetGroupId: dto.taskGroupId },
      });
    }

    return { moved: movableIds.length };
  }
}
