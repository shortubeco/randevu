import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { pgCode, UNIQUE_VIOLATION } from '../common/pg-errors';
import {
  assertDukkanOwnedBy,
  assertStylistOwnedBy,
  VISIBLE_STYLIST_FROM,
  VISIBLE_STYLIST_WHERE,
} from '../common/ownership';
import { countUpcomingActive, Sql } from '../scheduling/scheduling';
import {
  CreateServiceDto,
  CreateStylistDto,
  UpdateOwnStylistDto,
  UpdateServiceDto,
  UpdateStylistDto,
} from './stylists.dto';

const VISIBLE_STYLIST_COLUMNS = `s.id, u.ad, u.soyad, s.bio, s."photoUrl", s."slotDakika",
  s."dukkanId", d.ad AS "dukkanAd", i.id AS "isletmeId", i.ad AS "isletmeAd",
  (SELECT ROUND(AVG(r.puan), 1)::float8 FROM "Review" r WHERE r."stylistId" = s.id) AS ortalama,
  (SELECT COUNT(*)::int FROM "Review" r WHERE r."stylistId" = s.id) AS adet`;

@Injectable()
export class StylistsService {
  constructor(private readonly db: DatabaseService) {}

  private sql: Sql = (t, p) => this.db.query(t, p);

  // ---- Müşteri görünümü: yalnızca aktif işletme, dükkan ve kuaför ----

  async listVisibleByShop(shopId: number) {
    const r = await this.db.query(
      `SELECT ${VISIBLE_STYLIST_COLUMNS}
       FROM ${VISIBLE_STYLIST_FROM}
       JOIN "User" u ON u.id = s."userId"
       WHERE s."dukkanId" = $1 AND ${VISIBLE_STYLIST_WHERE}
       ORDER BY u.ad`,
      [shopId],
    );
    return r.rows;
  }

  async findVisible(id: number) {
    const r = await this.db.query(
      `SELECT ${VISIBLE_STYLIST_COLUMNS}
       FROM ${VISIBLE_STYLIST_FROM}
       JOIN "User" u ON u.id = s."userId"
       WHERE s.id = $1 AND ${VISIBLE_STYLIST_WHERE}`,
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException('Kuaför bulunamadı');
    return r.rows[0];
  }

  async servicesVisible(id: number) {
    await this.findVisible(id);
    const r = await this.db.query(
      `SELECT sv.id, sv.ad, sv."sureDk", sv.fiyat::float8 AS fiyat
       FROM "Service" sv
       WHERE sv."stylistId" = $1 AND sv.aktif AND sv."deletedAt" IS NULL
       ORDER BY sv.ad`,
      [id],
    );
    return r.rows;
  }

  // ---- Kuaförün kendi profili ----

  async findOwnProfile(userId: number) {
    const r = await this.db.query(
      `SELECT s.id, u.ad, u.soyad, u.telefon, u.email, s.bio, s."photoUrl", s."slotDakika",
              s.aktif, s."dukkanId"
       FROM "Stylist" s JOIN "User" u ON u.id = s."userId"
       WHERE s."userId" = $1 AND s."deletedAt" IS NULL`,
      [userId],
    );
    if (!r.rows[0]) throw new NotFoundException('Kuaför kaydı bulunamadı');
    return r.rows[0];
  }

  async updateOwnProfile(userId: number, dto: UpdateOwnStylistDto) {
    const r = await this.db.query(
      `UPDATE "Stylist" SET
         bio = COALESCE($2, bio),
         "photoUrl" = COALESCE($3, "photoUrl"),
         "slotDakika" = COALESCE($4, "slotDakika"),
         "updatedAt" = now()
       WHERE "userId" = $1 AND "deletedAt" IS NULL
       RETURNING id, bio, "photoUrl", "slotDakika"`,
      [userId, dto.bio ?? null, dto.photoUrl ?? null, dto.slotDakika ?? null],
    );
    if (!r.rows[0]) throw new NotFoundException('Kuaför kaydı bulunamadı');
    return r.rows[0];
  }

  // ---- İşletme sahibi: kendi kuaförleri ----

  async listOwned(userId: number) {
    const r = await this.db.query(
      `SELECT s.id, u.ad, u.soyad, u.email, u.telefon, s.aktif, s.bio, s."photoUrl",
              s."slotDakika", s."dukkanId", d.ad AS "dukkanAd"
       FROM "Stylist" s
         JOIN "User" u ON u.id = s."userId"
         JOIN "Dukkan" d ON d.id = s."dukkanId"
         JOIN "Isletme" i ON i.id = d."isletmeId"
       WHERE i."sahipId" = $1 AND s."deletedAt" IS NULL AND d."deletedAt" IS NULL
       ORDER BY d.id, u.ad`,
      [userId],
    );
    return r.rows;
  }

  // Plan kuaför limiti (dükkan başına) kontrol edilir. İşletme satırı kilitlenir.
  async createOwned(userId: number, dto: CreateStylistDto) {
    const email = dto.email.toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      return await this.db.transaction(async (client) => {
        const sql: Sql = (t, p) => client.query(t, p);
        const lock = await sql(
          `SELECT i.id, p."maxKuaforDukkan" FROM "Isletme" i
             JOIN "Plan" p ON p.kod = i."planKod"
           WHERE i."sahipId" = $1 FOR UPDATE OF i`,
          [userId],
        );
        if (!lock.rows[0]) throw new NotFoundException('İşletme bulunamadı');
        await assertDukkanOwnedBy(sql, dto.shopId, userId);

        const max: number | null = lock.rows[0].maxKuaforDukkan;
        if (max !== null) {
          const c = await sql(
            `SELECT COUNT(*)::int AS n FROM "Stylist" WHERE "dukkanId" = $1 AND "deletedAt" IS NULL`,
            [dto.shopId],
          );
          if (c.rows[0].n >= max) {
            throw new ForbiddenException('Planınızın bu dükkan için kuaför limiti dolu');
          }
        }

        const u = await sql(
          `INSERT INTO "User" (ad, soyad, telefon, email, "passwordHash", rol, "sifreDegismeli", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'KUAFOR', true, now()) RETURNING id`,
          [dto.ad, dto.soyad, dto.telefon, email, passwordHash],
        );
        const s = await sql(
          `INSERT INTO "Stylist" ("userId", "dukkanId", bio, "slotDakika", "updatedAt")
           VALUES ($1, $2, $3, $4, now()) RETURNING id`,
          [u.rows[0].id, dto.shopId, dto.bio ?? null, dto.slotDakika ?? 30],
        );
        return { id: s.rows[0].id, userId: u.rows[0].id };
      });
    } catch (err) {
      if (pgCode(err) === UNIQUE_VIOLATION) {
        throw new ConflictException('Bu e-posta ile kayıtlı bir hesap var');
      }
      throw err;
    }
  }

