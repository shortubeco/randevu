import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { RateLimit, RateLimitGuard } from '../common/rate-limit';
import { AuthService } from './auth.service';
import { IsletmeKayitDto, LoginDto, RefreshDto, RegisterDto } from './auth.dto';
import { AllowPasswordChange, AuthUser, CurrentUser, Public } from './decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // IP başına saatte en fazla 5 müşteri kaydı.
  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // IP başına saatte en fazla 5 işletme kaydı. Hesap onay bekler.
  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 })
  @Post('isletme-kayit')
  registerIsletme(@Body() dto: IsletmeKayitDto) {
    return this.auth.registerIsletme(dto);
  }

  // IP başına 15 dakikada en fazla 10 giriş denemesi.
  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @AllowPasswordChange()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }
}
