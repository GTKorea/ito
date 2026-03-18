import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActivityService } from './activity.service';

@ApiTags('activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get('workspaces/:workspaceId/activity')
  @ApiOperation({ summary: 'Get activity log for a workspace' })
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.activityService.findAllInWorkspace(workspaceId);
  }
}
