import { Module } from '@nestjs/common';
import { OwnScheduleController, OwnerScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  controllers: [OwnScheduleController, OwnerScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
