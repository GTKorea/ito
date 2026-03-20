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
import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
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
  @ApiOperation({ summary: 'Connect a todo to one or more users via thread' })
  connect(
    @Param('todoId') todoId: string,
    @Body() dto: ConnectThreadDto,
    @CurrentUser('id') userId: string,
  ) {
    // Normalize: support both toUserId (single) and toUserIds (array)
    const toUserIds = dto.toUserIds || (dto.toUserId ? [dto.toUserId] : []);
    return this.threadsService.connect(
      todoId,
      userId,
      toUserIds,
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

  @Post('thread-links/:id/decline')
  @ApiOperation({ summary: 'Decline a thread link (reject and snap back to sender)' })
  decline(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { reason?: string },
  ) {
    return this.threadsService.decline(id, userId, body?.reason);
  }

  @Get('todos/:todoId/chain')
  @ApiOperation({ summary: 'Get the thread chain for a todo' })
  getChain(@Param('todoId') todoId: string) {
    return this.threadsService.getChain(todoId);
  }

  @Get('thread-links/group/:groupId')
  @ApiOperation({ summary: 'Get all thread links in a group' })
  getGroup(@Param('groupId') groupId: string) {
    return this.threadsService.getGroupLinks(groupId);
  }

  @Get('workspaces/:workspaceId/task-graph')
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: 'Get task graph data for the current user' })
  getTaskGraph(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Query('scope') scope?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    const statusFilter = status ? status.split(',') : undefined;
    const priorityFilter = priority ? priority.split(',') : undefined;
    return this.threadsService.getTaskGraph(
      userId,
      workspaceId,
      scope,
      statusFilter,
      priorityFilter,
    );
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
