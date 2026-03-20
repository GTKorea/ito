import { Module, forwardRef } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { WsEventsModule } from '../websocket/ws.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [WsEventsModule, forwardRef(() => NotificationsModule)],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
