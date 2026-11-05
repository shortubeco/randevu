import { Module } from '@nestjs/common';
import {
  AdminAppointmentsController,
  AppointmentsController,
  AvailabilityController,
} from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  controllers: [AppointmentsController, AdminAppointmentsController, AvailabilityController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