  async findOwned(userId: number, id: number) {
    await assertStylistOwnedBy(this.sql, id, userId);
    const r = await this.db.query(
      `SELECT s.id, u.ad, u.soyad, u.email, u.telefon, s.aktif, s.bio, s."photoUrl",
              s."slotDakika", s."dukkanId", d.ad AS "dukkanAd"
       FROM "Stylist" s
         JOIN "User" u ON u.id = s."userId"
         JOIN "Dukkan" d ON d.id = s."dukkanId"
       WHERE s.id = $1`,
      [id],
    );
    return r.rows[0];
  }

  // Geçici şifre verilirse kuaför ilk girişte değiştirir ve mevcut oturumları kapanır.
  // Pasife alınırsa yaklaşan randevusu olmamalı.
  async updateOwned(userId: number, id: number, dto: UpdateStylistDto) {
    await assertStylistOwnedBy(this.sql, id, userId);

    return this.db.transaction(async (client) => {
      const sql: Sql = (t, p) => client.query(t, p);
      const s = await sql(`SELECT "userId" FROM "Stylist" WHERE id = $1 FOR UPDATE`, [id]);
      const stylistUserId: number = s.rows[0].userId;

      if (dto.aktif === false) await this.assertNoUpcoming(id, sql);

      await sql(
        `UPDATE "Stylist" SET
           bio = COALESCE($2, bio),
           "slotDakika" = COALESCE($3, "slotDakika"),
           aktif = COALESCE($4, aktif),
           "updatedAt" = now()
         WHERE id = $1`,
        [id, dto.bio ?? null, dto.slotDakika ?? null, dto.aktif ?? null],
      );

      try {
        await sql(
          `UPDATE "User" SET
             ad = COALESCE($2, ad),
             soyad = COALESCE($3, soyad),
             telefon = COALESCE($4, telefon),
             email = COALESCE($5, email),
             "updatedAt" = now()
           WHERE id = $1`,
          [
            stylistUserId,
            dto.ad ?? null,
            dto.soyad ?? null,
            dto.telefon ?? null,
            dto.email ? dto.email.toLowerCase() : null,
          ],
        );
      } catch (err) {
        if (pgCode(err) === UNIQUE_VIOLATION) {
          throw new ConflictException('Bu e-posta ile kayıtlı bir hesap var');
        }
        throw err;
      }

      if (dto.password) {
        const hash = await bcrypt.hash(dto.password, 12);
        await sql(
          `UPDATE "User" SET "passwordHash" = $2, "sifreDegismeli" = true, "updatedAt" = now() WHERE id = $1`,
          [stylistUserId, hash],
        );
        await sql(
          `UPDATE "RefreshToken" SET "revokedAt" = now() WHERE "userId" = $1 AND "revokedAt" IS NULL`,
          [stylistUserId],
        );
      }
      return { ok: true };
    });
  }

