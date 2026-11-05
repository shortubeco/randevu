import { IsOptional, IsInt, IsIn, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';

export const APPOINTMENT_STATUSES = ['BEKLIYOR', 'ONAYLANDI', 'IPTAL', 'TAMAMLANDI', 'GELMEDI'] as const;

export class CreateAppointmentDto {
  @IsInt()
  stylistId!: number;

  @IsInt()
  serviceId!: number;

  @IsISO8601()
  startsAt!: string;
}

export class RescheduleDto {
  @IsISO8601()
  startsAt!: string;
}

export class UpdateStatusDto {
  @IsIn(['ONAYLANDI', 'IPTAL', 'TAMAMLANDI', 'GELMEDI'])
  status!: string;
}

export class ListAppointmentsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stylistId?: number;

  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES as unknown as string[])
  status?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
