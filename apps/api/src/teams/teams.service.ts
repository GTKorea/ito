import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class TeamsService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
  ) {}

  async create(workspaceId: string, name: string, creatorId: string) {
    const team = await this.prisma.team.create({
      data: {
        name,
        workspaceId,
        members: { create: { userId: creatorId, role: 'LEAD' } },
      },
      include: { members: { include: { user: true } } },
    });

    await this.activityService.log({
      workspaceId,
      userId: creatorId,
      action: 'CREATED',
      entityType: 'Team',
      entityId: team.id,
      metadata: { name },
    });

    return team;
  }

  async findById(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        _count: { select: { members: true } },
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async findAllInWorkspace(workspaceId: string) {
    return this.prisma.team.findMany({
      where: { workspaceId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        _count: { select: { members: true, todos: true } },
      },
    });
  }

  async getTeamDashboard(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        _count: { select: { members: true, todos: true } },
      },
    });
    if (!team) throw new NotFoundException('Team not found');

    // Get per-member stats
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const memberStats = await Promise.all(
      team.members.map(async (member) => {
        const [activeTodos, pendingThreads, completedTodos] = await Promise.all(
          [
            this.prisma.todo.count({
              where: {
                teamId,
                assigneeId: member.userId,
                status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] },
              },
            }),
            this.prisma.threadLink.count({
              where: {
                toUserId: member.userId,
                status: 'PENDING',
                todo: { teamId },
              },
            }),
            this.prisma.todo.count({
              where: {
                teamId,
                assigneeId: member.userId,
                status: 'COMPLETED',
                completedAt: { gte: oneWeekAgo },
              },
            }),
          ],
        );

        return {
          userId: member.userId,
          name: member.user.name,
          avatarUrl: member.user.avatarUrl,
          role: member.role,
          activeTodos,
          pendingThreads,
          completedTodos,
        };
      }),
    );

    // Team totals
    const [totalActive, totalPendingThreads, totalCompletedThisWeek] =
      await Promise.all([
        this.prisma.todo.count({
          where: {
            teamId,
            status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] },
          },
        }),
        this.prisma.threadLink.count({
          where: { status: 'PENDING', todo: { teamId } },
        }),
        this.prisma.todo.count({
          where: {
            teamId,
            status: 'COMPLETED',
            completedAt: { gte: oneWeekAgo },
          },
        }),
      ]);

    return {
      id: team.id,
      name: team.name,
      memberCount: team._count.members,
      todoCount: team._count.todos,
      members: memberStats,
      totals: {
        activeTodos: totalActive,
        pendingThreads: totalPendingThreads,
        completedThisWeek: totalCompletedThisWeek,
      },
    };
  }

  async getTeamTodos(
    teamId: string,
    filters?: { status?: string; assigneeId?: string },
  ) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) throw new NotFoundException('Team not found');

    const where: any = { teamId };
    if (filters?.status) where.status = filters.status;
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;

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
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async addMember(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    const member = await this.prisma.teamMember.create({
      data: { teamId, userId },
    });

    await this.activityService.log({
      workspaceId: team.workspaceId,
      userId,
      action: 'JOINED',
      entityType: 'Team',
      entityId: teamId,
    });

    return member;
  }

  async removeMember(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!member) throw new NotFoundException('Member not found in team');

    return this.prisma.teamMember.delete({
      where: { id: member.id },
    });
  }

  async delete(teamId: string) {
    return this.prisma.team.delete({ where: { id: teamId } });
  }
}
