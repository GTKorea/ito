import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const workspaceId =
      request.params.workspaceId || request.params.wid || request.body.workspaceId;

    if (!userId || !workspaceId) {
      throw new ForbiddenException('Workspace access denied');
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && !requiredRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient workspace role');
    }

    request.workspaceMember = member;
    return true;
  }
}
