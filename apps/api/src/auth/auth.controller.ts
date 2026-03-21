import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService, OAuthProfile } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import {
  GoogleOAuthGuard,
  GitHubOAuthGuard,
} from './guards/optional-oauth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register with email and password' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  // Save frontend origin in cookie + register server-side state, then redirect to OAuth
  @Get('google/init')
  @ApiOperation({ summary: 'Initiate Google OAuth with origin tracking' })
  googleInit(
    @Query('from') from: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.oauthInit(from, state, req, res);
    res.redirect('/auth/google');
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth' })
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    await this.oauthCallback(req, res);
  }

  @Get('github/init')
  @ApiOperation({ summary: 'Initiate GitHub OAuth with origin tracking' })
  githubInit(
    @Query('from') from: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.oauthInit(from, state, req, res);
    res.redirect('/auth/github');
  }

  @Get('github')
  @UseGuards(GitHubOAuthGuard)
  @ApiOperation({ summary: 'Initiate GitHub OAuth' })
  githubAuth() {}

  @Get('github/callback')
  @UseGuards(GitHubOAuthGuard)
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    await this.oauthCallback(req, res);
  }

  @Get('oauth-result')
  @ApiOperation({ summary: 'Poll for OAuth result (desktop app)' })
  getOAuthResult(@Query('state') state: string) {
    if (!state) {
      throw new NotFoundException('State parameter required');
    }
    const result = this.authService.consumeOAuthResult(state);
    if (!result) {
      throw new NotFoundException('OAuth result not found or expired');
    }
    return result;
  }

  // ── shared helpers ───────────────────────────────────────────

  /** Common init logic for both Google and GitHub */
  private oauthInit(
    from: string,
    state: string,
    req: Request,
    res: Response,
  ) {
    if (from) {
      res.cookie('oauth_redirect', from, {
        httpOnly: true,
        maxAge: 5 * 60 * 1000,
        sameSite: 'lax',
      });
    }
    if (state) {
      res.cookie('oauth_state', state, {
        httpOnly: true,
        maxAge: 5 * 60 * 1000,
        sameSite: 'lax',
      });
      const ip = req.ip || req.socket?.remoteAddress || '';
      this.authService.registerOAuthState(state, from || '', ip);
    }
  }

  /** Common callback logic for both Google and GitHub */
  private async oauthCallback(req: Request, res: Response) {
    const tokens = await this.authService.handleOAuthUser(
      req.user as OAuthProfile,
    );

    // Store tokens for desktop polling (cookie-free fallback)
    const ip = req.ip || req.socket?.remoteAddress || '';
    const state = this.authService.resolveOAuthState(
      req.cookies?.oauth_state,
      ip,
    );
    if (state) {
      this.authService.storeOAuthResult(state, tokens);
    }

    const frontendUrl = this.resolveFrontendUrl(req);
    res.clearCookie('oauth_redirect');
    res.clearCookie('oauth_state');
    res.redirect(
      `${frontendUrl}/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  private resolveFrontendUrl(req: Request): string {
    // First check cookie set by /init endpoint
    const cookieRedirect = req.cookies?.oauth_redirect;
    if (cookieRedirect) {
      return cookieRedirect as string;
    }

    // Fallback: match by Referer/Origin header
    const raw: string = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    ) as string;
    const urls = raw.split(',').map((url: string) => url.trim());
    const origin = req.headers.referer || req.headers.origin || '';
    const matched = urls.find((url: string) =>
      (origin as string).startsWith(url),
    );
    return matched || urls[0];
  }
}
