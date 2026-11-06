import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccountService } from './account.service';
import { ACCESS_TOKEN_TTL, accessSecret } from './auth.config';
import { JwtAuthGuard, RolesGuard } from './guards';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    SettingsModule,
    JwtModule.register({
      secret: accessSecret(),
      signOptions: { expiresIn: ACCESS_TOKEN_TTL },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccountService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AccountService],
})
export class AuthModule {}
