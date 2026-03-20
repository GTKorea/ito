import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('todos/:todoId/messages')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated chat messages for a todo' })
  getMessages(
    @Param('todoId') todoId: string,
    @CurrentUser('id') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      todoId,
      userId,
      cursor,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Send a chat message to a todo' })
  sendMessage(
    @Param('todoId') todoId: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.sendMessage(todoId, userId, content);
  }
}
