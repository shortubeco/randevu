import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ShopSearchQuery {
  // Hizmet adına göre filtre (büyük/küçük harf duyarsız, içerir).
  @IsOptional()
  @IsString()
  @MaxLength(80)
  service?: string;
}
