import { Module } from '@nestjs/common';
import { SharedSpacesController } from './shared-spaces.controller';
import { SharedSpacesService } from './shared-spaces.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SharedSpacesController],
  providers: [SharedSpacesService],
  exports: [SharedSpacesService],
})
export class SharedSpacesModule {}
