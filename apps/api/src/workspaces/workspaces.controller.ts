import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, InviteMemberDto } from './dto/create-workspace.dto';

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a workspace' })
  create(
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: "List user's workspaces" })
  findAll(@CurrentUser('id') userId: string) {
    return this.workspacesService.findAllForUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace details' })
  findOne(@Param('id') id: string) {
    return this.workspacesService.findById(id);
  }

  @Get('invites/:token')
  @ApiOperation({ summary: 'Get invite info by token' })
  getInviteInfo(@Param('token') token: string) {
    return this.workspacesService.getInviteInfo(token);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a member by email' })
  invite(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.invite(id, dto.email, userId);
  }

  @Post('join/:token')
  @ApiOperation({ summary: 'Accept workspace invite' })
  join(
    @Param('token') token: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.acceptInvite(token, userId);
  }
}
