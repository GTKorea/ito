import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CastVoteDto } from './dto/cast-vote.dto';

interface VoteConfig {
  mode: 'approve_reject' | 'custom';
  options: string[];
  allowChange?: boolean;
  anonymous?: boolean;
}

@Injectable()
export class VotesService {
  constructor(private prisma: PrismaService) {}

  async castVote(taskId: string, userId: string, dto: CastVoteDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { threadLinks: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.type !== 'VOTE')
      throw new BadRequestException('Task is not a vote task');

    // Validate choice against voteConfig
    const config = task.voteConfig as VoteConfig | null;
    if (config?.options && !config.options.includes(dto.choice)) {
      throw new BadRequestException(
        `Invalid choice. Options: ${config.options.join(', ')}`,
      );
    }

    // Check if user can vote (must be connected via thread link)
    const isParticipant =
      task.creatorId === userId ||
      task.threadLinks.some(
        (l) => l.toUserId === userId && l.status === 'PENDING',
      );
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this vote');
    }

    // Check if already voted and allowChange
    const existing = await this.prisma.vote.findUnique({
      where: { taskId_userId: { taskId, userId } },
    });
    if (existing) {
      if (config?.allowChange) {
        return this.prisma.vote.update({
          where: { id: existing.id },
          data: { choice: dto.choice, comment: dto.comment },
        });
      }
      throw new ConflictException('You have already voted');
    }

    const vote = await this.prisma.vote.create({
      data: {
        taskId,
        userId,
        choice: dto.choice,
        comment: dto.comment,
      },
    });

    // Check if all participants have voted
    await this.checkVoteCompletion(taskId);

    return vote;
  }

  async getResults(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.type !== 'VOTE')
      throw new BadRequestException('Task is not a vote task');

    // User must have voted to see results
    const userVote = await this.prisma.vote.findUnique({
      where: { taskId_userId: { taskId, userId } },
    });

    const config = task.voteConfig as VoteConfig | null;
    const isCreator = task.creatorId === userId;

    if (!userVote && !isCreator) {
      throw new ForbiddenException('You must vote before seeing results');
    }

    const votes = await this.prisma.vote.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Aggregate results
    const options = config?.options || [];
    const results = options.map((option: string) => ({
      option,
      count: votes.filter((v) => v.choice === option).length,
      voters: config?.anonymous
        ? []
        : votes.filter((v) => v.choice === option).map((v) => v.user),
    }));

    return {
      results,
      totalVotes: votes.length,
      userVote: userVote?.choice,
      anonymous: config?.anonymous || false,
    };
  }

  async getStatus(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { threadLinks: { where: { status: 'PENDING' } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const userVote = await this.prisma.vote.findUnique({
      where: { taskId_userId: { taskId, userId } },
    });

    const totalVoters = task.threadLinks.filter((l) => l.toUserId).length;
    const votedCount = await this.prisma.vote.count({ where: { taskId } });

    return {
      hasVoted: !!userVote,
      userChoice: userVote?.choice,
      totalVoters,
      votedCount,
      isComplete: votedCount >= totalVoters,
    };
  }

  private async checkVoteCompletion(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { threadLinks: { where: { status: 'PENDING' } } },
    });
    if (!task) return;

    const totalVoters = task.threadLinks.filter((l) => l.toUserId).length;
    const votedCount = await this.prisma.vote.count({ where: { taskId } });

    if (votedCount >= totalVoters && totalVoters > 0) {
      // Create notification for creator
      await this.prisma.notification.create({
        data: {
          type: 'VOTE_COMPLETE',
          userId: task.creatorId,
          title: 'Vote completed',
          data: {
            taskId,
            taskTitle: task.title,
            votedCount,
            totalVoters,
          },
        },
      });
    }
  }
}
