import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CalendarService } from './calendar.service';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(
    private calendarService: CalendarService,
    private configService: ConfigService,
  ) {}

  @Get('google/connect')
  @ApiOperation({ summary: 'Start Google Calendar OAuth flow' })
  googleConnect(@Res() res: Response) {
    if (!this.calendarService.isGoogleEnabled()) {
      throw new BadRequestException('Google Calendar integration is not configured');
    }
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3010');
    const redirectUri = `${this.configService.get('API_URL', 'http://localhost:3011')}/calendar/google/callback`;
    const url = this.calendarService.getGoogleAuthUrl(redirectUri);
    return res.redirect(url);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Handle Google Calendar OAuth callback' })
  async googleCallback(
    @Query('code') code: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const redirectUri = `${this.configService.get('API_URL', 'http://localhost:3011')}/calendar/google/callback`;
    await this.calendarService.handleGoogleCallback(code, redirectUri, userId);
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3010');
    return res.redirect(`${frontendUrl}/settings?calendar=google&connected=true`);
  }

  @Get('outlook/connect')
  @ApiOperation({ summary: 'Start Outlook Calendar OAuth flow' })
  outlookConnect(@Res() res: Response) {
    if (!this.calendarService.isOutlookEnabled()) {
      throw new BadRequestException('Outlook Calendar integration is not configured');
    }
    const redirectUri = `${this.configService.get('API_URL', 'http://localhost:3011')}/calendar/outlook/callback`;
    const url = this.calendarService.getOutlookAuthUrl(redirectUri);
    return res.redirect(url);
  }

  @Get('outlook/callback')
  @ApiOperation({ summary: 'Handle Outlook Calendar OAuth callback' })
  async outlookCallback(
    @Query('code') code: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const redirectUri = `${this.configService.get('API_URL', 'http://localhost:3011')}/calendar/outlook/callback`;
    await this.calendarService.handleOutlookCallback(code, redirectUri, userId);
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3010');
    return res.redirect(`${frontendUrl}/settings?calendar=outlook&connected=true`);
  }

  @Get('integrations')
  @ApiOperation({ summary: 'List user calendar integrations' })
  getIntegrations(@CurrentUser('id') userId: string) {
    return this.calendarService.getIntegrations(userId);
  }

  @Delete('integrations/:id')
  @ApiOperation({ summary: 'Disconnect a calendar integration' })
  deleteIntegration(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.calendarService.deleteIntegration(id, userId);
  }
}
