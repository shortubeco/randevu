import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { AuthUser, IS_PUBLIC_KEY, ROLES_KEY } from './decorators';
import { Role } from './roles.enum';
import { accessSecret } from './auth.config';

// Global: her istekte Bearer token doğrular ve req.user'a yazar.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
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

    try {
      req.user = await this.jwt.verifyAsync<AuthUser>(token, { secret: accessSecret() });
    } catch {
      throw new UnauthorizedException();
    }
    return true;
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
