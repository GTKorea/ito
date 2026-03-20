import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateTodoDto, UpdateTodoDto } from './dto/create-todo.dto';

@Injectable()
export class TodosService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
  ) {}

  async create(dto: CreateTodoDto, workspaceId: string, userId: string) {
    const todo = await this.prisma.todo.create({
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
      entityType: 'Todo',
      entityId: todo.id,
      metadata: { title: todo.title },
    });

    return todo;
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

    return this.prisma.todo.findMany({
      where,
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
        _count: { select: { threadLinks: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string) {
    const todo = await this.prisma.todo.findUnique({
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
    if (!todo) throw new NotFoundException('Todo not found');
    return todo;
  }

  async update(id: string, dto: UpdateTodoDto, userId: string) {
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo) throw new NotFoundException('Todo not found');
    if (todo.assigneeId !== userId && todo.creatorId !== userId) {
      throw new ForbiddenException('Not authorized to update this todo');
    }

    // Only the current assignee can change the status
    if (dto.status && todo.assigneeId !== userId) {
      throw new ForbiddenException('Only the current assignee can change task status');
    }

    const data: any = { ...dto };
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    if (dto.status === 'COMPLETED') data.completedAt = new Date();

    const updated = await this.prisma.todo.update({
      where: { id },
      data,
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        threadLinks: true,
      },
    });

    await this.activityService.log({
      workspaceId: todo.workspaceId,
      userId,
      action: 'UPDATED',
      entityType: 'Todo',
      entityId: id,
      metadata: { changes: dto },
    });

    return updated;
  }

  async getCalendarTodos(
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
      this.prisma.todo.findMany({
        where: {
          ...baseWhere,
          status: 'COMPLETED',
          completedAt: { gte: startDate, lte: endDate },
        },
        include,
        orderBy: { completedAt: 'asc' },
      }),
      this.prisma.todo.findMany({
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
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo) throw new NotFoundException('Todo not found');
    if (todo.creatorId !== userId) {
      throw new ForbiddenException('Only the creator can delete a todo');
    }

    const deleted = await this.prisma.todo.delete({ where: { id } });

    await this.activityService.log({
      workspaceId: todo.workspaceId,
      userId,
      action: 'DELETED',
      entityType: 'Todo',
      entityId: id,
      metadata: { title: todo.title },
    });

    return deleted;
  }
}
