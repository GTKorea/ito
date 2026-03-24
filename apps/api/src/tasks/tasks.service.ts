import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, Optional, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { RemindersService } from '../reminders/reminders.service';
import { CreateTaskDto, UpdateTaskDto, BatchMoveTasksDto } from './dto/create-task.dto';

/** Shared include for task queries with full thread link details */
const TASK_INCLUDE_FULL = {
  creator: { select: { id: true, name: true, avatarUrl: true } },
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  threadLinks: {
    include: {
      fromUser: { select: { id: true, name: true, avatarUrl: true } },
      toUser: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { chainIndex: 'asc' as const },
  },
  _count: { select: { threadLinks: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
    @Optional() @Inject(forwardRef(() => RemindersService))
    private remindersService?: RemindersService,
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
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
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
    const where: any = { workspaceId };

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
      where.status = filter.status;
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
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        threadLinks: {
          include: {
            fromUser: { select: { id: true, name: true, avatarUrl: true } },
            toUser: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { chainIndex: 'asc' },
        },
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

    const data: any = { ...dto };
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

  async findCategorized(workspaceId: string, userId: string, taskGroupId?: string) {
    const where: any = {
      workspaceId,
      OR: [
          { creatorId: userId },
          { assigneeId: userId },
          { threadLinks: { some: { fromUserId: userId } } },
          { threadLinks: { some: { toUserId: userId } } },
        ],
    };
    if (taskGroupId) {
      where.taskGroupId = taskGroupId;
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

      if (isActive && isAssignee && task.status === 'BLOCKED') {
        // BLOCKED tasks go to waiting (external dependency)
        waiting.push(task);
      } else if (isActive && isAssignee) {
        actionRequired.push(task);
      } else if (isActive && !isAssignee) {
        const isCreator = task.creatorId === userId;
        const hasForwardedLink = task.threadLinks.some(
          (l) =>
            (l.fromUserId === userId || l.toUserId === userId) &&
            l.status === 'FORWARDED',
        );
        if (isCreator || hasForwardedLink) {
          waiting.push(task);
        } else {
          completed.push(task);
        }
      } else {
        completed.push(task);
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

    const baseWhere: any = { workspaceId };
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
    const data: any = {};
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
