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
import { assertStylistOwnedBy, stylistIdOfUser } from '../common/ownership';
import { DatabaseService } from '../database/database.service';
import { Sql } from '../scheduling/scheduling';
import { ReplaceWorkingHoursDto, TimeOffDto } from './schedule.dto';
import { ScheduleService } from './schedule.service';

// Kuaförün kendi çalışma saatleri ve izinleri.
@Controller('stylists/me')
@Roles(Role.KUAFOR)
export class OwnScheduleController {
  constructor(
    private readonly schedule: ScheduleService,
    private readonly db: DatabaseService,
  ) {}

  private sql: Sql = (t, p) => this.db.query(t, p);

  @Get('working-hours')
  async getWorkingHours(@CurrentUser() user: AuthUser) {
    return this.schedule.getWorkingHours(await stylistIdOfUser(this.sql, user.sub));
  }

  @Put('working-hours')
  async replaceWorkingHours(@CurrentUser() user: AuthUser, @Body() dto: ReplaceWorkingHoursDto) {
    return this.schedule.replaceWorkingHours(await stylistIdOfUser(this.sql, user.sub), dto);
  }

  @Get('time-off')
  async listTimeOff(@CurrentUser() user: AuthUser) {
    return this.schedule.listTimeOff(await stylistIdOfUser(this.sql, user.sub));
  }

  @Post('time-off')
  async addTimeOff(@CurrentUser() user: AuthUser, @Body() dto: TimeOffDto) {
    return this.schedule.addTimeOff(await stylistIdOfUser(this.sql, user.sub), dto);
  }

  @Delete('time-off/:tid')
  async removeTimeOff(@CurrentUser() user: AuthUser, @Param('tid', ParseIntPipe) tid: number) {
    return this.schedule.removeTimeOff(await stylistIdOfUser(this.sql, user.sub), tid);
  }
}

// İşletme sahibi, kendi işletmesindeki kuaförlerin çalışma saatlerini ve izinlerini yönetir.
@Controller('business/stylists/:id')
@Roles(Role.ISLETME_SAHIBI)
export class OwnerScheduleController {
  constructor(
    private readonly schedule: ScheduleService,
    private readonly db: DatabaseService,
  ) {}

  private sql: Sql = (t, p) => this.db.query(t, p);

  @Get('working-hours')
  async getWorkingHours(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    await assertStylistOwnedBy(this.sql, id, user.sub);
    return this.schedule.getWorkingHours(id);
  }

  @Put('working-hours')
  async replaceWorkingHours(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceWorkingHoursDto,
  ) {
    await assertStylistOwnedBy(this.sql, id, user.sub);
    return this.schedule.replaceWorkingHours(id, dto);
  }

  @Get('time-off')
  async listTimeOff(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    await assertStylistOwnedBy(this.sql, id, user.sub);
    return this.schedule.listTimeOff(id);
  }

  @Post('time-off')
  async addTimeOff(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TimeOffDto,
  ) {
    await assertStylistOwnedBy(this.sql, id, user.sub);
    return this.schedule.addTimeOff(id, dto);
  }

  @Delete('time-off/:tid')
  async removeTimeOff(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('tid', ParseIntPipe) tid: number,
  ) {
    await assertStylistOwnedBy(this.sql, id, user.sub);
    return this.schedule.removeTimeOff(id, tid);
  }
}
