import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
  ) {}

  async create(dto: CreateWorkspaceDto, userId: string) {
    const existing = await this.prisma.workspace.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('Slug already taken');

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: { members: { include: { user: true } } },
    });

    await this.activityService.log({
      workspaceId: workspace.id,
      userId,
      action: 'CREATED',
      entityType: 'Workspace',
      entityId: workspace.id,
      metadata: { name: workspace.name },
    });

    return workspace;
  }

  async findAllForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      include: {
        _count: { select: { members: true } },
      },
    });
  }

  async findById(id: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        _count: { select: { members: true, teams: true, todos: true } },
      },
    });
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
  }

  async getInviteInfo(token: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invalid or expired invite');
    }
    return {
      workspaceName: invite.workspace.name,
      workspaceSlug: invite.workspace.slug,
      email: invite.email,
      expiresAt: invite.expiresAt,
    };
  }

  async invite(workspaceId: string, email: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.workspaceInvite.create({
      data: { workspaceId, email, expiresAt },
    });
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invalid or expired invite');
    }

    const existing = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId: invite.workspaceId },
      },
    });
    if (existing) {
      await this.prisma.workspaceInvite.delete({ where: { id: invite.id } });
      return { message: 'Already a member' };
    }

    const [member] = await this.prisma.$transaction([
      this.prisma.workspaceMember.create({
        data: { userId, workspaceId: invite.workspaceId },
      }),
      this.prisma.workspaceInvite.delete({ where: { id: invite.id } }),
    ]);

    await this.activityService.log({
      workspaceId: invite.workspaceId,
      userId,
      action: 'JOINED',
      entityType: 'WorkspaceMember',
      entityId: member.id,
    });

    return member;
  }
}
