import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { ProfileModule } from './profile/profile.module';
import { ScheduleModule } from './schedule/schedule.module';
import { ServicesModule } from './services/services.module';
import { StylistsModule } from './stylists/stylists.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ProfileModule,
    ServicesModule,
    StylistsModule,
    ScheduleModule,
    AppointmentsModule,
    AdminModule,
    DashboardModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
