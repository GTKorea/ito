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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  DeleteWorkspaceDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/create-workspace.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiConsumes } from '@nestjs/swagger';
import { FilesService } from '../files/files.service';

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(
    private workspacesService: WorkspacesService,
    private filesService: FilesService,
  ) {}

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

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace settings (OWNER/ADMIN only)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.update(id, dto, userId);
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
    return this.workspacesService.invite(id, dto.email, userId, dto.role);
  }

  @Post('join/:token')
  @ApiOperation({ summary: 'Accept workspace invite' })
  join(
    @Param('token') token: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.acceptInvite(token, userId);
  }

  @Patch(':workspaceId/members/:userId/role')
  @ApiOperation({ summary: 'Update a member role (OWNER/ADMIN only)' })
  updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('id') requestingUserId: string,
  ) {
    return this.workspacesService.updateMemberRole(
      workspaceId,
      userId,
      dto.role,
      requestingUserId,
    );
  }

  @Delete(':workspaceId/members/:userId')
  @ApiOperation({ summary: 'Remove a member or leave workspace' })
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @CurrentUser('id') requestingUserId: string,
  ) {
    return this.workspacesService.removeMember(
      workspaceId,
      userId,
      requestingUserId,
    );
  }

  @Post(':id/seed-sample-data')
  @ApiOperation({ summary: 'Seed sample data for onboarding (owner only, empty workspace only)' })
  seedSampleData(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.seedSampleData(id, userId);
  }

  @Get(':workspaceId/members/:userId/summary')
  @ApiOperation({ summary: 'Get member summary with stats' })
  getMemberSummary(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.workspacesService.getMemberSummary(workspaceId, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workspace (OWNER only, requires name confirmation)' })
  deleteWorkspace(
    @Param('id') id: string,
    @Body() dto: DeleteWorkspaceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.deleteWorkspace(id, dto.confirmName, userId);
  }

  @Post(':id/logo')
  @ApiOperation({ summary: 'Upload workspace logo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo', { storage: undefined }))
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.filesService.uploadWorkspaceLogo(file, id, userId);
  }
}
