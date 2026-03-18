import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
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

  // Save frontend origin in cookie, then redirect to OAuth
  @Get('google/init')
  @ApiOperation({ summary: 'Initiate Google OAuth with origin tracking' })
  googleInit(
    @Query('from') from: string,
    @Res() res: Response,
  ) {
    if (from) {
      res.cookie('oauth_redirect', from, {
        httpOnly: true,
        maxAge: 5 * 60 * 1000,
        sameSite: 'lax',
      });
    }
    res.redirect('/auth/google');
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth' })
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.handleOAuthUser(req.user as any);
    const frontendUrl = this.resolveFrontendUrl(req);
    res.clearCookie('oauth_redirect');
    res.redirect(
      `${frontendUrl}/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  @Get('github/init')
  @ApiOperation({ summary: 'Initiate GitHub OAuth with origin tracking' })
  githubInit(
    @Query('from') from: string,
    @Res() res: Response,
  ) {
    if (from) {
      res.cookie('oauth_redirect', from, {
        httpOnly: true,
        maxAge: 5 * 60 * 1000,
        sameSite: 'lax',
      });
    }
    res.redirect('/auth/github');
  }

  @Get('github')
  @UseGuards(GitHubOAuthGuard)
  @ApiOperation({ summary: 'Initiate GitHub OAuth' })
  githubAuth() {}

  @Get('github/callback')
  @UseGuards(GitHubOAuthGuard)
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.handleOAuthUser(req.user as any);
    const frontendUrl = this.resolveFrontendUrl(req);
    res.clearCookie('oauth_redirect');
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
