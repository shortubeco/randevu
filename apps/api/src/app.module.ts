import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { LandingModule } from './landing/landing.module';
import { LocationsModule } from './locations/locations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlansModule } from './plans/plans.module';
import { ProfileModule } from './profile/profile.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ScheduleModule } from './schedule/schedule.module';
import { SettingsModule } from './settings/settings.module';
import { StylistsModule } from './stylists/stylists.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ProfileModule,
    PlansModule,
    LandingModule,
    LocationsModule,
    BusinessModule,
    StylistsModule,
    ScheduleModule,
    AppointmentsModule,
    ReviewsModule,
    NotificationsModule,
    DashboardModule,
    AdminModule,
    SettingsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
