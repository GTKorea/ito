import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

interface GitHubProfile {
  id: string;
  emails?: Array<{ value: string }>;
  displayName?: string;
  username?: string;
  photos?: Array<{ value: string }>;
}

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get('GITHUB_CLIENT_ID', ''),
      clientSecret: configService.get('GITHUB_CLIENT_SECRET', ''),
      callbackURL: configService.get(
        'GITHUB_CALLBACK_URL',
        'http://localhost:3011/auth/github/callback',
      ),
      scope: ['user:email'],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: GitHubProfile) {
    return {
      githubId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName || profile.username,
      avatarUrl: profile.photos?.[0]?.value,
    };
  }
}
