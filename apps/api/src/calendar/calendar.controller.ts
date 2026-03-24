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
  NotFoundException,
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

  // ── Desktop OAuth (polling-based) ────────────────────

  @Get('google/init')
  @ApiOperation({ summary: 'Init Google Calendar OAuth for desktop (returns URL as JSON)' })
  async googleInit(
    @Query('token') token: string,
    @Query('state') state: string,
  ) {
    if (!this.calendarService.isGoogleEnabled()) {
      throw new BadRequestException('Google Calendar integration is not configured');
    }
    if (!token) throw new UnauthorizedException('Token required');
    if (!state) throw new BadRequestException('State parameter required');

    const payload = await this.verifyToken(token);
    const apiUrl = this.configService.get('API_URL', `http://localhost:${this.configService.get('API_PORT', '3011')}`);
    const redirectUri = `${apiUrl}/calendar/google/callback`;

    this.calendarService.registerCalendarOAuth(state, payload.sub, 'google');
    const url = this.calendarService.getGoogleAuthUrl(redirectUri, payload.sub, state);
    return { url };
  }

  @Get('oauth-result')
  @ApiOperation({ summary: 'Poll for calendar OAuth result (desktop app)' })
  getCalendarOAuthResult(@Query('state') state: string) {
    if (!state) {
      throw new NotFoundException('State parameter required');
    }
    const result = this.calendarService.consumeCalendarOAuthResult(state);
    if (!result) {
      throw new NotFoundException('No result yet');
    }
    return result;
  }

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

    // Decode userId (and optional desktopState) from state
    let userId: string;
    let desktopState: string | undefined;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      userId = decoded.userId;
      desktopState = decoded.desktopState;
      if (!userId) throw new Error('No userId in state');
    } catch {
      throw new UnauthorizedException('Invalid state parameter');
    }

    const apiUrl = this.configService.get('API_URL', `http://localhost:${this.configService.get('API_PORT', '3011')}`);
    const redirectUri = `${apiUrl}/calendar/google/callback`;
    await this.calendarService.handleGoogleCallback(code, redirectUri, userId);

    // Desktop flow: store result for polling and show completion page
    if (desktopState) {
      this.calendarService.storeCalendarOAuthResult(desktopState, {
        success: true,
        provider: 'google',
      });
      return this.sendCalendarCompletePage(res);
    }

    // Web flow: redirect to frontend
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

  // ── Debug ───────────────────────────────────

  @Get('debug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Debug calendar integration status' })
  async debugCalendar(@CurrentUser('id') userId: string) {
    const integrations = await this.calendarService.getIntegrations(userId);
    const results: Record<string, unknown> = { integrations };

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).toISOString();

    try {
      const events = await Promise.all([
        this.calendarService.fetchGoogleEvents(userId, start, end),
        this.calendarService.fetchOutlookEvents(userId, start, end),
      ]);
      results.googleEventsCount = events[0].length;
      results.outlookEventsCount = events[1].length;
      results.sampleEvents = [...events[0], ...events[1]].slice(0, 3);
    } catch (error) {
      results.error =
        error instanceof Error ? error.message : 'Unknown error';
    }

    return results;
  }

  // ── Helper ─────────────────────────────────

  private async verifyToken(token: string): Promise<{ sub: string }> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private sendCalendarCompletePage(res: Response) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ito — Calendar connected</title>
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
    <h1>Calendar connected</h1>
    <p>Authentication complete. You can close this tab<br>and return to the ito app.</p>
  </div>
  <script>setTimeout(function() { window.close(); }, 1500);</script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
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
  @ApiOperation({ summary: 'Update a calendar integration (calendarIds, syncEnabled)' })
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
