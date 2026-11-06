import { Module } from '@nestjs/common';
import { DevicesController, InternalController, NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [DevicesController, NotificationsController, InternalController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
