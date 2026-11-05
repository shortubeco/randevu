import { Module } from '@nestjs/common';
import { AdminScheduleController, OwnScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  controllers: [OwnScheduleController, AdminScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
