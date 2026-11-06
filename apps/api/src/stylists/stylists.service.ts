import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION, pgCode } from '../common/pg-errors';
import { countUpcomingActive, Sql } from '../scheduling/scheduling';
import {
  AdminUpdateStylistDto,
  AssignStylistServicesDto,
  CreateStylistDto,
  UpdateStylistProfileDto,
} from './stylists.dto';

const STYLIST_PUBLIC_COLUMNS = `s.id, u.ad, u.soyad, s.bio, s."photoUrl", s."slotDakika"`;

@Injectable()
export class StylistsService {
  constructor(private readonly db: DatabaseService) {}

  // Müşterilerin gördüğü liste: silinmemiş ve aktif kuaförler.
  async listActive() {
    const r = await this.db.query(
      `SELECT ${STYLIST_PUBLIC_COLUMNS}
       FROM "Stylist" s JOIN "User" u ON u.id = s."userId"
       WHERE s."deletedAt" IS NULL AND u."isActive" = true AND u."deletedAt" IS NULL
       ORDER BY u.ad`,
    );
    return r.rows;
  }

  async findOneActive(id: number) {
    const r = await this.db.query(
      `SELECT ${STYLIST_PUBLIC_COLUMNS}
       FROM "Stylist" s JOIN "User" u ON u.id = s."userId"
       WHERE s.id = $1 AND s."deletedAt" IS NULL AND u."isActive" = true AND u."deletedAt" IS NULL`,
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException('Kuaför bulunamadı');
    return r.rows[0];
  }

  // ADMIN görünümü: pasifler dahil, silinmemişler.
  async listAll() {
    const r = await this.db.query(
      `SELECT s.id, u.ad, u.soyad, u.email, u.telefon, u."isActive",
              s.bio, s."photoUrl", s."slotDakika"
       FROM "Stylist" s JOIN "User" u ON u.id = s."userId"
       WHERE s."deletedAt" IS NULL ORDER BY u.ad`,
    );
    return r.rows;
  }

  // Kuaförün kendi kaydı (userId üzerinden).
  async findByUserId(userId: number) {
    const r = await this.db.query(
      `SELECT s.id, s.bio, s."photoUrl", s."slotDakika" FROM "Stylist" s
       WHERE s."userId" = $1 AND s."deletedAt" IS NULL`,
      [userId],
    );
    if (!r.rows[0]) throw new NotFoundException('Kuaför kaydı bulunamadı');
    return r.rows[0];
  }

  // ADMIN: hem KUAFOR kullanıcısını hem Stylist kaydını tek transaction'da oluşturur.
  async create(dto: CreateStylistDto) {
    const email = dto.email.toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      return await this.db.transaction(async (client) => {
        const user = await client.query<{ id: number }>(
          `INSERT INTO "User" (ad, soyad, telefon, email, "passwordHash", role, "isActive", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'KUAFOR', true, now()) RETURNING id`,
          [dto.ad, dto.soyad, dto.telefon, email, passwordHash],
        );
        const stylist = await client.query<{ id: number }>(
          `INSERT INTO "Stylist" ("userId", bio, "slotDakika") VALUES ($1, $2, $3) RETURNING id`,
          [user.rows[0].id, dto.bio ?? null, dto.slotDakika ?? 30],
        );
        return { id: stylist.rows[0].id, userId: user.rows[0].id };
      });
    } catch (err) {
      if (pgCode(err) === UNIQUE_VIOLATION) {
        throw new ConflictException('Bu e-posta ile kayıtlı bir hesap var');
      }
      throw err;
    }
  }

  // Kuaförün kendi profil güncellemesi.
  async updateOwnProfile(userId: number, dto: UpdateStylistProfileDto) {
    const r = await this.db.query(
      `UPDATE "Stylist" SET
         bio = COALESCE($2, bio),
         "photoUrl" = COALESCE($3, "photoUrl"),
         "slotDakika" = COALESCE($4, "slotDakika")
       WHERE "userId" = $1 AND "deletedAt" IS NULL
       RETURNING id, bio, "photoUrl", "slotDakika"`,
      [userId, dto.bio ?? null, dto.photoUrl ?? null, dto.slotDakika ?? null],
    );
    if (!r.rows[0]) throw new NotFoundException('Kuaför kaydı bulunamadı');
    return r.rows[0];
  }

