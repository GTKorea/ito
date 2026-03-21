import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new BadRequestException(
        'Google OAuth is not configured. Set GOOGLE_CLIENT_ID in .env',
      );
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions() {
    return { session: false };
  }
}

@Injectable()
export class GitHubOAuthGuard extends AuthGuard('github') {
  canActivate(context: ExecutionContext) {
    if (!process.env.GITHUB_CLIENT_ID) {
      throw new BadRequestException(
        'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID in .env',
      );
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions() {
    return { session: false };
  }
}
