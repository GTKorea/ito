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

    if (frontendUrl.startsWith('ito://')) {
      return this.sendDesktopCallbackPage(res, frontendUrl, tokens);
    }
    res.redirect(
      `${frontendUrl}/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  private sendDesktopCallbackPage(
    res: Response,
    frontendUrl: string,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const deepLink = `${frontendUrl}/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ito — Sign-in complete</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
      background: #0A0A0A;
      color: #E5E5E5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container { text-align: center; max-width: 400px; padding: 2rem; }
    .logo {
      display: inline-flex; align-items: center; justify-content: center;
      width: 48px; height: 48px; border-radius: 12px;
      background: #FFFFFF; color: #0A0A0A;
      font-size: 24px; font-weight: 700; margin-bottom: 24px;
    }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 8px; color: #FFFFFF; }
    p { font-size: 14px; color: #A3A3A3; line-height: 1.6; }
    .check {
      display: inline-flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: 50%;
      background: #1A2E1A; margin-bottom: 16px;
    }
    .check svg { width: 20px; height: 20px; color: #4ADE80; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">糸</div>
    <div class="check">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </div>
    <h1>Sign-in complete</h1>
    <p>You've been redirected back to the ito app.<br>You can safely close this tab.</p>
  </div>
  <iframe src="${deepLink}" style="display:none"></iframe>
  <script>setTimeout(function() { window.close(); }, 1000);</script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
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
