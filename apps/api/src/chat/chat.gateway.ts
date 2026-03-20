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

  @SubscribeMessage('joinTodoChat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { todoId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.todoId) return;

    const isAllowed = await this.chatService.isParticipant(
      data.todoId,
      userId,
    );
    if (!isAllowed) return;

    client.join(`todo-chat:${data.todoId}`);
    return { joined: true, todoId: data.todoId };
  }

  @SubscribeMessage('leaveTodoChat')
  handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { todoId: string },
  ) {
    if (!data.todoId) return;
    client.leave(`todo-chat:${data.todoId}`);
    return { left: true, todoId: data.todoId };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { todoId: string; content: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.todoId || !data.content) return;

    try {
      const message = await this.chatService.sendMessage(
        data.todoId,
        userId,
        data.content,
      );
      return message;
    } catch {
      return { error: 'Failed to send message' };
    }
  }
}
