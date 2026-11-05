import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { REFRESH_TOKEN_TTL_DAYS } from './auth.config';
import { AuthUser } from './decorators';
import { Role } from './roles.enum';

interface UserRow {
  id: number;
  ad: string;
  soyad: string;
  telefon: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
}

export interface PublicUser {
  id: number;
  ad: string;
  soyad: string;
  telefon: string;
  email: string;
  role: Role;
}

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, 12);

    let user: UserRow;
    try {
      const result = await this.db.query<UserRow>(
        `INSERT INTO "User" (ad, soyad, telefon, email, "passwordHash", role, "isActive", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'MUSTERI', true, now())
         RETURNING id, ad, soyad, telefon, email, "passwordHash", role, "isActive"`,
        [dto.ad, dto.soyad, dto.telefon, email, passwordHash],
      );
      user = result.rows[0];
    } catch (err) {
      if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException('Bu e-posta ile kayıtlı bir hesap var');
      }
      throw err;
    }

    return this.issueSession(user);
  }

  async login(dto: LoginDto) {
    const result = await this.db.query<UserRow>(
      `SELECT id, ad, soyad, telefon, email, "passwordHash", role, "isActive"
       FROM "User" WHERE email = $1 AND "deletedAt" IS NULL`,
      [dto.email.toLowerCase()],
    );
    const user = result.rows[0];

    const passwordOk = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !user.isActive || !passwordOk) {
      throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    }

    return this.issueSession(user);
  }

  // Refresh token döndürme (rotation): eski token iptal edilir, yenisi verilir.
  // İptal edilmiş bir token tekrar kullanılırsa, o kullanıcının tüm oturumları kapatılır.
  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const result = await this.db.query<{
      id: number;
      userId: number;
      revokedAt: Date | null;
      expired: boolean;
    }>(
      `SELECT rt.id, rt."userId", rt."revokedAt", rt."expiresAt" < now() AS expired
       FROM "RefreshToken" rt WHERE rt."tokenHash" = $1`,
      [tokenHash],
    );
    const stored = result.rows[0];
    if (!stored) throw new UnauthorizedException();

    if (stored.revokedAt) {
      await this.db.query(
        `UPDATE "RefreshToken" SET "revokedAt" = now()
         WHERE "userId" = $1 AND "revokedAt" IS NULL`,
        [stored.userId],
      );
      throw new UnauthorizedException();
    }
    if (stored.expired) throw new UnauthorizedException();

    const userResult = await this.db.query<UserRow>(
      `SELECT id, ad, soyad, telefon, email, "passwordHash", role, "isActive"
       FROM "User" WHERE id = $1 AND "deletedAt" IS NULL`,
      [stored.userId],
    );
    const user = userResult.rows[0];
    if (!user || !user.isActive) throw new UnauthorizedException();

    await this.db.query(`UPDATE "RefreshToken" SET "revokedAt" = now() WHERE id = $1`, [stored.id]);
    return this.issueSession(user);
  }

  async logout(refreshToken: string) {
    await this.db.query(
      `UPDATE "RefreshToken" SET "revokedAt" = now()
       WHERE "tokenHash" = $1 AND "revokedAt" IS NULL`,
      [this.hashToken(refreshToken)],
    );
    return { ok: true };
  }

  async me(auth: AuthUser): Promise<PublicUser> {
    const result = await this.db.query<PublicUser>(
      `SELECT id, ad, soyad, telefon, email, role FROM "User"
       WHERE id = $1 AND "isActive" = true AND "deletedAt" IS NULL`,
      [auth.sub],
    );
    const user = result.rows[0];
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async issueSession(user: UserRow) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      email: user.email,
    } satisfies AuthUser);

    // Refresh token ham haliyle istemciye gider, veritabanında yalnızca hash'i tutulur.
    const refreshToken = randomBytes(48).toString('base64url');
    await this.db.query(
      `INSERT INTO "RefreshToken" ("userId", "tokenHash", "expiresAt", "createdAt")
       VALUES ($1, $2, now() + ($3 || ' days')::interval, now())`,
      [user.id, this.hashToken(refreshToken), String(REFRESH_TOKEN_TTL_DAYS)],
    );

    return {
      accessToken,
      refreshToken,
      user: this.toPublic(user),
    };
  }

  private toPublic(user: UserRow): PublicUser {
    return {
      id: user.id,
      ad: user.ad,
      soyad: user.soyad,
      telefon: user.telefon,
      email: user.email,
      role: user.role,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
