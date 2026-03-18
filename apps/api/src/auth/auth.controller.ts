import {
  Controller,
  Post,
  Body,
  Get,
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

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth' })
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.handleOAuthUser(req.user as any);
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  @Get('github')
  @UseGuards(GitHubOAuthGuard)
  @ApiOperation({ summary: 'Initiate GitHub OAuth' })
  githubAuth() {}

  @Get('github/callback')
  @UseGuards(GitHubOAuthGuard)
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.handleOAuthUser(req.user as any);
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }
}
