import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
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

export class CreateStylistDto {
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

// Kuaförün kendi profili için.
export class UpdateStylistProfileDto {
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

// ADMIN, profil alanlarına ek olarak kullanıcı bilgilerini ve hesap durumunu güncelleyebilir.
export class AdminUpdateStylistDto extends UpdateStylistProfileDto {
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

  @IsOptional()
  @IsEmail()
  email?: string;

  // Verilirse şifre sıfırlanır ve kuaförün tüm oturumları kapanır.
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignStylistServicesDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  serviceIds!: number[];
}
