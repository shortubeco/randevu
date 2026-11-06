import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { AuthUser, CurrentUser, Public } from '../auth/decorators';
import { RegisterDeviceDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto) {
    return this.notifications.registerDevice(user.sub, dto.expoPushToken);
  }

  @Delete(':token')
  unregister(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.notifications.unregisterDevice(user.sub, decodeURIComponent(token));
  }
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.notifications.listForUser(user.sub);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.sub);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  readAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.sub);
  }
}

// Dış zamanlayıcı (cPanel cron) için. CRON_SECRET tanımlı değilse kapalıdır.
@Controller('internal')
export class InternalController {
  constructor(private readonly notifications: NotificationsService) {}

  @Public()
  @Post('reminders/run')
  @HttpCode(HttpStatus.OK)
  async reminders(@Headers('x-cron-secret') secret: string | undefined) {
    const expected = process.env.CRON_SECRET;
    if (!expected || secret !== expected) throw new ForbiddenException();
    return { gonderilen: await this.notifications.runReminders() };
  }
}
