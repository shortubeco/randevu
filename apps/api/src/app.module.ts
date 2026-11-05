import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from './schedule/schedule.module';
import { ServicesModule } from './services/services.module';
import { StylistsModule } from './stylists/stylists.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ServicesModule,
    StylistsModule,
    ScheduleModule,
    AppointmentsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
