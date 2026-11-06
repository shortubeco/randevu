import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { FOREIGN_KEY_VIOLATION, pgCode, UNIQUE_VIOLATION } from '../common/pg-errors';
import { AccountService, assertIsletmeAktif } from './account.service';
import { SettingsService } from '../settings/settings.service';
import { IsletmeKayitDto, LoginDto, RegisterDto } from './auth.dto';
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
  rol: Role;
  sifreDegismeli: boolean;
}

export interface PublicUser {
  id: number;
  ad: string;
  soyad: string;
  telefon: string;
  email: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly accounts: AccountService,
    private readonly settings: SettingsService,
  ) {}

  // Müşteri kaydı (mobil). Oturum hemen açılır.
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, 12);

    let user: UserRow;
    try {
      const result = await this.db.query<UserRow>(
        `INSERT INTO "User" (ad, soyad, telefon, email, "passwordHash", rol, "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'MUSTERI', now())
         RETURNING id, ad, soyad, telefon, email, "passwordHash", rol, "sifreDegismeli"`,
        [dto.ad, dto.soyad, dto.telefon, email, passwordHash],
      );
      user = result.rows[0];
    } catch (err) {
      if (pgCode(err) === UNIQUE_VIOLATION) {
        throw new ConflictException('Bu e-posta ile kayıtlı bir hesap var');
      }
      throw err;
    }
    return this.issueSession(user);
  }

  // İşletme sahibi kaydı (landing page). Hesap ONAY_BEKLIYOR başlar; oturum açılmaz.
  async registerIsletme(dto: IsletmeKayitDto) {
    // Ücretli planda ödeme sayfası, admin panelinden girilen havale bilgisini gösterir.
    const havaleAyar = dto.planKod === 'UCRETSIZ' ? null : await this.settings.getHavale();
    const email = dto.email.toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      return await this.db.transaction(async (client) => {
        const u = await client.query<{ id: number }>(
          `INSERT INTO "User" (ad, soyad, telefon, email, "passwordHash", rol, "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'ISLETME_SAHIBI', now()) RETURNING id`,
          [dto.ad, dto.soyad, dto.telefon, email, passwordHash],
        );
        const i = await client.query<{ id: number }>(
          `INSERT INTO "Isletme" (ad, "sahipId", "planKod") VALUES ($1, $2, $3) RETURNING id`,
          [dto.isletmeAd, u.rows[0].id, dto.planKod],
        );
        await client.query(
          `INSERT INTO "Dukkan" ("isletmeId", ad, "ilId", "ilceId", adres, telefon)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            i.rows[0].id,
            dto.dukkan.ad,
            dto.dukkan.ilId,
            dto.dukkan.ilceId,
            dto.dukkan.adres ?? null,
            dto.dukkan.telefon ?? null,
          ],
        );
        return {
          isletmeId: i.rows[0].id,
          durum: 'ONAY_BEKLIYOR' as const,
          havale: havaleAyar
            ? { ...havaleAyar, aciklama: `Açıklama: ${dto.isletmeAd}` }
            : null,
        };
      });
    } catch (err) {
      if (pgCode(err) === UNIQUE_VIOLATION) {
        throw new ConflictException('Bu e-posta ile kayıtlı bir hesap var');
      }
      if (pgCode(err) === FOREIGN_KEY_VIOLATION) {
        throw new BadRequestException('Seçilen il veya ilçe geçersiz');
      }
      throw err;
    }
  }

  async login(dto: LoginDto) {
    const result = await this.db.query<UserRow>(
      `SELECT id, ad, soyad, telefon, email, "passwordHash", rol, "sifreDegismeli"
       FROM "User" WHERE email = $1 AND "deletedAt" IS NULL`,
      [dto.email.toLowerCase()],
    );
    const user = result.rows[0];

    const passwordOk = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !passwordOk) {
      throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    }

    // Pasif veya onay bekleyen işletmenin hesabı giremez (403, kodla birlikte).
    const acc = await this.accounts.load(user.id);
    if (!acc) throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    assertIsletmeAktif(acc);

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

    const acc = await this.accounts.load(stored.userId);
    if (!acc) throw new UnauthorizedException();
    assertIsletmeAktif(acc);

    const userResult = await this.db.query<UserRow>(
      `SELECT id, ad, soyad, telefon, email, "passwordHash", rol, "sifreDegismeli"
       FROM "User" WHERE id = $1 AND "deletedAt" IS NULL`,
      [stored.userId],
    );
    const user = userResult.rows[0];
    if (!user) throw new UnauthorizedException();

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
      `SELECT id, ad, soyad, telefon, email, rol AS role FROM "User"
       WHERE id = $1 AND "deletedAt" IS NULL`,
      [auth.sub],
    );
    const user = result.rows[0];
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async issueSession(user: UserRow) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.rol,
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
      sifreDegismeli: user.sifreDegismeli,
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
      role: user.rol,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
