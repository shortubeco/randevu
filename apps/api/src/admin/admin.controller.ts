import { Controller, Get, Query } from '@nestjs/common';
import { IsISO8601 } from 'class-validator';
import { Roles } from '../auth/decorators';
import { Role } from '../auth/roles.enum';
import { AdminService } from './admin.service';

class ReportQuery {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}

@Controller('admin')
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('customers')
  customers() {
    return this.admin.customers();
  }

  @Get('reports')
  reports(@Query() q: ReportQuery) {
    return this.admin.reports(q.from, q.to);
  }
}
