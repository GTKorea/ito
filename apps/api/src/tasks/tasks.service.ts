import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';

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
  ) {}

  async create(dto: CreateTaskDto, workspaceId: string, userId: string) {
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        creatorId: userId,
        assigneeId: userId,
        workspaceId,
        teamId: dto.teamId || undefined,
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

  async findCategorized(workspaceId: string, userId: string) {
    const allTasks = await this.prisma.task.findMany({
      where: {
        workspaceId,
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
          { threadLinks: { some: { fromUserId: userId } } },
          { threadLinks: { some: { toUserId: userId } } },
        ],
      },
      include: TASK_INCLUDE_FULL,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    const actionRequired: typeof allTasks = [];
    const waiting: typeof allTasks = [];
    const completed: typeof allTasks = [];

    for (const task of allTasks) {
      const isActive = !['COMPLETED', 'CANCELLED'].includes(task.status);
      const isAssignee = task.assigneeId === userId;

      if (isActive && isAssignee) {
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
}
