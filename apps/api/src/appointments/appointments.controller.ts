import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthUser, CurrentUser, Public, Roles } from '../auth/decorators';
import { Role } from '../auth/roles.enum';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  ListAppointmentsQuery,
  RescheduleDto,
  UpdateStatusDto,
} from './appointments.dto';

// Müşteri: kendi randevuları. Kuaför ve işletme sahibi: kendi kapsamları.
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @Roles(Role.MUSTERI)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(user.sub, dto);
  }

  @Get('mine')
  @Roles(Role.MUSTERI)
  mine(@CurrentUser() user: AuthUser) {
    return this.appointments.listForCustomer(user.sub);
  }

  @Patch(':id/cancel')
  @Roles(Role.MUSTERI)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.appointments.cancelByCustomer(user.sub, id);
  }

  @Patch(':id/reschedule')
  @Roles(Role.MUSTERI)
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleDto,
  ) {
    return this.appointments.reschedule(user.sub, id, dto);
  }

  @Get('stylist')
  @Roles(Role.KUAFOR)
  stylistList(@CurrentUser() user: AuthUser, @Query() q: ListAppointmentsQuery) {
    return this.appointments.listForStylist(user.sub, q);
  }

  @Get('business')
  @Roles(Role.ISLETME_SAHIBI)
  businessList(@CurrentUser() user: AuthUser, @Query() q: ListAppointmentsQuery) {
    return this.appointments.listForOwner(user.sub, q);
  }

  @Patch(':id/status')
  @Roles(Role.KUAFOR, Role.ISLETME_SAHIBI)
  status(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.appointments.updateStatus(user, id, dto.status);
  }

  @Delete(':id')
  @Roles(Role.KUAFOR, Role.ISLETME_SAHIBI)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.appointments.remove(user, id);
  }
}

// Müsaitlik: giriş yapmış herkes görebilir.
@Controller('stylists')
export class AvailabilityController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get(':id/availability')
  availability(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date: string,
    @Query('serviceId', ParseIntPipe) serviceId: number,
  ) {
    if (!date) throw new BadRequestException('date parametresi zorunlu');
    return this.appointments.availability(id, date, serviceId);
  }
}
