import { Module } from '@nestjs/common';
import { TaskGroupsController } from './task-groups.controller';
import { TaskGroupsService } from './task-groups.service';

@Module({
  controllers: [TaskGroupsController],
  providers: [TaskGroupsService],
  exports: [TaskGroupsService],
})
export class TaskGroupsModule {}
