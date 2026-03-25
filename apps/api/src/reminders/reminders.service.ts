import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import type { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => require('../notifications/notifications.service').NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Set or update a reminder for a task.
   * Uses upsert because of @@unique([taskId, userId]).
   */
  async setReminder(taskId: string, userId: string, remindAt: Date) {
    if (remindAt.getTime() <= Date.now()) {
      throw new BadRequestException('Reminder time must be in the future');
    }

    // Verify task exists
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true },
    });
    if (!task) {
      throw new BadRequestException('Task not found');
    }

    return this.prisma.reminder.upsert({
      where: {
        taskId_userId: { taskId, userId },
      },
      create: {
        taskId,
        userId,
        remindAt,
        sent: false,
      },
      update: {
        remindAt,
        sent: false,
      },
    });
  }

  /**
   * Delete a reminder for a task.
   */
  async deleteReminder(taskId: string, userId: string) {
    try {
      return await this.prisma.reminder.delete({
        where: {
          taskId_userId: { taskId, userId },
        },
      });
    } catch {
      // If not found, just return null
      return null;
    }
  }

  /**
   * Get all upcoming (unsent) reminders for a user, with task info.
   */
  async getMyReminders(userId: string) {
    return this.prisma.reminder.findMany({
      where: {
        userId,
        sent: false,
      },
      include: {
        task: {
          select: { id: true, title: true, status: true, priority: true },
        },
      },
      orderBy: { remindAt: 'asc' },
    });
  }

  /**
   * Get reminder for a specific task and user.
   */
  async getReminder(taskId: string, userId: string) {
    return this.prisma.reminder.findUnique({
      where: {
        taskId_userId: { taskId, userId },
      },
    });
  }

  /**
   * Cancel all reminders for a task (mark as sent).
   * Called when a task is completed or cancelled.
   */
  async cancelTaskReminders(taskId: string) {
    await this.prisma.reminder.updateMany({
      where: { taskId, sent: false },
      data: { sent: true },
    });
  }

  /**
   * Cron job: check for due reminders every minute.
   * Sends TASK_REMINDER notifications and marks reminders as sent.
   */
  @Cron('* * * * *')
  async checkReminders() {
    const now = new Date();

    const dueReminders = await this.prisma.reminder.findMany({
      where: {
        remindAt: { lte: now },
        sent: false,
      },
      include: {
        task: { select: { id: true, title: true, status: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (dueReminders.length === 0) return;

    for (const reminder of dueReminders) {
      try {
        // Skip if task is already completed/cancelled
        if (
          reminder.task.status === 'COMPLETED' ||
          reminder.task.status === 'CANCELLED'
        ) {
          await this.prisma.reminder.update({
            where: { id: reminder.id },
            data: { sent: true },
          });
          continue;
        }

        await this.notificationsService.create({
          userId: reminder.userId,
          type: 'TASK_REMINDER',
          title: '태스크 리마인더',
          body: `"${reminder.task.title}" 태스크를 확인해주세요`,
          data: {
            taskId: reminder.taskId,
            taskTitle: reminder.task.title,
            reminderId: reminder.id,
          },
        });

        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: { sent: true },
        });
      } catch (error) {
        this.logger.error(
          `Failed to send reminder ${reminder.id}`,
          error,
        );
      }
    }
  }
}
