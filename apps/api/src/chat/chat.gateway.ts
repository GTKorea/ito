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
    // Also remove from focus room if leaving chat
    client.leave(`task-chat-focus:${data.taskId}`);
    if (client.data.focusedTaskId === data.taskId) {
      client.data.focusedTaskId = undefined;
    }
    return { left: true, taskId: data.taskId };
  }

  @SubscribeMessage('chatFocus')
  handleChatFocus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string },
  ) {
    if (!data.taskId) return;
    // Leave previous focus room if any
    if (client.data.focusedTaskId && client.data.focusedTaskId !== data.taskId) {
      client.leave(`task-chat-focus:${client.data.focusedTaskId}`);
    }
    client.join(`task-chat-focus:${data.taskId}`);
    client.data.focusedTaskId = data.taskId;
    return { focused: true, taskId: data.taskId };
  }

  @SubscribeMessage('chatUnfocus')
  handleChatUnfocus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string },
  ) {
    if (!data.taskId) return;
    client.leave(`task-chat-focus:${data.taskId}`);
    if (client.data.focusedTaskId === data.taskId) {
      client.data.focusedTaskId = undefined;
    }
    return { unfocused: true, taskId: data.taskId };
  }

  @SubscribeMessage('joinThread')
  async handleJoinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string; parentId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.taskId || !data.parentId) return;

    const isAllowed = await this.chatService.isParticipant(
      data.taskId,
      userId,
    );
    if (!isAllowed) return;

    client.join(`thread:${data.parentId}`);
    return { joined: true, parentId: data.parentId };
  }

  @SubscribeMessage('leaveThread')
  handleLeaveThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { parentId: string },
  ) {
    if (!data.parentId) return;
    client.leave(`thread:${data.parentId}`);
    return { left: true, parentId: data.parentId };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      taskId: string;
      content: string;
      parentId?: string;
      fileIds?: string[];
    },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.taskId) return;
    // Allow empty content if files are provided
    if (!data.content && (!data.fileIds || data.fileIds.length === 0)) return;

    try {
      const message = await this.chatService.sendMessage(
        data.taskId,
        userId,
        data.content,
        data.parentId,
        data.fileIds,
      );
      return message;
    } catch {
      return { error: 'Failed to send message' };
    }
  }
}
