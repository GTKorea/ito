import { Module, forwardRef } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WsEventsModule } from '../websocket/ws.module';
import { SlackModule } from '../slack/slack.module';

@Module({
  imports: [forwardRef(() => WsEventsModule), SlackModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
