import { IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Onay: havale kontrol edildikten sonra. Ücretli planda ödeme günü ve ilk ödeme tarihi zorunlu.
export class ApproveIsletmeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  odemeGunu?: number;

  @IsOptional()
  @Matches(DATE, { message: 'Tarih YYYY-MM-DD formatında olmalı' })
  odemeTarihi?: string;
}

export class UpdateStatusDto {
  @IsIn(['AKTIF', 'PASIF'])
  durum!: string;
}

export class PaymentDayDto {
  @IsInt()
  @Min(1)
  @Max(31)
  odemeGunu!: number;
}

export class PaymentsQuery {
  @Matches(DATE, { message: 'Tarih YYYY-MM-DD formatında olmalı' })
  date!: string;
}

export class RecordPaymentDto {
  @IsInt()
  isletmeId!: number;

  @Matches(DATE, { message: 'Tarih YYYY-MM-DD formatında olmalı' })
  odemeTarihi!: string;
}

export class UpdatePlanDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000000)
  aylikUcret!: number;
}

export class AuditQuery {
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{1,3}$/)
  limit?: string;
}
