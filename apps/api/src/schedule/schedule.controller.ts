import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../auth/roles.enum';
import { ReplaceWorkingHoursDto, TimeOffDto } from './schedule.dto';
import { ScheduleService } from './schedule.service';

// Kuaförün kendi çalışma saatleri ve izinleri.
@Controller('stylists/me')
@Roles(Role.KUAFOR)
export class OwnScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get('working-hours')
  async getWorkingHours(@CurrentUser() user: AuthUser) {
    return this.schedule.getWorkingHours(await this.schedule.stylistIdOfUser(user.sub));
  }

  @Put('working-hours')
  async replaceWorkingHours(@CurrentUser() user: AuthUser, @Body() dto: ReplaceWorkingHoursDto) {
    return this.schedule.replaceWorkingHours(await this.schedule.stylistIdOfUser(user.sub), dto);
  }

  @Get('time-off')
  async listTimeOff(@CurrentUser() user: AuthUser) {
    return this.schedule.listTimeOff(await this.schedule.stylistIdOfUser(user.sub));
  }

  @Post('time-off')
  async addTimeOff(@CurrentUser() user: AuthUser, @Body() dto: TimeOffDto) {
    return this.schedule.addTimeOff(await this.schedule.stylistIdOfUser(user.sub), dto);
  }

  @Delete('time-off/:tid')
  async removeTimeOff(@CurrentUser() user: AuthUser, @Param('tid', ParseIntPipe) tid: number) {
    return this.schedule.removeTimeOff(await this.schedule.stylistIdOfUser(user.sub), tid);
  }
}

// ADMIN, herhangi bir kuaförün çalışma saatlerini ve izinlerini yönetir.
@Controller('admin/stylists/:id')
@Roles(Role.ADMIN)
export class AdminScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get('working-hours')
  getWorkingHours(@Param('id', ParseIntPipe) id: number) {
    return this.schedule.getWorkingHours(id);
  }

  @Put('working-hours')
  replaceWorkingHours(@Param('id', ParseIntPipe) id: number, @Body() dto: ReplaceWorkingHoursDto) {
    return this.schedule.replaceWorkingHours(id, dto);
  }

  @Get('time-off')
  listTimeOff(@Param('id', ParseIntPipe) id: number) {
    return this.schedule.listTimeOff(id);
  }

  @Post('time-off')
  addTimeOff(@Param('id', ParseIntPipe) id: number, @Body() dto: TimeOffDto) {
    return this.schedule.addTimeOff(id, dto);
  }

  @Delete('time-off/:tid')
  removeTimeOff(@Param('id', ParseIntPipe) id: number, @Param('tid', ParseIntPipe) tid: number) {
    return this.schedule.removeTimeOff(id, tid);
  }
}
