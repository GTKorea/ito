import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SharedSpacesService } from './shared-spaces.service';
import {
  CreateSharedSpaceDto,
  UpdateSharedSpaceDto,
  InviteWorkspaceDto,
  CreateSharedSpaceTaskDto,
} from './dto/shared-space.dto';

@ApiTags('shared-spaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shared-spaces')
export class SharedSpacesController {
  constructor(private sharedSpacesService: SharedSpacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a shared space' })
  create(
    @Body() dto: CreateSharedSpaceDto,
    @CurrentUser('id') userId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    return this.sharedSpacesService.create(dto, userId, workspaceId);
  }

  @Get()
  @ApiOperation({ summary: 'List shared spaces for current workspace' })
  findAll(@Headers('x-workspace-id') workspaceId: string) {
    return this.sharedSpacesService.findAllForWorkspace(workspaceId);
  }

  @Get('invites/:token')
  @ApiOperation({ summary: 'Get invite info by token' })
  getInviteInfo(@Param('token') token: string) {
    return this.sharedSpacesService.getInviteInfo(token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shared space details' })
  findOne(
    @Param('id') id: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    return this.sharedSpacesService.findById(id, workspaceId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update shared space (OWNER/ADMIN only)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSharedSpaceDto,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    return this.sharedSpacesService.update(id, dto, workspaceId);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a workspace by slug' })
  invite(
    @Param('id') id: string,
    @Body() dto: InviteWorkspaceDto,
    @CurrentUser('id') userId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    return this.sharedSpacesService.inviteWorkspace(id, dto, userId, workspaceId);
  }

  @Post('join/:token')
  @ApiOperation({ summary: 'Accept shared space invite' })
  join(
    @Param('token') token: string,
    @CurrentUser('id') userId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    return this.sharedSpacesService.acceptInvite(token, userId, workspaceId);
  }

  @Delete(':id/participants/:workspaceId')
  @ApiOperation({ summary: 'Remove workspace from shared space (OWNER only)' })
  removeParticipant(
    @Param('id') id: string,
    @Param('workspaceId') targetWorkspaceId: string,
    @Headers('x-workspace-id') requestingWorkspaceId: string,
  ) {
    return this.sharedSpacesService.removeParticipant(
      id,
      targetWorkspaceId,
      requestingWorkspaceId,
    );
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'Get tasks in shared space' })
  getTasks(
    @Param('id') id: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    return this.sharedSpacesService.getTasks(id, workspaceId);
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Create task in shared space' })
  createTask(
    @Param('id') id: string,
    @Body() dto: CreateSharedSpaceTaskDto,
    @CurrentUser('id') userId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    return this.sharedSpacesService.createTask(id, dto, userId, workspaceId);
  }
}
