import { Module } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackController } from './slack.controller';
import { TasksModule } from '../tasks/tasks.module';
import { ThreadsModule } from '../threads/threads.module';

@Module({
  imports: [TasksModule, ThreadsModule],
  controllers: [SlackController],
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}