  // Soft delete: kuaför ve hesabı işaretlenir, oturumları kapanır. Yaklaşan randevusu olmamalı.
  async removeOwned(userId: number, id: number) {
    await assertStylistOwnedBy(this.sql, id, userId);
    return this.db.transaction(async (client) => {
      const sql: Sql = (t, p) => client.query(t, p);
      const s = await sql(`SELECT "userId" FROM "Stylist" WHERE id = $1 FOR UPDATE`, [id]);
      await this.assertNoUpcoming(id, sql);

      await sql(`UPDATE "Stylist" SET "deletedAt" = now(), aktif = false WHERE id = $1`, [id]);
      await sql(
        `UPDATE "User" SET "deletedAt" = now(), "updatedAt" = now() WHERE id = $1`,
        [s.rows[0].userId],
      );
      await sql(
        `UPDATE "RefreshToken" SET "revokedAt" = now() WHERE "userId" = $1 AND "revokedAt" IS NULL`,
        [s.rows[0].userId],
      );
      return { ok: true };
    });
  }

  // ---- Hizmetler (kuaföre bağlı) ----

  async listServicesOwned(userId: number, stylistId: number) {
    await assertStylistOwnedBy(this.sql, stylistId, userId);
    const r = await this.db.query(
      `SELECT id, ad, "sureDk", fiyat::float8 AS fiyat, aktif
       FROM "Service" WHERE "stylistId" = $1 AND "deletedAt" IS NULL ORDER BY ad`,
      [stylistId],
    );
    return r.rows;
  }

  // Plan hizmet limiti (kuaför başına) kontrol edilir. Kuaför satırı kilitlenir.
  async createService(userId: number, stylistId: number, dto: CreateServiceDto) {
    return this.db.transaction(async (client) => {
      const sql: Sql = (t, p) => client.query(t, p);
      await assertStylistOwnedBy(sql, stylistId, userId);
      const lock = await sql(
        `SELECT s.id, p."maxHizmetKuafor" FROM "Stylist" s
           JOIN "Dukkan" d ON d.id = s."dukkanId"
           JOIN "Isletme" i ON i.id = d."isletmeId"
           JOIN "Plan" p ON p.kod = i."planKod"
         WHERE s.id = $1 FOR UPDATE OF s`,
        [stylistId],
      );
      const max: number | null = lock.rows[0].maxHizmetKuafor;
      if (max !== null) {
        const c = await sql(
          `SELECT COUNT(*)::int AS n FROM "Service" WHERE "stylistId" = $1 AND "deletedAt" IS NULL`,
          [stylistId],
        );
        if (c.rows[0].n >= max) {
          throw new ForbiddenException('Planınızın bu kuaför için hizmet limiti dolu');
        }
      }
      const r = await sql(
        `INSERT INTO "Service" ("stylistId", ad, "sureDk", fiyat, "updatedAt")
         VALUES ($1, $2, $3, $4, now())
         RETURNING id, ad, "sureDk", fiyat::float8 AS fiyat, aktif`,
        [stylistId, dto.ad, dto.sureDk, dto.fiyat],
      );
      return r.rows[0];
    });
  }

  async updateService(userId: number, serviceId: number, dto: UpdateServiceDto) {
    await this.assertServiceOwned(userId, serviceId);
    const r = await this.db.query(
      `UPDATE "Service" SET
         ad = COALESCE($2, ad),
         "sureDk" = COALESCE($3, "sureDk"),
         fiyat = COALESCE($4, fiyat),
         aktif = COALESCE($5, aktif),
         "updatedAt" = now()
       WHERE id = $1
       RETURNING id, ad, "sureDk", fiyat::float8 AS fiyat, aktif`,
      [serviceId, dto.ad ?? null, dto.sureDk ?? null, dto.fiyat ?? null, dto.aktif ?? null],
    );
    return r.rows[0];
  }

  // Soft delete: geçmiş randevular bozulmasın diye kayıt silinmez, işaretlenir.
  async removeService(userId: number, serviceId: number) {
    await this.assertServiceOwned(userId, serviceId);
    await this.db.query(
      `UPDATE "Service" SET "deletedAt" = now(), aktif = false, "updatedAt" = now() WHERE id = $1`,
      [serviceId],
    );
    return { ok: true };
  }

  private async assertServiceOwned(userId: number, serviceId: number) {
    const r = await this.db.query(
      `SELECT sv.id FROM "Service" sv
         JOIN "Stylist" s ON s.id = sv."stylistId"
         JOIN "Dukkan" d ON d.id = s."dukkanId"
         JOIN "Isletme" i ON i.id = d."isletmeId"
       WHERE sv.id = $1 AND i."sahipId" = $2 AND sv."deletedAt" IS NULL`,
      [serviceId, userId],
    );
    if (!r.rows[0]) throw new NotFoundException('Hizmet bulunamadı');
  }

  // Onaylı veya bekleyen ileri tarihli randevusu olan kuaför pasifleştirilemez veya silinemez.
  private async assertNoUpcoming(stylistId: number, sql: Sql) {
    const n = await countUpcomingActive(sql, stylistId);
    if (n > 0) {
      throw new ConflictException(
        `Kuaförün ${n} onaylı veya bekleyen ileri tarihli randevusu var. Önce bu randevuları iptal edin veya taşıyın.`,
      );
    }
  }
}
