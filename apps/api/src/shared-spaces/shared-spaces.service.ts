import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateSharedSpaceDto,
  UpdateSharedSpaceDto,
  InviteWorkspaceDto,
  CreateSharedSpaceTaskDto,
} from './dto/shared-space.dto';

@Injectable()
export class SharedSpacesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {}

  /**
   * Create a shared space. The creator's current workspace auto-joins as OWNER.
   */
  async create(dto: CreateSharedSpaceDto, userId: string, workspaceId: string) {
    // Verify user is a member of the workspace
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const sharedSpace = await this.prisma.sharedSpace.create({
      data: {
        name: dto.name,
        description: dto.description,
        createdById: userId,
        participants: {
          create: {
            workspaceId,
            role: 'OWNER',
          },
        },
      },
      include: {
        participants: {
          include: {
            workspace: { select: { id: true, name: true, slug: true, avatarUrl: true } },
          },
        },
        _count: { select: { tasks: true, participants: true } },
      },
    });

    return sharedSpace;
  }

  /**
   * List shared spaces the user's workspace participates in.
   */
  async findAllForWorkspace(workspaceId: string) {
    return this.prisma.sharedSpace.findMany({
      where: {
        participants: { some: { workspaceId } },
      },
      include: {
        participants: {
          include: {
            workspace: { select: { id: true, name: true, slug: true, avatarUrl: true } },
          },
        },
        _count: { select: { tasks: true, participants: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get shared space details with participants.
   */
  async findById(id: string, workspaceId: string) {
    const sharedSpace = await this.prisma.sharedSpace.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        participants: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                avatarUrl: true,
                _count: { select: { members: true } },
              },
            },
          },
        },
        _count: { select: { tasks: true, participants: true } },
      },
    });

    if (!sharedSpace) {
      throw new NotFoundException('Shared space not found');
    }

    // Verify the user's workspace is a participant
    const isParticipant = sharedSpace.participants.some(
      (p) => p.workspaceId === workspaceId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Your workspace is not a participant of this shared space');
    }

    return sharedSpace;
  }

  /**
   * Update shared space (OWNER/ADMIN only).
   */
  async update(id: string, dto: UpdateSharedSpaceDto, workspaceId: string) {
    await this.requireRole(id, workspaceId, ['OWNER', 'ADMIN']);

    return this.prisma.sharedSpace.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: {
        participants: {
          include: {
            workspace: { select: { id: true, name: true, slug: true, avatarUrl: true } },
          },
        },
        _count: { select: { tasks: true, participants: true } },
      },
    });
  }

  /**
   * Invite a workspace by slug. Generate invite token and notify workspace admins.
   */
  async inviteWorkspace(
    sharedSpaceId: string,
    dto: InviteWorkspaceDto,
    inviterUserId: string,
    inviterWorkspaceId: string,
  ) {
    await this.requireRole(sharedSpaceId, inviterWorkspaceId, ['OWNER', 'ADMIN']);

    // Find the target workspace
    const targetWorkspace = await this.prisma.workspace.findUnique({
      where: { slug: dto.workspaceSlug },
      include: {
        members: {
          where: { role: { in: ['OWNER', 'ADMIN'] } },
          include: { user: true },
        },
      },
    });
    if (!targetWorkspace) {
      throw new NotFoundException('Workspace not found with that slug');
    }

    // Check if already a participant
    const existing = await this.prisma.sharedSpaceParticipant.findUnique({
      where: {
        sharedSpaceId_workspaceId: { sharedSpaceId, workspaceId: targetWorkspace.id },
      },
    });
    if (existing) {
      throw new ConflictException('This workspace is already a participant');
    }

    // Check if there's already a pending invite
    const existingInvite = await this.prisma.sharedSpaceInvite.findFirst({
      where: {
        sharedSpaceId,
        workspaceSlug: dto.workspaceSlug,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvite) {
      throw new ConflictException('An invite is already pending for this workspace');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.sharedSpaceInvite.create({
      data: {
        sharedSpaceId,
        workspaceSlug: dto.workspaceSlug,
        expiresAt,
      },
    });

    const [inviter, sharedSpace] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: inviterUserId } }),
      this.prisma.sharedSpace.findUnique({ where: { id: sharedSpaceId } }),
    ]);

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const inviteLink = `${frontendUrl}/shared-spaces/join?token=${invite.token}`;

    // Notify workspace admins/owners
    for (const member of targetWorkspace.members) {
      await this.notificationsService.create({
        userId: member.userId,
        type: 'SHARED_SPACE_INVITE',
        title: `${inviter?.name || 'Someone'} invited your workspace to "${sharedSpace?.name}"`,
        body: `Your workspace "${targetWorkspace.name}" has been invited to join a shared collaboration space.`,
        data: { sharedSpaceId, token: invite.token },
      });
    }

    return { ...invite, inviteLink };
  }

  /**
   * Accept invite and add workspace as participant.
   */
  async acceptInvite(token: string, userId: string, workspaceId: string) {
    const invite = await this.prisma.sharedSpaceInvite.findUnique({
      where: { token },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invalid or expired invite');
    }

    // Verify the user's current workspace matches the invited workspace
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace || workspace.slug !== invite.workspaceSlug) {
      throw new ForbiddenException(
        'This invite is for a different workspace. Switch to the correct workspace first.',
      );
    }

    // Verify user has admin/owner role in their workspace
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenException('Only workspace owners and admins can accept shared space invites');
    }

    // Check if already a participant
    const existing = await this.prisma.sharedSpaceParticipant.findUnique({
      where: {
        sharedSpaceId_workspaceId: { sharedSpaceId: invite.sharedSpaceId, workspaceId },
      },
    });
    if (existing) {
      await this.prisma.sharedSpaceInvite.delete({ where: { id: invite.id } });
      return { message: 'Already a participant' };
    }

    const [participant] = await this.prisma.$transaction([
      this.prisma.sharedSpaceParticipant.create({
        data: {
          sharedSpaceId: invite.sharedSpaceId,
          workspaceId,
          role: 'MEMBER',
        },
      }),
      this.prisma.sharedSpaceInvite.delete({ where: { id: invite.id } }),
    ]);

    return participant;
  }

  /**
   * Get invite info by token.
   */
  async getInviteInfo(token: string) {
    const invite = await this.prisma.sharedSpaceInvite.findUnique({
      where: { token },
      include: {
        sharedSpace: {
          select: {
            id: true,
            name: true,
            description: true,
            _count: { select: { participants: true, tasks: true } },
          },
        },
      },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invalid or expired invite');
    }
    return {
      sharedSpaceName: invite.sharedSpace.name,
      sharedSpaceDescription: invite.sharedSpace.description,
      participantCount: invite.sharedSpace._count.participants,
      taskCount: invite.sharedSpace._count.tasks,
      workspaceSlug: invite.workspaceSlug,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * Remove a workspace from shared space (OWNER only).
   */
  async removeParticipant(
    sharedSpaceId: string,
    targetWorkspaceId: string,
    requestingWorkspaceId: string,
  ) {
    await this.requireRole(sharedSpaceId, requestingWorkspaceId, ['OWNER']);

    const participant = await this.prisma.sharedSpaceParticipant.findUnique({
      where: {
        sharedSpaceId_workspaceId: { sharedSpaceId, workspaceId: targetWorkspaceId },
      },
    });
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }
    if (participant.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove the owner workspace');
    }

    await this.prisma.sharedSpaceParticipant.delete({
      where: { id: participant.id },
    });

    return { message: 'Participant removed' };
  }

  /**
   * Get tasks in a shared space.
   */
  async getTasks(sharedSpaceId: string, workspaceId: string) {
    await this.requireParticipant(sharedSpaceId, workspaceId);

    return this.prisma.task.findMany({
      where: { sharedSpaceId },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        workspace: { select: { id: true, name: true, slug: true } },
        threadLinks: {
          include: {
            fromUser: { select: { id: true, name: true, avatarUrl: true } },
            toUser: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { chainIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a task in shared space.
   */
  async createTask(
    sharedSpaceId: string,
    dto: CreateSharedSpaceTaskDto,
    userId: string,
    workspaceId: string,
  ) {
    await this.requireParticipant(sharedSpaceId, workspaceId);

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        creatorId: userId,
        assigneeId: userId,
        workspaceId,
        sharedSpaceId,
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        workspace: { select: { id: true, name: true, slug: true } },
        threadLinks: true,
      },
    });

    return task;
  }

  // ──────────── Helpers ────────────

  private async requireParticipant(sharedSpaceId: string, workspaceId: string) {
    const participant = await this.prisma.sharedSpaceParticipant.findUnique({
      where: {
        sharedSpaceId_workspaceId: { sharedSpaceId, workspaceId },
      },
    });
    if (!participant) {
      throw new ForbiddenException('Your workspace is not a participant of this shared space');
    }
    return participant;
  }

  private async requireRole(
    sharedSpaceId: string,
    workspaceId: string,
    roles: string[],
  ) {
    const participant = await this.requireParticipant(sharedSpaceId, workspaceId);
    if (!roles.includes(participant.role)) {
      throw new ForbiddenException(
        `Only ${roles.join('/')} workspaces can perform this action`,
      );
    }
    return participant;
  }
}
