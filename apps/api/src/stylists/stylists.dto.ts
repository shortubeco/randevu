import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

const PHONE = /^\+?[0-9]{10,15}$/;

// İşletme sahibi, kendi dükkanına kuaför ekler: e-posta ve geçici şifre verir.
export class CreateStylistDto {
  @IsInt()
  shopId!: number;

  @IsString()
  @Length(2, 60)
  ad!: string;

  @IsString()
  @Length(2, 60)
  soyad!: string;

  @IsString()
  @Matches(PHONE, { message: 'Telefon numarası geçersiz' })
  telefon!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(120)
  slotDakika?: number;
}

// İşletme sahibi, kuaförü düzenler. password verilirse geçici şifre olur ve ilk girişte değiştirilir.
export class UpdateStylistDto {
  @IsOptional()
  @IsString()
  @Length(2, 60)
  ad?: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  soyad?: string;

  @IsOptional()
  @Matches(PHONE, { message: 'Telefon numarası geçersiz' })
  telefon?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(120)
  slotDakika?: number;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;
}

// Kuaförün kendi profili.
export class UpdateOwnStylistDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  photoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(120)
  slotDakika?: number;
}

export class ListStylistsQuery {
  @Type(() => Number)
  @IsInt()
  shopId!: number;
}

export class CreateServiceDto {
  @IsString()
  @Length(2, 80)
  ad!: string;

  @IsInt()
  @Min(5)
  @Max(480)
  sureDk!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fiyat!: number;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  ad?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  sureDk?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fiyat?: number;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;
}

export class AssignmentIdsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  ids!: number[];
}
