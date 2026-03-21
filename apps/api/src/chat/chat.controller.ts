import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks/:taskId/messages')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated chat messages for a task' })
  getMessages(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      taskId,
      userId,
      cursor,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Send a chat message to a task' })
  sendMessage(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
    @Body('parentId') parentId?: string,
    @Body('fileIds') fileIds?: string[],
  ) {
    return this.chatService.sendMessage(
      taskId,
      userId,
      content,
      parentId,
      fileIds,
    );
  }

  @Get(':messageId/replies')
  @ApiOperation({ summary: 'Get thread replies for a message' })
  getThreadReplies(
    @Param('taskId') taskId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getThreadReplies(
      taskId,
      messageId,
      userId,
      cursor,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file for chat' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  uploadFile(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.chatService.uploadChatFile(file, taskId, userId);
  }
}
