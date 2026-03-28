import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTagDto, UpdateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async createTag(taskGroupId: string, dto: CreateTagDto, userId: string) {
    await this.verifyGroupMember(taskGroupId, userId);

    const existing = await this.prisma.tag.findUnique({
      where: { taskGroupId_name: { taskGroupId, name: dto.name } },
    });
    if (existing) throw new ConflictException('Tag with this name already exists in this group');

    return this.prisma.tag.create({
      data: {
        name: dto.name,
        color: dto.color ?? '#6B7280',
        taskGroupId,
      },
    });
  }

  async findAllByGroup(taskGroupId: string) {
    return this.prisma.tag.findMany({
      where: { taskGroupId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateTag(tagId: string, dto: UpdateTagDto, userId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.verifyGroupMember(tag.taskGroupId, userId);

    if (dto.name && dto.name !== tag.name) {
      const existing = await this.prisma.tag.findUnique({
        where: { taskGroupId_name: { taskGroupId: tag.taskGroupId, name: dto.name } },
      });
      if (existing) throw new ConflictException('Tag with this name already exists in this group');
    }

    return this.prisma.tag.update({
      where: { id: tagId },
      data: { ...dto },
    });
  }

  async deleteTag(tagId: string, userId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.verifyGroupMember(tag.taskGroupId, userId);
    return this.prisma.tag.delete({ where: { id: tagId } });
  }

  async addTagToTask(taskId: string, tagId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.assigneeId !== userId && task.creatorId !== userId) {
      throw new ForbiddenException('Only assignee or creator can tag this task');
    }

    return this.prisma.taskTag.create({
      data: { taskId, tagId },
      include: { tag: true },
    });
  }

  async removeTagFromTask(taskId: string, tagId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.assigneeId !== userId && task.creatorId !== userId) {
      throw new ForbiddenException('Only assignee or creator can untag this task');
    }

    const taskTag = await this.prisma.taskTag.findUnique({
      where: { taskId_tagId: { taskId, tagId } },
    });
    if (!taskTag) throw new NotFoundException('Tag not attached to this task');

    return this.prisma.taskTag.delete({ where: { id: taskTag.id } });
  }

  private async verifyGroupMember(taskGroupId: string, userId: string) {
    const membership = await this.prisma.taskGroupMember.findUnique({
      where: { taskGroupId_userId: { taskGroupId, userId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this group');
  }
}
