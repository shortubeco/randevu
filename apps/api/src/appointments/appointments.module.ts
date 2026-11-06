import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AppointmentsController, AvailabilityController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [NotificationsModule],
  controllers: [AppointmentsController, AvailabilityController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
