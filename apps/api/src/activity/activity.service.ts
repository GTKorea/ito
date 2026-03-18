import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    workspaceId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.activity.create({ data: params });
  }

  async findAllInWorkspace(workspaceId: string, take = 50) {
    return this.prisma.activity.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
