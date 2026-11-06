import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FOREIGN_KEY_VIOLATION, pgCode } from '../common/pg-errors';
import { assertDukkanOwnedBy, ownIsletmeId } from '../common/ownership';
import { Sql } from '../scheduling/scheduling';
import { CreateShopDto, UpdateShopDto } from './business.dto';

@Injectable()
export class BusinessService {
  constructor(private readonly db: DatabaseService) {}

  private sql: Sql = (t, p) => this.db.query(t, p);

  // İşletme özeti: plan, durum, ödeme günü ve plan limitleri.
  async overview(userId: number) {
    const r = await this.db.query(
      `SELECT i.id, i.ad, i.durum, i."odemeGunu", i."onayTarihi",
              p.kod AS "planKod", p.ad AS "planAd", p."aylikUcret"::float8 AS "aylikUcret",
              p."maxDukkan", p."maxKuaforDukkan", p."maxHizmetKuafor"
       FROM "Isletme" i JOIN "Plan" p ON p.kod = i."planKod"
       WHERE i."sahipId" = $1`,
      [userId],
    );
    if (!r.rows[0]) throw new NotFoundException('İşletme bulunamadı');
    return r.rows[0];
  }

  async listShops(userId: number) {
    const isletmeId = await ownIsletmeId(this.sql, userId);
    const r = await this.db.query(
      `SELECT d.id, d.ad, d.adres, d.telefon, d.aktif, d."ilId", d."ilceId",
              il.ad AS "ilAd", ilce.ad AS "ilceAd",
              (SELECT COUNT(*)::int FROM "Stylist" s
                WHERE s."dukkanId" = d.id AND s."deletedAt" IS NULL) AS "kuaforSayisi"
       FROM "Dukkan" d
       JOIN "Il" il ON il.id = d."ilId"
       JOIN "Ilce" ilce ON ilce.id = d."ilceId"
       WHERE d."isletmeId" = $1 AND d."deletedAt" IS NULL
       ORDER BY d.id`,
      [isletmeId],
    );
    return r.rows;
  }

  // Plan dükkan limitine göre yeni dükkan. Limit kontrolü için işletme satırı kilitlenir.
  async createShop(userId: number, dto: CreateShopDto) {
    try {
      return await this.db.transaction(async (client) => {
        const sql: Sql = (t, p) => client.query(t, p);
        const lock = await sql(
          `SELECT i.id, p."maxDukkan" FROM "Isletme" i
             JOIN "Plan" p ON p.kod = i."planKod"
           WHERE i."sahipId" = $1 FOR UPDATE OF i`,
          [userId],
        );
        if (!lock.rows[0]) throw new NotFoundException('İşletme bulunamadı');
        const { id: isletmeId, maxDukkan } = lock.rows[0];

        if (maxDukkan !== null) {
          const c = await sql(
            `SELECT COUNT(*)::int AS n FROM "Dukkan" WHERE "isletmeId" = $1 AND "deletedAt" IS NULL`,
            [isletmeId],
          );
          if (c.rows[0].n >= maxDukkan) {
            throw new ForbiddenException('Planınızın dükkan limiti dolu');
          }
        }

        const r = await sql(
          `INSERT INTO "Dukkan" ("isletmeId", ad, "ilId", "ilceId", adres, telefon)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [isletmeId, dto.ad, dto.ilId, dto.ilceId, dto.adres ?? null, dto.telefon ?? null],
        );
        return { id: r.rows[0].id };
      });
    } catch (err) {
      if (pgCode(err) === FOREIGN_KEY_VIOLATION) {
        throw new BadRequestException('Seçilen il veya ilçe geçersiz');
      }
      throw err;
    }
  }

  async updateShop(userId: number, id: number, dto: UpdateShopDto) {
    await assertDukkanOwnedBy(this.sql, id, userId);
    if ((dto.ilId === undefined) !== (dto.ilceId === undefined)) {
      throw new BadRequestException('İl ve ilçe birlikte gönderilmeli');
    }
    try {
      const r = await this.db.query(
        `UPDATE "Dukkan" SET
           ad = COALESCE($2, ad),
           "ilId" = COALESCE($3, "ilId"),
           "ilceId" = COALESCE($4, "ilceId"),
           adres = COALESCE($5, adres),
           telefon = COALESCE($6, telefon),
           aktif = COALESCE($7, aktif),
           "updatedAt" = now()
         WHERE id = $1
         RETURNING id, ad, "ilId", "ilceId", adres, telefon, aktif`,
        [
          id,
          dto.ad ?? null,
          dto.ilId ?? null,
          dto.ilceId ?? null,
          dto.adres ?? null,
          dto.telefon ?? null,
          dto.aktif ?? null,
        ],
      );
      return r.rows[0];
    } catch (err) {
      if (pgCode(err) === FOREIGN_KEY_VIOLATION) {
        throw new BadRequestException('Seçilen il veya ilçe geçersiz');
      }
      throw err;
    }
  }

  // Kuaförü olan dükkan silinemez (önce kuaförler kaldırılmalı).
  async removeShop(userId: number, id: number) {
    await assertDukkanOwnedBy(this.sql, id, userId);
    const n = await this.db.query(
      `SELECT COUNT(*)::int AS n FROM "Stylist" WHERE "dukkanId" = $1 AND "deletedAt" IS NULL`,
      [id],
    );
    if (n.rows[0].n > 0) {
      throw new ConflictException('Dükkanda kuaför var. Önce kuaförleri kaldırın.');
    }
    await this.db.query(
      `UPDATE "Dukkan" SET aktif = false, "deletedAt" = now(), "updatedAt" = now() WHERE id = $1`,
      [id],
    );
    return { ok: true };
  }
}
