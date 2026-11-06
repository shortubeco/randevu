import { IsString, Length, Matches } from 'class-validator';

// Havale bilgisi: ödeme sayfasında müşteriye (işletme sahibine) gösterilir.
export class UpdateHavaleDto {
  @IsString()
  @Length(2, 80)
  banka!: string;

  @IsString()
  @Length(2, 120)
  alici!: string;

  @IsString()
  @Matches(/^[A-Za-z]{2}[0-9]{2}[0-9A-Za-z ]{10,40}$/, { message: 'IBAN biçimi geçersiz' })
  iban!: string;
}
