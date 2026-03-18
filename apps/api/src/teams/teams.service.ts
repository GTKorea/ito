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

  async findAllInWorkspace(workspaceId: string) {
    return this.prisma.team.findMany({
      where: { workspaceId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        _count: { select: { members: true } },
      },
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
