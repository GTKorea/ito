import {
  Controller,
  Post,
  Get,
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
import { TeamsService } from './teams.service';

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
@Controller('workspaces/:workspaceId/teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a team' })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body('name') name: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.teamsService.create(workspaceId, name, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List teams in workspace' })
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.teamsService.findAllInWorkspace(workspaceId);
  }

  @Get(':teamId')
  @ApiOperation({ summary: 'Get team with members' })
  findOne(@Param('teamId') teamId: string) {
    return this.teamsService.findById(teamId);
  }

  @Get(':teamId/dashboard')
  @ApiOperation({ summary: 'Get team workload dashboard' })
  getDashboard(@Param('teamId') teamId: string) {
    return this.teamsService.getTeamDashboard(teamId);
  }

  @Get(':teamId/tasks')
  @ApiOperation({ summary: "Get team's tasks" })
  getTeamTasks(
    @Param('teamId') teamId: string,
    @Query('status') status?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.teamsService.getTeamTasks(teamId, { status, assigneeId });
  }

  @Post(':teamId/members')
  @ApiOperation({ summary: 'Add member to team' })
  addMember(
    @Param('teamId') teamId: string,
    @Body('userId') userId: string,
  ) {
    return this.teamsService.addMember(teamId, userId);
  }

  @Delete(':teamId/members/:userId')
  @ApiOperation({ summary: 'Remove member from team' })
  removeMember(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    return this.teamsService.removeMember(teamId, userId);
  }

  @Delete(':teamId')
  @ApiOperation({ summary: 'Delete a team' })
  delete(@Param('teamId') teamId: string) {
    return this.teamsService.delete(teamId);
  }
}
