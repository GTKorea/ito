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
import { TodosService } from './todos.service';
import { CreateTodoDto, UpdateTodoDto } from './dto/create-todo.dto';

@ApiTags('todos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TodosController {
  constructor(private todosService: TodosService) {}

  @Post('workspaces/:workspaceId/todos')
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: 'Create a todo' })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateTodoDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.todosService.create(dto, workspaceId, userId);
  }

  @Get('workspaces/:workspaceId/todos')
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: 'List todos in workspace' })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Query('assignedToMe') assignedToMe?: string,
    @Query('status') status?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.todosService.findAllInWorkspace(workspaceId, userId, {
      assignedToMe: assignedToMe === 'true',
      status,
      teamId,
    });
  }

  @Get('todos/:id')
  @ApiOperation({ summary: 'Get todo details' })
  findOne(@Param('id') id: string) {
    return this.todosService.findById(id);
  }

  @Patch('todos/:id')
  @ApiOperation({ summary: 'Update a todo' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTodoDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.todosService.update(id, dto, userId);
  }

  @Delete('todos/:id')
  @ApiOperation({ summary: 'Delete a todo' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.todosService.delete(id, userId);
  }
}
