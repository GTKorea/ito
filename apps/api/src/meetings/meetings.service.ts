import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

interface MeetingConfig {
  mode: string;
  options: string[];
  allowChange: boolean;
  anonymous: boolean;
  scheduledAt: string;
  duration?: number;
  agenda?: string;
  confirmed: boolean;
  confirmedAt?: string;
}

@Injectable()
export class MeetingsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async confirm(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        creator: { select: { id: true, name: true } },
        threadLinks: {
          where: { status: 'PENDING' },
          include: { toUser: { select: { id: true, name: true } } },
        },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.type !== 'MEETING')
      throw new BadRequestException('Task is not a meeting');
    if (task.creatorId !== userId)
      throw new ForbiddenException('Only the creator can confirm a meeting');

    const config = task.voteConfig as unknown as MeetingConfig;
    if (config?.confirmed)
      throw new BadRequestException('Meeting is already confirmed');

    // Update voteConfig with confirmed state
    const updatedConfig = {
      ...config,
      confirmed: true,
      confirmedAt: new Date().toISOString(),
    };

    await this.prisma.task.update({
      where: { id: taskId },
      data: { voteConfig: updatedConfig as any },
    });

    // Get attendees who voted "attend"
    const attendVotes = await this.prisma.vote.findMany({
      where: { taskId, choice: 'attend' },
    });
    const attendeeIds = attendVotes.map((v) => v.userId);

    // Notify all participants (including creator)
    const allParticipantIds = [
      ...new Set([
        ...attendeeIds,
        ...task.threadLinks.map((l) => l.toUserId).filter(Boolean),
      ]),
    ];

    for (const participantId of allParticipantIds) {
      if (!participantId || participantId === userId) continue;
      await this.notificationsService.create({
        userId: participantId,
        type: 'MEETING_CONFIRMED',
        title: `미팅이 확정되었습니다`,
        body: `"${task.title}" — ${new Date(config.scheduledAt).toLocaleString()}`,
        data: {
          taskId,
          taskTitle: task.title,
          scheduledAt: config.scheduledAt,
          confirmedBy: task.creator.name,
        },
      });
    }

    return { success: true };
  }

  async reschedule(
    taskId: string,
    userId: string,
    scheduledAt: string,
    duration?: number,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        creator: { select: { id: true, name: true } },
        threadLinks: {
          where: { status: 'PENDING' },
          include: { toUser: { select: { id: true, name: true } } },
        },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.type !== 'MEETING')
      throw new BadRequestException('Task is not a meeting');
    if (task.creatorId !== userId)
      throw new ForbiddenException('Only the creator can reschedule a meeting');

    const config = task.voteConfig as unknown as MeetingConfig;

    // Update config with new schedule, reset confirmed
    const updatedConfig = {
      ...config,
      scheduledAt,
      ...(duration !== undefined ? { duration } : {}),
      confirmed: false,
      confirmedAt: undefined,
    };

    await this.prisma.task.update({
      where: { id: taskId },
      data: { voteConfig: updatedConfig as any },
    });

    // Delete all existing votes to reset RSVPs
    await this.prisma.vote.deleteMany({ where: { taskId } });

    // Delete any existing dismissals since meeting is now unconfirmed
    await this.prisma.meetingDismissal.deleteMany({ where: { taskId } });

    // Notify all participants
    for (const link of task.threadLinks) {
      if (!link.toUserId || link.toUserId === userId) continue;
      await this.notificationsService.create({
        userId: link.toUserId,
        type: 'MEETING_RESCHEDULED',
        title: `미팅 일정이 변경되었습니다`,
        body: `"${task.title}" — ${new Date(scheduledAt).toLocaleString()}`,
        data: {
          taskId,
          taskTitle: task.title,
          scheduledAt,
          rescheduledBy: task.creator.name,
        },
      });
    }

    return { success: true };
  }

  async dismiss(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.type !== 'MEETING')
      throw new BadRequestException('Task is not a meeting');

    await this.prisma.meetingDismissal.upsert({
      where: { taskId_userId: { taskId, userId } },
      create: { taskId, userId },
      update: {},
    });

    return { success: true };
  }

  async restore(taskId: string, userId: string) {
    await this.prisma.meetingDismissal.deleteMany({
      where: { taskId, userId },
    });

    return { success: true };
  }

  async cancel(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        creator: { select: { id: true, name: true } },
        threadLinks: {
          where: { status: 'PENDING' },
          include: { toUser: { select: { id: true, name: true } } },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.type !== 'MEETING')
      throw new BadRequestException('Task is not a meeting');
    if (task.creatorId !== userId)
      throw new ForbiddenException('Only the creator can cancel a meeting');

    // Set task status to CANCELLED
    await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'CANCELLED' },
    });

    // Clean up votes and dismissals
    await this.prisma.vote.deleteMany({ where: { taskId } });
    await this.prisma.meetingDismissal.deleteMany({ where: { taskId } });

    // Notify participants
    for (const link of task.threadLinks) {
      if (!link.toUserId || link.toUserId === userId) continue;
      await this.notificationsService.create({
        userId: link.toUserId,
        type: 'MEETING_CANCELLED',
        title: '미팅이 취소되었습니다',
        body: `"${task.title}" 미팅이 ${task.creator.name}에 의해 취소되었습니다`,
        data: { taskId, taskTitle: task.title, cancelledBy: task.creator.name },
      });
    }

    return { success: true };
  }

  async getStatus(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        threadLinks: {
          where: { status: 'PENDING' },
          include: { toUser: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.type !== 'MEETING')
      throw new BadRequestException('Task is not a meeting');

    const config = task.voteConfig as unknown as MeetingConfig;

    const votes = await this.prisma.vote.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const attending = votes
      .filter((v) => v.choice === 'attend')
      .map((v) => v.user);
    const declined = votes
      .filter((v) => v.choice === 'decline')
      .map((v) => v.user);
    const pending = task.threadLinks
      .filter(
        (l) =>
          l.toUserId && !votes.some((v) => v.userId === l.toUserId),
      )
      .map((l) => l.toUser)
      .filter(Boolean);

    const userVote = votes.find((v) => v.userId === userId);
    const isDismissed = await this.prisma.meetingDismissal.findUnique({
      where: { taskId_userId: { taskId, userId } },
    });

    return {
      scheduledAt: config?.scheduledAt,
      duration: config?.duration,
      agenda: config?.agenda,
      confirmed: config?.confirmed || false,
      confirmedAt: config?.confirmedAt,
      userResponse: userVote?.choice,
      isDismissed: !!isDismissed,
      attending,
      declined,
      pending,
      totalInvited: task.threadLinks.length,
    };
  }
}
