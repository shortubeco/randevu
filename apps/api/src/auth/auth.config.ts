// Access token imzalama anahtarı. cPanel'de / yerelde .env içinde tanımlanmalı.
export function accessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET ortam değişkeni tanımlı değil');
  }
  return secret;
}

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_DAYS = 30;
