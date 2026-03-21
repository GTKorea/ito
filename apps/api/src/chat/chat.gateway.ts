import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway()
export class ChatGateway {
  constructor(private chatService: ChatService) {}

  @SubscribeMessage('joinTaskChat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.taskId) return;

    const isAllowed = await this.chatService.isParticipant(
      data.taskId,
      userId,
    );
    if (!isAllowed) return;

    client.join(`task-chat:${data.taskId}`);
    return { joined: true, taskId: data.taskId };
  }

  @SubscribeMessage('leaveTaskChat')
  handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string },
  ) {
    if (!data.taskId) return;
    client.leave(`task-chat:${data.taskId}`);
    return { left: true, taskId: data.taskId };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string; content: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.taskId || !data.content) return;

    try {
      const message = await this.chatService.sendMessage(
        data.taskId,
        userId,
        data.content,
      );
      return message;
    } catch {
      return { error: 'Failed to send message' };
    }
  }
}
