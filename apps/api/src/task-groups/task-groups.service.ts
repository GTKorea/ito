import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTaskGroupDto, UpdateTaskGroupDto } from './dto/create-task-group.dto';

@Injectable()
export class TaskGroupsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTaskGroupDto, workspaceId: string, userId: string) {
    const group = await this.prisma.taskGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        workspaceId,
        createdById: userId,
        members: {
          create: { userId },
        },
      },
      include: {
        _count: { select: { members: true, tasks: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } } } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
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
      include: {
        _count: { select: { members: true, tasks: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } } } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    return group;
  }

  async findAllInWorkspace(workspaceId: string, userId: string) {
    return this.prisma.taskGroup.findMany({
      where: {
        workspaceId,
        members: { some: { userId } },
      },
      select: {
        id: true,
        name: true,
        description: true,
        workspaceId: true,
        sharedSpaceId: true,
        createdById: true,
        isPrivate: true,
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
        members: { some: { userId } },
      },
      include: {
        _count: { select: { members: true, tasks: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } } } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
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
      include: {
        _count: { select: { members: true, tasks: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } } } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async delete(id: string, userId: string) {
    const group = await this.prisma.taskGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Task group not found');
    if (group.isPrivate) {
      throw new ForbiddenException('Cannot delete private groups');
    }
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
