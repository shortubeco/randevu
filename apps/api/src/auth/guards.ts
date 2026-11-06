import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ALLOW_PASSWORD_CHANGE_KEY, AuthUser, IS_PUBLIC_KEY, ROLES_KEY } from './decorators';
import { Role } from './roles.enum';
import { accessSecret } from './auth.config';
import { AccountService, assertIsletmeAktif } from './account.service';

// Global: her istekte Bearer token doğrular, hesap durumunu kontrol eder ve req.user'a yazar.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly accounts: AccountService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException();

    const payload = await this.verify(token);

    // Hesap durumu her istekte yeniden okunur: pasife alınan işletme, açık access token ile de giremez.
    const acc = await this.accounts.load(payload.sub);
    if (!acc) throw new UnauthorizedException();
    assertIsletmeAktif(acc);

    const allowChange = this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_CHANGE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (acc.sifreDegismeli && !allowChange) {
      throw new ForbiddenException({
        code: 'SIFRE_DEGISMELI',
        message: 'İlk girişte şifrenizi değiştirmeniz gerekiyor.',
      });
    }

    // Rol, token'daki değil veritabanındaki değerdir.
    req.user = { sub: acc.id, role: acc.rol, email: payload.email } satisfies AuthUser;
    return true;
  }

  private async verify(token: string): Promise<AuthUser> {
    try {
      return await this.jwt.verifyAsync<AuthUser>(token, { secret: accessSecret() });
    } catch {
      throw new UnauthorizedException();
    }
  }
}

// Global: @Roles(...) ile işaretli uç noktalarda rolü kontrol eder.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    return !!user && roles.includes(user.role);
  }
}
