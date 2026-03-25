import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TaskGroupsService } from './task-groups.service';
import { CreateTaskGroupDto, UpdateTaskGroupDto } from './dto/create-task-group.dto';

@ApiTags('task-groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TaskGroupsController {
  constructor(private taskGroupsService: TaskGroupsService) {}

  @Post('workspaces/:workspaceId/task-groups')
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: 'Create a task group in workspace' })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateTaskGroupDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.taskGroupsService.create(dto, workspaceId, userId);
  }

  @Get('workspaces/:workspaceId/task-groups')
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: 'List task groups in workspace' })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.taskGroupsService.findAllInWorkspace(workspaceId, userId);
  }

  @Post('shared-spaces/:sharedSpaceId/task-groups')
  @ApiOperation({ summary: 'Create a task group in shared space' })
  createForSharedSpace(
    @Param('sharedSpaceId') sharedSpaceId: string,
    @Body() dto: CreateTaskGroupDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.taskGroupsService.createForSharedSpace(dto, sharedSpaceId, userId);
  }

  @Get('shared-spaces/:sharedSpaceId/task-groups')
  @ApiOperation({ summary: 'List task groups in shared space' })
  findAllInSharedSpace(
    @Param('sharedSpaceId') sharedSpaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.taskGroupsService.findAllInSharedSpace(sharedSpaceId, userId);
  }

  @Get('task-groups/:id')
  @ApiOperation({ summary: 'Get task group details' })
  findOne(@Param('id') id: string) {
    return this.taskGroupsService.findById(id);
  }

  @Patch('task-groups/:id')
  @ApiOperation({ summary: 'Update task group' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskGroupDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.taskGroupsService.update(id, dto, userId);
  }

  @Post('task-groups/:id/archive')
  @ApiOperation({ summary: 'Archive task group' })
  archive(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.taskGroupsService.archive(id, userId);
  }

  @Post('task-groups/:id/unarchive')
  @ApiOperation({ summary: 'Unarchive task group' })
  unarchive(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.taskGroupsService.unarchive(id, userId);
  }

  @Delete('task-groups/:id')
  @ApiOperation({ summary: 'Delete task group' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.taskGroupsService.delete(id, userId);
  }

  @Get('task-groups/:id/members')
  @ApiOperation({ summary: 'Get task group members' })
  getMembers(@Param('id') id: string) {
    return this.taskGroupsService.getMembers(id);
  }

  @Post('task-groups/:id/members')
  @ApiOperation({ summary: 'Add member to task group' })
  addMember(
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    return this.taskGroupsService.addMember(id, userId);
  }

  @Delete('task-groups/:id/members/:userId')
  @ApiOperation({ summary: 'Remove member from task group' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.taskGroupsService.removeMember(id, userId);
  }

  @Post('task-groups/:id/tasks/:taskId')
  @ApiOperation({ summary: 'Add task to group' })
  addTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    return this.taskGroupsService.addTaskToGroup(taskId, id);
  }

  @Delete('task-groups/:id/tasks/:taskId')
  @ApiOperation({ summary: 'Remove task from group' })
  removeTask(@Param('taskId') taskId: string) {
    return this.taskGroupsService.removeTaskFromGroup(taskId);
  }
}
