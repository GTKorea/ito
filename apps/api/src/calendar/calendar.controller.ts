import {
  Controller,
  Get,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CalendarService } from './calendar.service';
import { CalendarSyncDto } from './dto/calendar-sync.dto';

@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
  constructor(
    private calendarService: CalendarService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  // ── Google OAuth ──────────────────────────

  @Get('google/connect')
  @ApiOperation({ summary: 'Start Google Calendar OAuth flow' })
  async googleConnect(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!this.calendarService.isGoogleEnabled()) {
      throw new BadRequestException('Google Calendar integration is not configured');
    }
    if (!token) throw new UnauthorizedException('Token required');

    const payload = await this.verifyToken(token);
    const apiUrl = this.configService.get('API_URL', `http://localhost:${this.configService.get('API_PORT', '3011')}`);
    const redirectUri = `${apiUrl}/calendar/google/callback`;
    const url = this.calendarService.getGoogleAuthUrl(redirectUri, payload.sub);
    return res.redirect(url);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Handle Google Calendar OAuth callback (no auth required)' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter');
    }

    // Decode userId from state
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      userId = decoded.userId;
      if (!userId) throw new Error('No userId in state');
    } catch {
      throw new UnauthorizedException('Invalid state parameter');
    }

    const apiUrl = this.configService.get('API_URL', `http://localhost:${this.configService.get('API_PORT', '3011')}`);
    const redirectUri = `${apiUrl}/calendar/google/callback`;
    await this.calendarService.handleGoogleCallback(code, redirectUri, userId);
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3010');
    return res.redirect(`${frontendUrl}/settings?calendar=google&connected=true`);
  }

  // ── Outlook OAuth ─────────────────────────

  @Get('outlook/connect')
  @ApiOperation({ summary: 'Start Outlook Calendar OAuth flow' })
  async outlookConnect(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!this.calendarService.isOutlookEnabled()) {
      throw new BadRequestException('Outlook Calendar integration is not configured');
    }
    if (!token) throw new UnauthorizedException('Token required');

    const payload = await this.verifyToken(token);
    const apiUrl = this.configService.get('API_URL', `http://localhost:${this.configService.get('API_PORT', '3011')}`);
    const redirectUri = `${apiUrl}/calendar/outlook/callback`;
    const url = this.calendarService.getOutlookAuthUrl(redirectUri, payload.sub);
    return res.redirect(url);
  }

  @Get('outlook/callback')
  @ApiOperation({ summary: 'Handle Outlook Calendar OAuth callback (no auth required)' })
  async outlookCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter');
    }

    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      userId = decoded.userId;
      if (!userId) throw new Error('No userId in state');
    } catch {
      throw new UnauthorizedException('Invalid state parameter');
    }

    const apiUrl = this.configService.get('API_URL', `http://localhost:${this.configService.get('API_PORT', '3011')}`);
    const redirectUri = `${apiUrl}/calendar/outlook/callback`;
    await this.calendarService.handleOutlookCallback(code, redirectUri, userId);
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3010');
    return res.redirect(`${frontendUrl}/settings?calendar=outlook&connected=true`);
  }

  // ── Google Calendars ─────────────────────────

  @Get('google/calendars')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List accessible Google Calendars for the user' })
  listGoogleCalendars(@CurrentUser('id') userId: string) {
    return this.calendarService.listGoogleCalendars(userId);
  }

  // ── Events ───────────────────────────────────

  @Get('events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch calendar events from connected providers' })
  @ApiQuery({ name: 'start', required: true, description: 'ISO date string for range start' })
  @ApiQuery({ name: 'end', required: true, description: 'ISO date string for range end' })
  async getEvents(
    @CurrentUser('id') userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const [google, outlook] = await Promise.all([
      this.calendarService.fetchGoogleEvents(userId, start, end),
      this.calendarService.fetchOutlookEvents(userId, start, end),
    ]);
    return [...google, ...outlook].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
  }

  // ── Helper ─────────────────────────────────

  private async verifyToken(token: string): Promise<{ sub: string }> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // ── Integrations CRUD ─────────────────────

  @Get('integrations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List user calendar integrations' })
  getIntegrations(@CurrentUser('id') userId: string) {
    return this.calendarService.getIntegrations(userId);
  }

  @Patch('integrations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a calendar integration (calendarId, syncEnabled)' })
  updateIntegration(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CalendarSyncDto,
  ) {
    return this.calendarService.updateIntegration(id, userId, dto);
  }

  @Delete('integrations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect a calendar integration' })
  deleteIntegration(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.calendarService.deleteIntegration(id, userId);
  }
}
