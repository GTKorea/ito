import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CalendarService implements OnModuleInit {
  private readonly logger = new Logger(CalendarService.name);
  private googleEnabled = false;
  private outlookEnabled = false;
  private googleClientId: string;
  private googleClientSecret: string;
  private outlookClientId: string;
  private outlookClientSecret: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.googleClientId =
      this.configService.get<string>('GOOGLE_CALENDAR_CLIENT_ID') || '';
    this.googleClientSecret =
      this.configService.get<string>('GOOGLE_CALENDAR_CLIENT_SECRET') || '';
    this.outlookClientId =
      this.configService.get<string>('OUTLOOK_CLIENT_ID') || '';
    this.outlookClientSecret =
      this.configService.get<string>('OUTLOOK_CLIENT_SECRET') || '';

    if (this.googleClientId && this.googleClientSecret) {
      this.googleEnabled = true;
      this.logger.log('Google Calendar integration enabled');
    } else {
      this.logger.warn(
        'GOOGLE_CALENDAR_CLIENT_ID not configured — Google Calendar disabled',
      );
    }

    if (this.outlookClientId && this.outlookClientSecret) {
      this.outlookEnabled = true;
      this.logger.log('Outlook Calendar integration enabled');
    } else {
      this.logger.warn(
        'OUTLOOK_CLIENT_ID not configured — Outlook Calendar disabled',
      );
    }
  }

  isGoogleEnabled(): boolean {
    return this.googleEnabled;
  }

  isOutlookEnabled(): boolean {
    return this.outlookEnabled;
  }

  getGoogleAuthUrl(redirectUri: string, userId: string): string {
    const scopes = encodeURIComponent(
      'https://www.googleapis.com/auth/calendar.events',
    );
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64url');
    return (
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${this.googleClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scopes}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`
    );
  }

  async handleGoogleCallback(
    code: string,
    redirectUri: string,
    userId: string,
  ) {
    // Exchange code for tokens using googleapis
    const { google } = await import('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      this.googleClientId,
      this.googleClientSecret,
      redirectUri,
    );
    const { tokens } = await oauth2Client.getToken(code);

    await this.prisma.calendarIntegration.upsert({
      where: { userId_provider: { userId, provider: 'google' } },
      update: {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || '',
      },
      create: {
        userId,
        provider: 'google',
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || '',
      },
    });

    return { success: true, provider: 'google' };
  }

  getOutlookAuthUrl(redirectUri: string, userId: string): string {
    const scopes = encodeURIComponent('Calendars.ReadWrite offline_access');
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64url');
    return (
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` +
      `?client_id=${this.outlookClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scopes}` +
      `&state=${state}`
    );
  }

  async handleOutlookCallback(
    code: string,
    redirectUri: string,
    userId: string,
  ) {
    // Exchange code for tokens
    const response = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.outlookClientId,
          client_secret: this.outlookClientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      },
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Outlook token exchange failed (${response.status}): ${errorBody}`,
      );
    }
    const tokens = await response.json();

    await this.prisma.calendarIntegration.upsert({
      where: { userId_provider: { userId, provider: 'outlook' } },
      update: {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || '',
      },
      create: {
        userId,
        provider: 'outlook',
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || '',
      },
    });

    return { success: true, provider: 'outlook' };
  }

  async getIntegrations(userId: string) {
    return this.prisma.calendarIntegration.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        syncEnabled: true,
        calendarId: true,
        createdAt: true,
      },
    });
  }

  async deleteIntegration(id: string, userId: string) {
    return this.prisma.calendarIntegration.deleteMany({
      where: { id, userId },
    });
  }

  async createEvent(
    userId: string,
    todo: { title: string; description?: string; dueDate: Date },
  ) {
    const integrations = await this.prisma.calendarIntegration.findMany({
      where: { userId, syncEnabled: true },
    });

    for (const integration of integrations) {
      try {
        if (integration.provider === 'google') {
          await this.createGoogleEvent(integration, todo);
        } else if (integration.provider === 'outlook') {
          await this.createOutlookEvent(integration, todo);
        }
      } catch (error) {
        this.logger.error(
          `Failed to create calendar event for ${integration.provider}`,
          error,
        );
      }
    }
  }

  async fetchGoogleEvents(
    userId: string,
    timeMin: string,
    timeMax: string,
  ) {
    const integration = await this.prisma.calendarIntegration.findUnique({
      where: { userId_provider: { userId, provider: 'google' } },
    });
    if (!integration || !integration.syncEnabled) return [];

    if (!this.googleEnabled) return [];

    try {
      const { google } = await import('googleapis');
      const oauth2Client = new google.auth.OAuth2(
        this.googleClientId,
        this.googleClientSecret,
      );
      oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
      });

      // If the token was refreshed, persist the new access token
      const newCredentials = oauth2Client.credentials;
      if (
        newCredentials.access_token &&
        newCredentials.access_token !== integration.accessToken
      ) {
        await this.prisma.calendarIntegration.update({
          where: { userId_provider: { userId, provider: 'google' } },
          data: { accessToken: newCredentials.access_token },
        });
      }

      return (response.data.items || []).map((event) => ({
        id: event.id,
        title: event.summary || '',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        isAllDay: !event.start?.dateTime,
        htmlLink: event.htmlLink || '',
        source: 'google' as const,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch Google Calendar events', error);
      return [];
    }
  }

  async fetchOutlookEvents(
    userId: string,
    timeMin: string,
    timeMax: string,
  ) {
    const integration = await this.prisma.calendarIntegration.findUnique({
      where: { userId_provider: { userId, provider: 'outlook' } },
    });
    if (!integration || !integration.syncEnabled) return [];
    if (!this.outlookEnabled) return [];

    try {
      const url =
        `https://graph.microsoft.com/v1.0/me/calendarview` +
        `?startDateTime=${encodeURIComponent(timeMin)}` +
        `&endDateTime=${encodeURIComponent(timeMax)}` +
        `&$top=100&$orderby=start/dateTime`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${integration.accessToken}` },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return ((data.value as any[]) || []).map((event) => ({
        id: event.id,
        title: event.subject || '',
        description: event.bodyPreview || '',
        start: event.start?.dateTime || '',
        end: event.end?.dateTime || '',
        isAllDay: event.isAllDay || false,
        htmlLink: event.webLink || '',
        source: 'outlook' as const,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch Outlook Calendar events', error);
      return [];
    }
  }

  private async createGoogleEvent(
    integration: { accessToken: string; refreshToken: string },
    todo: { title: string; description?: string; dueDate: Date },
  ) {
    if (!this.googleEnabled) return;

    const { google } = await import('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      this.googleClientId,
      this.googleClientSecret,
    );
    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: todo.title,
        description: todo.description || '',
        start: {
          dateTime: todo.dueDate.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(
            todo.dueDate.getTime() + 60 * 60 * 1000,
          ).toISOString(),
          timeZone: 'UTC',
        },
      },
    });
  }

  private async createOutlookEvent(
    integration: { accessToken: string },
    todo: { title: string; description?: string; dueDate: Date },
  ) {
    if (!this.outlookEnabled) return;

    await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: todo.title,
        body: { contentType: 'text', content: todo.description || '' },
        start: {
          dateTime: todo.dueDate.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(
            todo.dueDate.getTime() + 60 * 60 * 1000,
          ).toISOString(),
          timeZone: 'UTC',
        },
      }),
    });
  }
}
