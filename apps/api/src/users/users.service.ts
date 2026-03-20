import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  bio: true,
  status: true,
  position: true,
  socialLinks: true,
  role: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, data: UpdateProfileDto) {
    const { socialLinks, ...rest } = data;
    return this.prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(socialLinks !== undefined && {
          socialLinks: socialLinks as any,
        }),
      },
      select: USER_PROFILE_SELECT,
    });
  }

  async findPublicProfile(userId: string, requestingUserId: string) {
    // Check that both users share at least one workspace
    const sharedWorkspace = await this.prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspace: {
          members: {
            some: { userId: requestingUserId },
          },
        },
      },
    });

    if (!sharedWorkspace && userId !== requestingUserId) {
      throw new ForbiddenException('You can only view profiles of users in your workspaces');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async searchMembers(
    workspaceId: string,
    excludeUserId?: string,
    query?: string,
  ) {
    const where: any = {
      workspaceMembers: { some: { workspaceId } },
    };

    if (excludeUserId) {
      where.id = { not: excludeUserId };
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true, avatarUrl: true },
      take: 20,
      orderBy: { name: 'asc' },
    });
  }
}
