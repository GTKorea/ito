import { Module, forwardRef } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ActivityModule } from '../activity/activity.module';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [
    ActivityModule,
    forwardRef(() => require('../threads/threads.module').ThreadsModule),
    forwardRef(() => RemindersModule),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
