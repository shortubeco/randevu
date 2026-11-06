import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../auth/roles.enum';
import { AdminService } from './admin.service';
import {
  ApproveIsletmeDto,
  AuditQuery,
  PaymentDayDto,
  PaymentsQuery,
  RecordPaymentDto,
  UpdatePlanDto,
  UpdateStatusDto,
} from './admin.dto';

// Platform admini: işletme onayı, aktif/pasif, ödeme takibi, plan fiyatları, denetim kaydı.
@Controller('admin')
@Roles(Role.PLATFORM_ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('business')
  businesses() {
    return this.admin.listBusinesses();
  }

  @Get('business/:id')
  business(@Param('id', ParseIntPipe) id: number) {
    return this.admin.getBusiness(id);
  }

  @Post('business/:id/approve')
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveIsletmeDto,
  ) {
    return this.admin.approve(user.sub, id, dto);
  }

  @Patch('business/:id/status')
  status(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.admin.setStatus(user.sub, id, dto.durum as 'AKTIF' | 'PASIF');
  }

  @Patch('business/:id/payment-day')
  paymentDay(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaymentDayDto,
  ) {
    return this.admin.setPaymentDay(user.sub, id, dto.odemeGunu);
  }

  @Get('payments')
  payments(@Query() q: PaymentsQuery) {
    return this.admin.payments(q.date);
  }

  @Post('payments')
  recordPayment(@CurrentUser() user: AuthUser, @Body() dto: RecordPaymentDto) {
    return this.admin.recordPayment(user.sub, dto.isletmeId, dto.odemeTarihi);
  }

  @Patch('plans/:kod')
  updatePlan(
    @CurrentUser() user: AuthUser,
    @Param('kod') kod: string,
    @Body() dto: UpdatePlanDto,
  ) {
    if (!['UCRETSIZ', 'SILVER', 'GOLD'].includes(kod)) throw new BadRequestException('Geçersiz plan');
    return this.admin.updatePlan(user.sub, kod, dto.aylikUcret);
  }

  @Get('audit')
  audit(@Query() q: AuditQuery) {
    return this.admin.audit(Math.min(Number(q.limit ?? 100), 500));
  }
}
