import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { getInviteEmailHtml } from './templates/invite';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private from: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from =
      this.configService.get<string>('RESEND_FROM') ||
      'ito <noreply@itothread.com>';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email service initialized');
    } else {
      this.logger.warn(
        'RESEND_API_KEY not configured — email sending disabled',
      );
    }
  }

  async sendInviteEmail(
    to: string,
    inviterName: string,
    workspaceName: string,
    inviteLink: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.debug(`Email skipped (no API key): invite to ${to}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: `${inviterName} invited you to ${workspaceName} on ito`,
        html: getInviteEmailHtml({
          inviterName,
          workspaceName,
          inviteLink,
        }),
      });
      this.logger.log(`Invite email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send invite email to ${to}`, error);
    }
  }
}
