import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const PHONE = /^\+?[0-9]{10,15}$/;

export class RegisterDto {
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
  @MaxLength(72) // bcrypt'in pratik sınırı
  password!: string;
}

// İşletme sahibinin landing page'den açtığı hesap: sahip + işletme + ilk dükkan + plan.
export class KayitDukkanDto {
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

export class IsletmeKayitDto {
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

  @IsString()
  @Length(2, 80)
  isletmeAd!: string;

  @IsIn(['UCRETSIZ', 'SILVER', 'GOLD'])
  planKod!: string;

  @ValidateNested()
  @Type(() => KayitDukkanDto)
  dukkan!: KayitDukkanDto;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
