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

// Routes that GUEST users are completely blocked from
const GUEST_BLOCKED_PATHS = [
  '/teams',
  '/invite',
];

// HTTP methods that GUEST users can use (read-only + resolve threads)
const GUEST_ALLOWED_METHODS = ['GET'];

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

    // GUEST role restrictions
    if (member.role === 'GUEST') {
      const path = request.route?.path || request.url || '';
      const method = request.method;

      // Block GUEST from team management and invites
      const isBlockedPath = GUEST_BLOCKED_PATHS.some((blocked) =>
        path.includes(blocked),
      );
      if (isBlockedPath) {
        throw new ForbiddenException(
          'Guest users do not have access to this resource',
        );
      }

      // GUEST can only use GET for most resources (read-only)
      // Exception: POST to thread-links/:id/resolve and PATCH to todos/:id (status updates)
      const isResolveThread = path.includes('thread-links') && path.includes('resolve');
      const isTodoUpdate = path.includes('/todos') && method === 'PATCH';
      const isAllowedMethod = GUEST_ALLOWED_METHODS.includes(method);

      if (!isAllowedMethod && !isResolveThread && !isTodoUpdate) {
        throw new ForbiddenException(
          'Guest users have read-only access',
        );
      }
    }

    request.workspaceMember = member;
    return true;
  }
}
