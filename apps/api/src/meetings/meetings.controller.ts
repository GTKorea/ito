import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MeetingsService } from './meetings.service';

@ApiTags('meetings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks/:taskId/meeting')
export class MeetingsController {
  constructor(private meetingsService: MeetingsService) {}

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm a meeting (creator only)' })
  confirm(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.meetingsService.confirm(taskId, userId);
  }

  @Post('reschedule')
  @ApiOperation({ summary: 'Reschedule a meeting — resets all RSVPs' })
  reschedule(
    @Param('taskId') taskId: string,
    @Body() body: { scheduledAt: string; duration?: number },
    @CurrentUser('id') userId: string,
  ) {
    return this.meetingsService.reschedule(
      taskId,
      userId,
      body.scheduledAt,
      body.duration,
    );
  }

  @Post('dismiss')
  @ApiOperation({ summary: 'Dismiss a confirmed meeting announcement' })
  dismiss(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.meetingsService.dismiss(taskId, userId);
  }

  @Post('restore')
  @ApiOperation({ summary: 'Restore a dismissed meeting announcement' })
  restore(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.meetingsService.restore(taskId, userId);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel a meeting' })
  cancel(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.meetingsService.cancel(taskId, userId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get meeting RSVP status' })
  getStatus(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.meetingsService.getStatus(taskId, userId);
  }
}
