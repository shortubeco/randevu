import { IsEmail, IsString, Length, Matches, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 60)
  ad!: string;

  @IsString()
  @Length(2, 60)
  soyad!: string;

  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Telefon numarası geçersiz' })
  telefon!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt'in pratik sınırı
  password!: string;
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