  // ADMIN güncellemesi. isActive=false ise kuaförün oturumları da kapatılır.
  async adminUpdate(id: number, dto: AdminUpdateStylistDto) {
    return this.db.transaction(async (client) => {
      const r = await client.query<{ userId: number }>(
        `UPDATE "Stylist" SET
           bio = COALESCE($2, bio),
           "photoUrl" = COALESCE($3, "photoUrl"),
           "slotDakika" = COALESCE($4, "slotDakika")
         WHERE id = $1 AND "deletedAt" IS NULL
         RETURNING "userId"`,
        [id, dto.bio ?? null, dto.photoUrl ?? null, dto.slotDakika ?? null],
      );
      if (!r.rows[0]) throw new NotFoundException('Kuaför bulunamadı');

      const hasUserFields =
        dto.ad !== undefined || dto.soyad !== undefined || dto.telefon !== undefined || dto.email !== undefined;
      if (hasUserFields) {
        try {
          await client.query(
            `UPDATE "User" SET
               ad = COALESCE($2, ad),
               soyad = COALESCE($3, soyad),
               telefon = COALESCE($4, telefon),
               email = COALESCE($5, email),
               "updatedAt" = now()
             WHERE id = $1`,
            [
              r.rows[0].userId,
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
      }

      if (dto.password) {
        const hash = await bcrypt.hash(dto.password, 12);
        await client.query(
          `UPDATE "User" SET "passwordHash" = $2, "updatedAt" = now() WHERE id = $1`,
          [r.rows[0].userId, hash],
        );
        await client.query(
          `UPDATE "RefreshToken" SET "revokedAt" = now()
           WHERE "userId" = $1 AND "revokedAt" IS NULL`,
          [r.rows[0].userId],
        );
      }

      if (dto.isActive === false) {
        await this.assertNoUpcoming(id, (t, p) => client.query(t, p));
      }

      if (dto.isActive !== undefined) {
        await client.query(
          `UPDATE "User" SET "isActive" = $2, "updatedAt" = now() WHERE id = $1`,
          [r.rows[0].userId, dto.isActive],
        );
        if (!dto.isActive) {
          await client.query(
            `UPDATE "RefreshToken" SET "revokedAt" = now()
             WHERE "userId" = $1 AND "revokedAt" IS NULL`,
            [r.rows[0].userId],
          );
        }
      }
      return { ok: true };
    });
  }

  // ADMIN düzenleme formu için tek kuaförün tüm bilgileri (pasifler dahil).
  async findAdmin(id: number) {
    const r = await this.db.query(
      `SELECT s.id, u.ad, u.soyad, u.email, u.telefon, u."isActive",
              s.bio, s."photoUrl", s."slotDakika"
       FROM "Stylist" s JOIN "User" u ON u.id = s."userId"
       WHERE s.id = $1 AND s."deletedAt" IS NULL`,
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException('Kuaför bulunamadı');
    return r.rows[0];
  }

  // Soft delete: kuaför kaydı ve hesabı işaretlenir, oturumları kapanır.
  async remove(id: number) {
    return this.db.transaction(async (client) => {
      const sql: Sql = (t, p) => client.query(t, p);
      const exists = await sql(
        `SELECT id FROM "Stylist" WHERE id = $1 AND "deletedAt" IS NULL FOR UPDATE`,
        [id],
      );
      if (!exists.rows[0]) throw new NotFoundException('Kuaför bulunamadı');
      await this.assertNoUpcoming(id, sql);

      const r = await client.query<{ userId: number }>(
        `UPDATE "Stylist" SET "deletedAt" = now()
         WHERE id = $1 AND "deletedAt" IS NULL RETURNING "userId"`,
        [id],
      );
      if (!r.rows[0]) throw new NotFoundException('Kuaför bulunamadı');

      await client.query(
        `UPDATE "User" SET "isActive" = false, "deletedAt" = now(), "updatedAt" = now() WHERE id = $1`,
        [r.rows[0].userId],
      );
      await client.query(
        `UPDATE "RefreshToken" SET "revokedAt" = now()
         WHERE "userId" = $1 AND "revokedAt" IS NULL`,
        [r.rows[0].userId],
      );
      return { ok: true };
    });
  }

  // Kuaförün verdiği hizmetleri tamamen yeniden yazar.
  async assignServices(id: number, dto: AssignStylistServicesDto) {
    const serviceIds = [...new Set(dto.serviceIds)];

    return this.db.transaction(async (client) => {
      const exists = await client.query(
        `SELECT 1 FROM "Stylist" WHERE id = $1 AND "deletedAt" IS NULL`,
        [id],
      );
      if (!exists.rows[0]) throw new NotFoundException('Kuaför bulunamadı');

      await client.query(`DELETE FROM "StylistService" WHERE "stylistId" = $1`, [id]);

      if (serviceIds.length > 0) {
        const inserted = await client.query(
          `INSERT INTO "StylistService" ("stylistId", "serviceId")
           SELECT $1, s.id FROM "Service" s
           WHERE s.id = ANY($2::int[]) AND s."deletedAt" IS NULL`,
          [id, serviceIds],
        );
        if (inserted.rowCount !== serviceIds.length) {
          throw new BadRequestException('Geçersiz veya silinmiş hizmet içeriyor');
        }
      }
      return { ok: true, serviceIds };
    });
  }

  // ADMIN atama ekranı: kuaförün atanmış tüm hizmetleri (pasifler dahil, silinmişler hariç).
  async adminServicesOf(stylistId: number) {
    const r = await this.db.query(
      `SELECT sv.id, sv.ad, sv."sureDk", sv.fiyat::float8 AS fiyat, sv.aktif
       FROM "StylistService" ss JOIN "Service" sv ON sv.id = ss."serviceId"
       WHERE ss."stylistId" = $1 AND sv."deletedAt" IS NULL
       ORDER BY sv.ad`,
      [stylistId],
    );
    return r.rows;
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

  async servicesOf(stylistId: number) {
    const r = await this.db.query(
      `SELECT sv.id, sv.ad, sv."sureDk", sv.fiyat::float8 AS fiyat
       FROM "StylistService" ss JOIN "Service" sv ON sv.id = ss."serviceId"
       WHERE ss."stylistId" = $1 AND sv."deletedAt" IS NULL AND sv.aktif = true
       ORDER BY sv.ad`,
      [stylistId],
    );
    return r.rows;
  }
}
