import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTaskGroupDto, UpdateTaskGroupDto } from './dto/create-task-group.dto';

function groupInclude() {
  return {
    _count: { select: { members: true, tasks: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] as const } } } } },
    createdBy: { select: { id: true, name: true, avatarUrl: true } },
  };
}

@Injectable()
export class TaskGroupsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTaskGroupDto, workspaceId: string, userId: string) {
    const group = await this.prisma.taskGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        isPrivate: dto.isPrivate ?? false,
        workspaceId,
        createdById: userId,
        members: {
          create: { userId },
        },
      },
      include: groupInclude(),
    });
    return group;
  }

  async createForSharedSpace(dto: CreateTaskGroupDto, sharedSpaceId: string, userId: string) {
    const group = await this.prisma.taskGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        sharedSpaceId,
        createdById: userId,
        members: {
          create: { userId },
        },
      },
      include: groupInclude(),
    });
    return group;
  }

  async archive(id: string, userId: string) {
    const group = await this.prisma.taskGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Task group not found');
    if (group.createdById !== userId) throw new ForbiddenException('Only the creator can archive this group');
    return this.prisma.taskGroup.update({
      where: { id },
      data: { isArchived: true },
      include: groupInclude(),
    });
  }

  async unarchive(id: string, userId: string) {
    const group = await this.prisma.taskGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Task group not found');
    if (group.createdById !== userId) throw new ForbiddenException('Only the creator can unarchive this group');
    return this.prisma.taskGroup.update({
      where: { id },
      data: { isArchived: false },
      include: groupInclude(),
    });
  }

  async findAllInWorkspace(workspaceId: string, userId: string) {
    return this.prisma.taskGroup.findMany({
      where: {
        workspaceId,
        isArchived: false,
        OR: [
          { isPrivate: false },
          { members: { some: { userId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        workspaceId: true,
        sharedSpaceId: true,
        createdById: true,
        isPrivate: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { members: true, tasks: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } } } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAllInSharedSpace(sharedSpaceId: string, userId: string) {
    return this.prisma.taskGroup.findMany({
      where: {
        sharedSpaceId,
        isArchived: false,
        OR: [
          { isPrivate: false },
          { members: { some: { userId } } },
        ],
      },
      include: groupInclude(),
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    const group = await this.prisma.taskGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { members: true, tasks: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } } } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    if (!group) throw new NotFoundException('Task group not found');
    return group;
  }

  async update(id: string, dto: UpdateTaskGroupDto, userId: string) {
    const group = await this.prisma.taskGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Task group not found');
    if (group.createdById !== userId) {
      throw new ForbiddenException('Only the creator can update this group');
    }
    return this.prisma.taskGroup.update({
      where: { id },
      data: dto,
      include: groupInclude(),
    });
  }

  async delete(id: string, userId: string) {
    const group = await this.prisma.taskGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Task group not found');
    if (group.createdById !== userId) {
      throw new ForbiddenException('Only the creator can delete this group');
    }
    return this.prisma.taskGroup.delete({ where: { id } });
  }

  async getMembers(groupId: string) {
    const group = await this.prisma.taskGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Task group not found');
    return this.prisma.taskGroupMember.findMany({
      where: { taskGroupId: groupId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addMember(groupId: string, userId: string) {
    const group = await this.prisma.taskGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Task group not found');
    return this.prisma.taskGroupMember.create({
      data: { taskGroupId: groupId, userId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  }

  async removeMember(groupId: string, userId: string) {
    const member = await this.prisma.taskGroupMember.findUnique({
      where: { taskGroupId_userId: { taskGroupId: groupId, userId } },
    });
    if (!member) throw new NotFoundException('Member not found in group');
    return this.prisma.taskGroupMember.delete({ where: { id: member.id } });
  }

  async inviteTeam(groupId: string, teamId: string) {
    const group = await this.prisma.taskGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Task group not found');

    const teamMembers = await this.prisma.teamMember.findMany({
      where: { teamId },
      select: { userId: true },
    });

    if (teamMembers.length === 0) throw new NotFoundException('Team has no members');

    const existingMembers = await this.prisma.taskGroupMember.findMany({
      where: { taskGroupId: groupId, userId: { in: teamMembers.map((m) => m.userId) } },
      select: { userId: true },
    });
    const existingSet = new Set(existingMembers.map((m) => m.userId));
    const newUserIds = teamMembers.filter((m) => !existingSet.has(m.userId)).map((m) => m.userId);

    if (newUserIds.length > 0) {
      await this.prisma.taskGroupMember.createMany({
        data: newUserIds.map((userId) => ({ taskGroupId: groupId, userId })),
        skipDuplicates: true,
      });
    }

    return { added: newUserIds.length, total: teamMembers.length };
  }

  async addTaskToGroup(taskId: string, groupId: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { taskGroupId: groupId },
    });
  }

  async removeTaskFromGroup(taskId: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { taskGroupId: null },
    });
  }
}
