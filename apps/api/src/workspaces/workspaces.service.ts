import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
    private configService: ConfigService,
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

  async update(
    workspaceId: string,
    data: { name?: string; description?: string; avatarUrl?: string },
    userId: string,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

    // Only OWNER or ADMIN can update workspace
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenException('Only workspace owners and admins can update settings');
    }

    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });

    await this.activityService.log({
      workspaceId,
      userId,
      action: 'UPDATED',
      entityType: 'Workspace',
      entityId: workspaceId,
      metadata: { changes: data },
    });

    return updated;
  }

  async invite(workspaceId: string, email: string, inviterUserId: string, role: 'MEMBER' | 'GUEST' = 'MEMBER') {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.workspaceInvite.create({
      data: { workspaceId, email, expiresAt, role: role as any },
    });

    const [inviter, workspace] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: inviterUserId } }),
      this.prisma.workspace.findUnique({ where: { id: workspaceId } }),
    ]);

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const inviteLink = `${frontendUrl}/invite?token=${invite.token}`;

    // Send email to invitee
    await this.emailService.sendInviteEmail(
      email,
      inviter?.name || 'Someone',
      workspace?.name || 'a workspace',
      inviteLink,
    );

    // If invitee is a registered user, send in-app notification
    const invitee = await this.prisma.user.findUnique({ where: { email } });
    if (invitee) {
      await this.notificationsService.create({
        userId: invitee.id,
        type: 'WORKSPACE_INVITE',
        title: `${inviter?.name || 'Someone'} invited you to ${workspace?.name}`,
        body: `You've been invited to join ${workspace?.name}. Click to accept.`,
        data: { workspaceId, token: invite.token },
      });
    }

    return { ...invite, inviteLink };
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
        data: { userId, workspaceId: invite.workspaceId, role: invite.role },
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
