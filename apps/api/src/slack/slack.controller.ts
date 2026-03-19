import {
  Controller,
  Post,
  Req,
  Res,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SlackService } from './slack.service';
import { SlackCommandDto } from './dto/slack-command.dto';
import { SlackEventDto } from './dto/slack-event.dto';

@Controller('slack')
export class SlackController {
  private readonly logger = new Logger(SlackController.name);

  constructor(private readonly slackService: SlackService) {}

  @Post('events')
  async handleEvent(@Req() req: Request, @Res() res: Response) {
    const body: SlackEventDto = req.body;

    // Handle URL verification challenge FIRST (before signature check)
    if (body.type === 'url_verification') {
      return res.status(HttpStatus.OK).json({ challenge: body.challenge });
    }

    const rawBody = (req as any).rawBody;
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
      this.logger.log(`Received Slack event: ${body.event.type}`);
      // Future: handle specific event types here
    }

    return res.status(HttpStatus.OK).json({ ok: true });
  }

  @Post('commands')
  async handleCommand(@Req() req: Request, @Res() res: Response) {
    const rawBody = (req as any).rawBody;
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
        text: ':x: \uBA85\uB839\uC5B4 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.',
      });
    }
  }
}
