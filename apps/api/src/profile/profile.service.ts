import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { ChangePasswordDto, UpdateProfileDto } from './profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly db: DatabaseService) {}

  async update(userId: number, dto: UpdateProfileDto) {
    const r = await this.db.query(
      `UPDATE "User" SET
         ad = COALESCE($2, ad),
         soyad = COALESCE($3, soyad),
         telefon = COALESCE($4, telefon),
         "updatedAt" = now()
       WHERE id = $1 AND "deletedAt" IS NULL
       RETURNING id, ad, soyad, telefon, email, rol AS role`,
      [userId, dto.ad ?? null, dto.soyad ?? null, dto.telefon ?? null],
    );
    if (!r.rows[0]) throw new NotFoundException('Kullanıcı bulunamadı');
    return r.rows[0];
  }

  // Şifre değişince tüm refresh token'lar iptal edilir. Geçici şifre bayrağı kalkar.
  async changePassword(userId: number, dto: ChangePasswordDto) {
    const r = await this.db.query<{ passwordHash: string }>(
      `SELECT "passwordHash" FROM "User" WHERE id = $1 AND "deletedAt" IS NULL`,
      [userId],
    );
    const user = r.rows[0];
    if (!user) throw new UnauthorizedException();

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Mevcut şifre hatalı');

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE "User" SET "passwordHash" = $2, "sifreDegismeli" = false, "updatedAt" = now() WHERE id = $1`,
        [userId, hash],
      );
      await client.query(
        `UPDATE "RefreshToken" SET "revokedAt" = now() WHERE "userId" = $1 AND "revokedAt" IS NULL`,
        [userId],
      );
    });
    return { ok: true };
  }
}
