import { Module, forwardRef } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WsEventsModule } from '../websocket/ws.module';
import { SlackModule } from '../slack/slack.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [forwardRef(() => WsEventsModule), SlackModule, EmailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
