import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTodoDto, UpdateTodoDto } from './dto/create-todo.dto';

@Injectable()
export class TodosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTodoDto, workspaceId: string, userId: string) {
    return this.prisma.todo.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority as any,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        creatorId: userId,
        assigneeId: userId,
        workspaceId,
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        threadLinks: true,
      },
    });
  }

  async findAllInWorkspace(
    workspaceId: string,
    userId: string,
    filter?: { assignedToMe?: boolean; status?: string },
  ) {
    const where: any = { workspaceId };

    if (filter?.assignedToMe) {
      where.assigneeId = userId;
    }
    if (filter?.status) {
      where.status = filter.status;
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

    return this.prisma.todo.update({
      where: { id },
      data,
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        threadLinks: true,
      },
    });
  }

  async delete(id: string, userId: string) {
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo) throw new NotFoundException('Todo not found');
    if (todo.creatorId !== userId) {
      throw new ForbiddenException('Only the creator can delete a todo');
    }

    return this.prisma.todo.delete({ where: { id } });
  }
}
