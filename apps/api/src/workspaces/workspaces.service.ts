import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkspaceDto, userId: string) {
    const existing = await this.prisma.workspace.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('Slug already taken');

    return this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: { members: { include: { user: true } } },
    });
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

    return member;
  }
}
