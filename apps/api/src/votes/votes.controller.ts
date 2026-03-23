import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VotesService } from './votes.service';
import { CastVoteDto } from './dto/cast-vote.dto';

@ApiTags('votes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks/:taskId/vote')
export class VotesController {
  constructor(private votesService: VotesService) {}

  @Post()
  @ApiOperation({ summary: 'Cast a vote' })
  castVote(
    @Param('taskId') taskId: string,
    @Body() dto: CastVoteDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.votesService.castVote(taskId, userId, dto);
  }

  @Get('results')
  @ApiOperation({ summary: 'Get vote results (must have voted first)' })
  getResults(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.votesService.getResults(taskId, userId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get vote status' })
  getStatus(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.votesService.getStatus(taskId, userId);
  }
}
