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
import { ConnectBlockerDto } from './dto/connect-blocker.dto';
import { ConnectChainDto } from './dto/connect-chain.dto';

@ApiTags('threads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ThreadsController {
  constructor(private threadsService: ThreadsService) {}

  @Post('tasks/:taskId/connect')
  @ApiOperation({ summary: 'Connect a task to one or more users via thread' })
  connect(
    @Param('taskId') taskId: string,
    @Body() dto: ConnectThreadDto,
    @CurrentUser('id') userId: string,
  ) {
    // Normalize: support both toUserId (single) and toUserIds (array)
    const toUserIds = dto.toUserIds || (dto.toUserId ? [dto.toUserId] : []);
    return this.threadsService.connect(
      taskId,
      userId,
      toUserIds,
      dto.message,
    );
  }

  @Post('tasks/:taskId/block')
  @ApiOperation({ summary: 'Add a blocker (external dependency) to a task' })
  connectBlocker(
    @Param('taskId') taskId: string,
    @Body() dto: ConnectBlockerDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.threadsService.connectBlocker(taskId, userId, dto.blockerNote);
  }

  @Post('thread-links/:id/resolve-blocker')
  @ApiOperation({ summary: 'Resolve a blocker (self-resolve by creator)' })
  resolveBlocker(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.threadsService.resolveBlocker(id, userId);
  }

  @Post('tasks/:taskId/connect-chain')
  @ApiOperation({ summary: 'Connect a chain of users to a task in one request' })
  connectChain(
    @Param('taskId') taskId: string,
    @Body() dto: ConnectChainDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.threadsService.connectChain(taskId, userId, dto.userIds);
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

  @Get('tasks/:taskId/chain')
  @ApiOperation({ summary: 'Get the thread chain for a task' })
  getChain(@Param('taskId') taskId: string) {
    return this.threadsService.getChain(taskId);
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
