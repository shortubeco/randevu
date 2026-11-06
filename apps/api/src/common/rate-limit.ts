import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

// Bellek içi, IP ve uç nokta başına sabit pencere sınırı. Tek süreçli uygulama için yeterlidir.
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, context.getHandler());
    if (!options) return true;

    const req = context.switchToHttp().getRequest();
    const key = `${context.getClass().name}.${context.getHandler().name}:${req.ip}`;
    const now = Date.now();

    // Süresi dolmuş kayıtları ara sıra temizle.
    if (this.hits.size > 10000) {
      for (const [k, v] of this.hits) if (v.resetAt < now) this.hits.delete(k);
    }

    const current = this.hits.get(key);
    if (!current || current.resetAt < now) {
      this.hits.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }

    current.count++;
    if (current.count > options.limit) {
      throw new HttpException(
        'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
