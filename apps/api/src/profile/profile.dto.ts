import { IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 60)
  ad?: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  soyad?: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Telefon numarası geçersiz' })
  telefon?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
