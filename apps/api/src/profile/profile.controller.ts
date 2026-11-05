import { Body, Controller, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/decorators';
import { ChangePasswordDto, UpdateProfileDto } from './profile.dto';
import { ProfileService } from './profile.service';

// Giriş yapmış her kullanıcı kendi profilini ve şifresini değiştirebilir.
@Controller('auth')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.profile.update(user.sub, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.profile.changePassword(user.sub, dto);
  }
}
