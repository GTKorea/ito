import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RemindersService } from './reminders.service';

@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  @Post('tasks/:id/reminder')
  @ApiOperation({ summary: 'Set a reminder for a task' })
  setReminder(
    @Param('id') taskId: string,
    @Body() body: { remindAt: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.remindersService.setReminder(
      taskId,
      userId,
      new Date(body.remindAt),
    );
  }

  @Delete('tasks/:id/reminder')
  @ApiOperation({ summary: 'Delete a reminder for a task' })
  deleteReminder(
    @Param('id') taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.remindersService.deleteReminder(taskId, userId);
  }

  @Get('tasks/:id/reminder')
  @ApiOperation({ summary: 'Get reminder for a specific task' })
  getReminder(
    @Param('id') taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.remindersService.getReminder(taskId, userId);
  }

  @Get('reminders/mine')
  @ApiOperation({ summary: 'Get all my upcoming reminders' })
  getMyReminders(@CurrentUser('id') userId: string) {
    return this.remindersService.getMyReminders(userId);
  }
}
