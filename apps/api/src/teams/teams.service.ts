import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, name: string, creatorId: string) {
    return this.prisma.team.create({
      data: {
        name,
        workspaceId,
        members: { create: { userId: creatorId, role: 'LEAD' } },
      },
      include: { members: { include: { user: true } } },
    });
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
    return this.prisma.teamMember.create({
      data: { teamId, userId },
    });
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
