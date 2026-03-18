import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThreadsService } from './threads.service';
import { ConnectThreadDto } from './dto/connect-thread.dto';
import { ConnectChainDto } from './dto/connect-chain.dto';

@ApiTags('threads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ThreadsController {
  constructor(private threadsService: ThreadsService) {}

  @Post('todos/:todoId/connect')
  @ApiOperation({ summary: 'Connect a todo to another user via thread' })
  connect(
    @Param('todoId') todoId: string,
    @Body() dto: ConnectThreadDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.threadsService.connect(
      todoId,
      userId,
      dto.toUserId,
      dto.message,
    );
  }

  @Post('todos/:todoId/connect-chain')
  @ApiOperation({ summary: 'Connect a chain of users to a todo in one request' })
  connectChain(
    @Param('todoId') todoId: string,
    @Body() dto: ConnectChainDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.threadsService.connectChain(todoId, userId, dto.userIds);
  }

  @Post('thread-links/:id/resolve')
  @ApiOperation({ summary: 'Resolve a thread link (snap back to sender)' })
  resolve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.threadsService.resolve(id, userId);
  }

  @Get('todos/:todoId/chain')
  @ApiOperation({ summary: 'Get the thread chain for a todo' })
  getChain(@Param('todoId') todoId: string) {
    return this.threadsService.getChain(todoId);
  }

  @Get('threads/mine')
  @ApiOperation({ summary: 'Get my incoming and outgoing threads' })
  getMyThreads(
    @CurrentUser('id') userId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.threadsService.getMyThreads(userId, workspaceId);
  }
}
