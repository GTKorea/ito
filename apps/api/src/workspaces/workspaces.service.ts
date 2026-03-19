import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { WorkspaceRole } from '@prisma/client';
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

  async invite(workspaceId: string, email: string, inviterUserId: string, role: WorkspaceRole = WorkspaceRole.MEMBER) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.workspaceInvite.create({
      data: { workspaceId, email, expiresAt, role },
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

  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    newRole: string,
    requestingUserId: string,
  ) {
    const requester = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: requestingUserId, workspaceId },
      },
    });
    if (!requester || !['OWNER', 'ADMIN'].includes(requester.role)) {
      throw new ForbiddenException(
        'Only workspace owners and admins can change member roles',
      );
    }

    const target = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: targetUserId, workspaceId },
      },
    });
    if (!target) throw new NotFoundException('Member not found');

    if (target.role === 'OWNER') {
      throw new ForbiddenException('Cannot change the owner role');
    }

    if (requester.role === 'ADMIN' && target.role === 'ADMIN') {
      throw new ForbiddenException('Admins cannot change other admin roles');
    }

    await this.prisma.workspaceMember.updateMany({
      where: { userId: targetUserId, workspaceId },
      data: { role: newRole as any },
    });

    await this.activityService.log({
      workspaceId,
      userId: requestingUserId,
      action: 'UPDATED',
      entityType: 'WorkspaceMember',
      entityId: target.id,
      metadata: { targetUserId, newRole },
    });

    return { message: 'Role updated' };
  }

  async removeMember(
    workspaceId: string,
    targetUserId: string,
    requestingUserId: string,
  ) {
    const target = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: targetUserId, workspaceId },
      },
    });
    if (!target) throw new NotFoundException('Member not found');

    // Self-removal (leaving workspace)
    if (targetUserId === requestingUserId) {
      if (target.role === 'OWNER') {
        throw new ForbiddenException(
          'Owner cannot leave the workspace. Transfer ownership first.',
        );
      }
    } else {
      // Removing another member
      const requester = await this.prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: { userId: requestingUserId, workspaceId },
        },
      });
      if (!requester || !['OWNER', 'ADMIN'].includes(requester.role)) {
        throw new ForbiddenException(
          'Only workspace owners and admins can remove members',
        );
      }

      if (target.role === 'OWNER') {
        throw new ForbiddenException('Cannot remove the workspace owner');
      }

      if (requester.role === 'ADMIN' && target.role === 'ADMIN') {
        throw new ForbiddenException('Admins cannot remove other admins');
      }
    }

    await this.prisma.workspaceMember.deleteMany({
      where: { userId: targetUserId, workspaceId },
    });

    await this.activityService.log({
      workspaceId,
      userId: requestingUserId,
      action: targetUserId === requestingUserId ? 'LEFT' : 'REMOVED',
      entityType: 'WorkspaceMember',
      entityId: target.id,
      metadata: { targetUserId },
    });

    return { message: 'Member removed' };
  }

  async getMemberSummary(workspaceId: string, targetUserId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: targetUserId, workspaceId },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
    if (!member) throw new NotFoundException('Member not found');

    const [assignedTodos, activeThreads, recentActivity, stats] =
      await Promise.all([
        this.prisma.todo.findMany({
          where: { workspaceId, assigneeId: targetUserId },
          take: 10,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
          },
        }),
        this.prisma.threadLink.findMany({
          where: {
            OR: [
              { fromUserId: targetUserId },
              { toUserId: targetUserId },
            ],
            status: { in: ['PENDING', 'FORWARDED'] },
            todo: { workspaceId },
          },
          take: 10,
          include: {
            fromUser: { select: { id: true, name: true } },
            toUser: { select: { id: true, name: true } },
            todo: { select: { id: true, title: true } },
          },
        }),
        this.prisma.activity.findMany({
          where: { workspaceId, userId: targetUserId },
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
        Promise.all([
          this.prisma.todo.count({
            where: { workspaceId, assigneeId: targetUserId },
          }),
          this.prisma.todo.count({
            where: {
              workspaceId,
              assigneeId: targetUserId,
              status: 'COMPLETED',
            },
          }),
          this.prisma.threadLink.count({
            where: {
              OR: [
                { fromUserId: targetUserId },
                { toUserId: targetUserId },
              ],
              status: { in: ['PENDING', 'FORWARDED'] },
              todo: { workspaceId },
            },
          }),
        ]),
      ]);

    return {
      user: member.user,
      role: member.role,
      assignedTodos,
      activeThreads,
      recentActivity,
      stats: {
        totalTodos: stats[0],
        completedTodos: stats[1],
        activeThreads: stats[2],
      },
    };
  }
}
