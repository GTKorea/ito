import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  Logger,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { SlackService } from './slack.service';
import { SlackCommandDto } from './dto/slack-command.dto';
import { SlackEventDto } from './dto/slack-event.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('slack')
export class SlackController {
  private readonly logger = new Logger(SlackController.name);

  constructor(
    private readonly slackService: SlackService,
    private readonly configService: ConfigService,
  ) {}

  // ──────────────────── OAuth Install Flow ────────────────────

  @Get('install')
  install(
    @Query('workspaceId') workspaceId: string,
    @Res() res: Response,
  ) {
    if (!this.slackService.isOAuthConfigured()) {
      return res
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .json({ error: 'Slack OAuth is not configured' });
    }

    if (!workspaceId) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'workspaceId query parameter is required' });
    }

    const state = Buffer.from(JSON.stringify({ workspaceId })).toString(
      'base64url',
    );
    const installUrl = this.slackService.getInstallUrl(state);
    return res.redirect(installUrl);
  }

  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3010';

    if (error) {
      this.logger.warn(`Slack OAuth error: ${error}`);
      return res.redirect(
        `${frontendUrl}/settings/integrations?slack=error&reason=${encodeURIComponent(error)}`,
      );
    }

    if (!code) {
      return res.redirect(
        `${frontendUrl}/settings/integrations?slack=error&reason=missing_code`,
      );
    }

    // Decode workspaceId from state
    let workspaceId: string | undefined;
    try {
      const decoded = JSON.parse(
        Buffer.from(state || '', 'base64url').toString('utf8'),
      );
      workspaceId = decoded.workspaceId;
    } catch {
      // state parsing failed
    }

    if (!workspaceId) {
      return res.redirect(
        `${frontendUrl}/settings/integrations?slack=error&reason=missing_workspace`,
      );
    }

    try {
      const result = await this.slackService.handleOAuthCallback(
        code,
        workspaceId,
      );
      this.logger.log(
        `Slack OAuth success: ${result.slackTeamName} (${result.slackTeamId})`,
      );
      return res.redirect(
        `${frontendUrl}/settings/integrations?slack=success&team=${encodeURIComponent(result.slackTeamName)}`,
      );
    } catch (err) {
      this.logger.error('Slack OAuth callback failed', err);
      return res.redirect(
        `${frontendUrl}/settings/integrations?slack=error&reason=oauth_failed`,
      );
    }
  }

  // ──────────────────── Status ────────────────────

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Query('workspaceId') workspaceId: string) {
    if (!workspaceId) {
      return { connected: false };
    }

    const slackWorkspace = await this.slackService.getSlackWorkspaceByItoWorkspace(workspaceId);
    if (!slackWorkspace) {
      return { connected: false };
    }

    return {
      connected: true,
      teamName: slackWorkspace.slackTeamName,
      slackTeamId: slackWorkspace.slackTeamId,
    };
  }

  // ──────────────────── Events & Commands ────────────────────

  @Post('events')
  async handleEvent(@Req() req: Request, @Res() res: Response) {
    const body: SlackEventDto = req.body;

    // Handle URL verification challenge FIRST (before signature check)
    if (body.type === 'url_verification') {
      return res.status(HttpStatus.OK).json({ challenge: body.challenge });
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      this.logger.warn('Raw body not available for Slack event');
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing body' });
    }

    // Verify Slack signature for all other events
    const headers = req.headers as Record<string, string>;
    if (!this.slackService.verifyRequest(headers, rawBody.toString('utf8'))) {
      this.logger.warn('Invalid Slack signature for events endpoint');
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
    }

    // Handle events asynchronously
    if (body.type === 'event_callback' && body.event) {
      const eventType = body.event.type;
      this.logger.log(`Received Slack event: ${eventType}`);

      if (eventType === 'app_uninstalled' && body.team_id) {
        await this.slackService.handleAppUninstalled(body.team_id);
      }
    }

    return res.status(HttpStatus.OK).json({ ok: true });
  }

  @Post('commands')
  async handleCommand(@Req() req: Request, @Res() res: Response) {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      this.logger.warn('Raw body not available for Slack command');
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing body' });
    }

    // Verify Slack signature
    const headers = req.headers as Record<string, string>;
    if (!this.slackService.verifyRequest(headers, rawBody.toString('utf8'))) {
      this.logger.warn('Invalid Slack signature for commands endpoint');
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
    }

    const payload: SlackCommandDto = req.body;
    this.logger.log(
      `Slack command: ${payload.command} ${payload.text} from ${payload.user_name}`,
    );

    try {
      const response = await this.slackService.handleCommand(payload);
      return res.status(HttpStatus.OK).json(response);
    } catch (error) {
      this.logger.error('Error handling Slack command', error);
      return res.status(HttpStatus.OK).json({
        response_type: 'ephemeral',
        text: ':x: 명령어 처리 중 오류가 발생했습니다.',
      });
    }
  }
}
