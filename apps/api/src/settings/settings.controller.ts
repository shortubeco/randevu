import { Body, Controller, Get, Put } from '@nestjs/common';
import { AuthUser, CurrentUser, Public, Roles } from '../auth/decorators';
import { Role } from '../auth/roles.enum';
import { UpdateHavaleDto } from './settings.dto';
import { SettingsService } from './settings.service';

// Ödeme sayfası için havale bilgisi. Herkese açık (işletme kaydı öncesi de görünür).
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('havale')
  havale() {
    return this.settings.getHavale();
  }
}

// Platform admini: havale bilgisini ayarlar.
@Controller('admin/settings')
@Roles(Role.PLATFORM_ADMIN)
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Put('havale')
  setHavale(@CurrentUser() user: AuthUser, @Body() dto: UpdateHavaleDto) {
    return this.settings.setHavale(user.sub, dto);
  }
}
