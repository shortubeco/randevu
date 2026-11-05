import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class WorkingDayDto {
  @IsInt()
  @Min(0)
  @Max(6)
  gun!: number;

  @Matches(HHMM, { message: 'Saat HH:mm formatında olmalı' })
  baslangic!: string;

  @Matches(HHMM, { message: 'Saat HH:mm formatında olmalı' })
  bitis!: string;

  @IsOptional()
  @Matches(HHMM, { message: 'Saat HH:mm formatında olmalı' })
  molaBaslangic?: string;

  @IsOptional()
  @Matches(HHMM, { message: 'Saat HH:mm formatında olmalı' })
  molaBitis?: string;
}

export class ReplaceWorkingHoursDto {
  @IsArray()
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => WorkingDayDto)
  days!: WorkingDayDto[];
}

export class TimeOffDto {
  @IsISO8601()
  baslangic!: string;

  @IsISO8601()
  bitis!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sebep?: string;
}
