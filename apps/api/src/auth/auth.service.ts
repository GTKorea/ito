import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { randomBytes } from 'crypto';

export interface OAuthProfile {
  googleId?: string;
  githubId?: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface PendingOAuth {
  from: string;
  ip: string;
  createdAt: number;
}

export interface OAuthResult {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  // Server-side OAuth state (cookie-free fallback for desktop apps)
  private pendingOAuth = new Map<string, PendingOAuth>();
  private oauthResults = new Map<string, OAuthResult>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /** Register a desktop OAuth state before opening the browser */
  registerOAuthState(state: string, from: string, ip: string) {
    this.cleanupExpiredOAuth();
    this.pendingOAuth.set(state, { from, ip, createdAt: Date.now() });
  }

  /** Find the OAuth state: try cookie value first, then match by IP */
  resolveOAuthState(
    cookieState: string | undefined,
    ip: string,
  ): string | undefined {
    if (cookieState && this.pendingOAuth.has(cookieState)) return cookieState;
    // Fallback: most recent pending state from the same IP
    const fiveMin = 5 * 60 * 1000;
    const now = Date.now();
    let best: { state: string; createdAt: number } | null = null;
    for (const [state, data] of this.pendingOAuth) {
      if (data.ip === ip && now - data.createdAt < fiveMin) {
        if (!best || data.createdAt > best.createdAt) {
          best = { state, createdAt: data.createdAt };
        }
      }
    }
    return best?.state;
  }

  /** Store tokens so the desktop app can poll for them */
  storeOAuthResult(state: string, tokens: OAuthResult) {
    this.pendingOAuth.delete(state);
    this.oauthResults.set(state, tokens);
    setTimeout(() => this.oauthResults.delete(state), 5 * 60 * 1000);
  }

  /** Desktop polls this; returns tokens once then deletes */
  consumeOAuthResult(state: string): OAuthResult | null {
    const result = this.oauthResults.get(state);
    if (!result) return null;
    this.oauthResults.delete(state);
    return result;
  }

  private cleanupExpiredOAuth() {
    const fiveMin = 5 * 60 * 1000;
    const now = Date.now();
    for (const [key, val] of this.pendingOAuth) {
      if (now - val.createdAt > fiveMin) this.pendingOAuth.delete(key);
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
      },
    });

    return this.generateTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id, user.email);
  }

  async handleOAuthUser(profile: OAuthProfile) {
    let user = profile.googleId
      ? await this.prisma.user.findUnique({ where: { googleId: profile.googleId } })
      : await this.prisma.user.findUnique({ where: { githubId: profile.githubId! } });

    if (!user) {
      // Check if email already exists
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (existingByEmail) {
        // Link OAuth to existing account
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: profile.googleId
            ? { googleId: profile.googleId }
            : { githubId: profile.githubId },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            ...(profile.googleId
              ? { googleId: profile.googleId }
              : { githubId: profile.githubId }),
          },
        });
      }
    }

    return this.generateTokens(user.id, user.email);
  }

  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate refresh token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    return this.generateTokens(stored.user.id, stored.user.email);
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET', 'dev-secret'),
      expiresIn: this.configService.get('JWT_EXPIRATION', '15m'),
    });

    const refreshToken = randomBytes(40).toString('hex');
    const refreshExpiresIn = this.configService.get(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    );
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + parseInt(refreshExpiresIn.replace('d', ''), 10),
    );

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
