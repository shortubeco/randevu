import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

const PHONE = /^\+?[0-9]{10,15}$/;

export class CreateShopDto {
  @IsString()
  @Length(2, 80)
  ad!: string;

  @IsInt()
  ilId!: number;

  @IsInt()
  ilceId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  adres?: string;

  @IsOptional()
  @Matches(PHONE, { message: 'Telefon numarası geçersiz' })
  telefon?: string;
}

// ilId ve ilceId birlikte gönderilmeli (servis katmanı kontrol eder).
export class UpdateShopDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  ad?: string;

  @IsOptional()
  @IsInt()
  ilId?: number;

  @IsOptional()
  @IsInt()
  ilceId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  adres?: string;

  @IsOptional()
  @Matches(PHONE, { message: 'Telefon numarası geçersiz' })
  telefon?: string;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;
}
