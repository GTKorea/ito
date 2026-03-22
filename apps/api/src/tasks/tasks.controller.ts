import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post('workspaces/:workspaceId/tasks')
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: 'Create a task' })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.create(dto, workspaceId, userId);
  }

  @Get('workspaces/:workspaceId/tasks/categorized')
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: 'Get tasks categorized by action required, waiting, completed' })
  findCategorized(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Query('taskGroupId') taskGroupId?: string,
  ) {
    return this.tasksService.findCategorized(workspaceId, userId, taskGroupId);
  }

  @Get('workspaces/:workspaceId/tasks/calendar')
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: 'Get calendar tasks (completed + upcoming)' })
  getCalendarTasks(
    @Param('workspaceId') workspaceId: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('userId') userId?: string,
  ) {
    return this.tasksService.getCalendarTasks(workspaceId, start, end, userId);
  }

  @Get('workspaces/:workspaceId/tasks')
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: 'List tasks in workspace' })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Query('assignedToMe') assignedToMe?: string,
    @Query('connectedByMe') connectedByMe?: string,
    @Query('status') status?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.tasksService.findAllInWorkspace(workspaceId, userId, {
      assignedToMe: assignedToMe === 'true',
      connectedByMe: connectedByMe === 'true',
      status,
      teamId,
    });
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task details' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update a task' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.update(id, dto, userId);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Delete a task' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.tasksService.delete(id, userId);
  }
}
