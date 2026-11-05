import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

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

export class AssignServicesDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  serviceIds!: number[];
}
