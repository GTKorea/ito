import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationQueryDto, AdminTodoQueryDto } from './dto/admin-query.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ──────────── Dashboard Stats ────────────

  async getStats() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalWorkspaces,
      totalTodos,
      totalThreads,
      activeUsers,
      todosByStatus,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.workspace.count(),
      this.prisma.todo.count(),
      this.prisma.threadLink.count(),
      this.prisma.user.count({
        where: {
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.todo.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const item of todosByStatus) {
      statusCounts[item.status] = item._count.status;
    }

    return {
      totalUsers,
      totalWorkspaces,
      totalTodos,
      totalThreads,
      activeUsers,
      todosByStatus: statusCounts,
    };
  }

  // ──────────── Users ────────────

  async getUsers(query: PaginationQueryDto) {
    const { page = 1, limit = 10, search, sortBy, sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sortBy && ['name', 'email', 'createdAt', 'role'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              todosCreated: true,
              todosAssigned: true,
              workspaceMembers: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        googleId: true,
        githubId: true,
        createdAt: true,
        updatedAt: true,
        workspaceMembers: {
          select: {
            role: true,
            joinedAt: true,
            workspace: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        todosCreated: {
          select: { id: true, title: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        threadLinksFrom: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            todo: { select: { id: true, title: true } },
            toUser: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            todosCreated: true,
            todosAssigned: true,
            threadLinksFrom: true,
            threadLinksTo: true,
            workspaceMembers: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUser(id: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });
  }

  // ──────────── Workspaces ────────────

  async getWorkspaces(query: PaginationQueryDto) {
    const { page = 1, limit = 10, search, sortBy, sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sortBy && ['name', 'slug', 'createdAt'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [workspaces, total] = await Promise.all([
      this.prisma.workspace.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          avatarUrl: true,
          description: true,
          createdAt: true,
          _count: {
            select: {
              members: true,
              todos: true,
              teams: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.workspace.count({ where }),
    ]);

    return {
      data: workspaces,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getWorkspaceDetail(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        avatarUrl: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        todos: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            assignee: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            members: true,
            todos: true,
            teams: true,
            activities: true,
          },
        },
      },
    });

    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  // ──────────── Todos ────────────

  async getTodos(query: AdminTodoQueryDto) {
    const { page = 1, limit = 10, search, sortBy, sortOrder = 'desc', status, workspaceId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const orderBy: any = {};
    if (sortBy && ['title', 'status', 'priority', 'createdAt', 'dueDate'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [todos, total] = await Promise.all([
      this.prisma.todo.findMany({
        where,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          createdAt: true,
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          workspace: { select: { id: true, name: true } },
          _count: {
            select: { threadLinks: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.todo.count({ where }),
    ]);

    return {
      data: todos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ──────────── Activities ────────────

  async getActivities(query: PaginationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          workspace: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count(),
    ]);

    return {
      data: activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
