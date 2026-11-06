import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from './roles.enum';

export interface AuthUser {
  sub: number;
  role: Role;
  email: string;
}

export const IS_PUBLIC_KEY = 'isPublic';
// Varsayılan olarak tüm uç noktalar giriş ister; herkese açık olanlar bunu kullanır.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const ALLOW_PASSWORD_CHANGE_KEY = 'allowPasswordChange';
// Şifresi geçici olan kullanıcı (kuaför, ilk giriş) yalnızca bu uç noktalara erişebilir.
export const AllowPasswordChange = () => SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});
