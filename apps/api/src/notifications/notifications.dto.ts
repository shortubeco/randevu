import { IsString, Matches } from 'class-validator';

// Expo push token biçimi: ExponentPushToken[...] veya ExpoPushToken[...]
export class RegisterDeviceDto {
  @IsString()
  @Matches(/^Expo(nent)?PushToken\[[^\]]+\]$/, { message: 'Geçersiz push token' })
  expoPushToken!: string;
}
