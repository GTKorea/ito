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
        priority: dto.priority as any,
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
    filter?: { assignedToMe?: boolean; status?: string; teamId?: string },
  ) {
    const where: any = { workspaceId };

    if (filter?.assignedToMe) {
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
