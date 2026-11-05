import { Controller, Get } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../auth/roles.enum';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@Roles(Role.ADMIN, Role.KUAFOR)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.dashboard.get(user);
  }
}
