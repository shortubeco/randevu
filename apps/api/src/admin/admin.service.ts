import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { audit } from '../common/audit';
import { pgCode, UNIQUE_VIOLATION } from '../common/pg-errors';
import { istanbulDate, Sql } from '../scheduling/scheduling';
import { ApproveIsletmeDto } from './admin.dto';

const pad = (n: number) => String(n).padStart(2, '0');

// Ayın gününe göre ödeme tarihi. Ayın son günü kısaysa (29-31) ayın son gününe kayar.
export function dueDateOf(year: number, month: number, gun: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad(month)}-${pad(Math.min(gun, lastDay))}`;
}

// Bugünden önceki (veya bugünkü) en son ödeme tarihi.
function lastDueOnOrBefore(today: string, gun: number): string {
  const [y, m] = today.split('-').map(Number);
  const thisMonth = dueDateOf(y, m, gun);
  if (thisMonth <= today) return thisMonth;
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  return dueDateOf(prev.y, prev.m, gun);
}

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService) {}

  private sql: Sql = (t, p) => this.db.query(t, p);

  // ---- İşletmeler ----

  // Onay bekleyenler üstte, sonra en yeniler.
  async listBusinesses() {
    const r = await this.db.query(
      `SELECT i.id, i.ad, i.durum, i."odemeGunu", i."onayTarihi", i."planKod",
              p.ad AS "planAd", p."aylikUcret"::float8 AS "aylikUcret",
              u.ad AS "sahipAd", u.soyad AS "sahipSoyad", u.email, u.telefon,
              (SELECT COUNT(*)::int FROM "Dukkan" d WHERE d."isletmeId" = i.id AND d."deletedAt" IS NULL) AS "dukkanSayisi"
       FROM "Isletme" i
         JOIN "Plan" p ON p.kod = i."planKod"
         JOIN "User" u ON u.id = i."sahipId"
       ORDER BY (i.durum = 'ONAY_BEKLIYOR') DESC, i.id DESC`,
    );
    return r.rows;
  }

  async getBusiness(id: number) {
    const r = await this.db.query(
      `SELECT i.id, i.ad, i.durum, i."odemeGunu", i."onayTarihi", i."planKod",
              p.ad AS "planAd", p."aylikUcret"::float8 AS "aylikUcret",
              u.ad AS "sahipAd", u.soyad AS "sahipSoyad", u.email, u.telefon
       FROM "Isletme" i
         JOIN "Plan" p ON p.kod = i."planKod"
         JOIN "User" u ON u.id = i."sahipId"
       WHERE i.id = $1`,
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException('İşletme bulunamadı');

    const shops = await this.db.query(
      `SELECT d.id, d.ad, d.adres, d.telefon, d.aktif, il.ad AS "ilAd", ilce.ad AS "ilceAd"
       FROM "Dukkan" d
         JOIN "Il" il ON il.id = d."ilId"
         JOIN "Ilce" ilce ON ilce.id = d."ilceId"
       WHERE d."isletmeId" = $1 AND d."deletedAt" IS NULL ORDER BY d.id`,
      [id],
    );
    const payments = await this.db.query(
      `SELECT id, "odemeTarihi"::text AS "odemeTarihi", tutar::float8 AS tutar, "onaylandiAt"
       FROM "Odeme" WHERE "isletmeId" = $1 ORDER BY "odemeTarihi" DESC`,
      [id],
    );
    return { ...r.rows[0], dukkanlar: shops.rows, odemeler: payments.rows };
  }

  // Havale kontrol edildikten sonra onay. Ücretli planda ilk ödeme kaydı da oluşur.
  async approve(adminId: number, id: number, dto: ApproveIsletmeDto) {
    return this.db.transaction(async (client) => {
      const sql: Sql = (t, p) => client.query(t, p);
      const r = await sql(
        `SELECT i.durum, i."planKod", p."aylikUcret"::float8 AS "aylikUcret"
         FROM "Isletme" i JOIN "Plan" p ON p.kod = i."planKod"
         WHERE i.id = $1 FOR UPDATE OF i`,
        [id],
      );
      if (!r.rows[0]) throw new NotFoundException('İşletme bulunamadı');
      const { durum, planKod, aylikUcret } = r.rows[0];
      if (durum !== 'ONAY_BEKLIYOR') {
        throw new BadRequestException('Yalnızca onay bekleyen işletme onaylanabilir');
      }

      const ucretli = planKod !== 'UCRETSIZ';
      if (ucretli) {
        if (!dto.odemeGunu || !dto.odemeTarihi) {
          throw new BadRequestException('Ücretli plan için ödeme günü ve ilk ödeme tarihi zorunlu');
        }
        if (aylikUcret === null) {
          throw new BadRequestException('Bu plan için aylık ücret tanımlı değil');
        }
      }

      const yeni = ucretli
        ? { durum: 'AKTIF', odemeGunu: dto.odemeGunu ?? null }
        : { durum: 'AKTIF', odemeGunu: null };
      await sql(
        `UPDATE "Isletme" SET durum = 'AKTIF', "odemeGunu" = $2, "onayTarihi" = now(),
                "onaylayanId" = $3, "updatedAt" = now()
         WHERE id = $1`,
        [id, yeni.odemeGunu, adminId],
      );
      await audit(sql, adminId, 'ISLETME_ONAY', 'Isletme', id, { durum }, yeni);

      if (ucretli) {
        await this.insertPayment(sql, adminId, id, dto.odemeTarihi!, aylikUcret!);
      }
      return { ok: true, durum: 'AKTIF' };
    });
  }

  // Aktif/pasif. Onay bekleyen işletme burada aktif yapılamaz; önce onaylanmalı.
  async setStatus(adminId: number, id: number, durum: 'AKTIF' | 'PASIF') {
    return this.db.transaction(async (client) => {
      const sql: Sql = (t, p) => client.query(t, p);
      const r = await sql(
        `SELECT i.durum, i."odemeGunu", i."planKod", p."aylikUcret"
         FROM "Isletme" i JOIN "Plan" p ON p.kod = i."planKod"
         WHERE i.id = $1 FOR UPDATE OF i`,
        [id],
      );
      if (!r.rows[0]) throw new NotFoundException('İşletme bulunamadı');
      const cur = r.rows[0];
      if (cur.durum === 'ONAY_BEKLIYOR') {
        throw new BadRequestException('Önce işletmeyi onaylayın');
      }
      if (durum === 'AKTIF' && cur.planKod !== 'UCRETSIZ' && cur.odemeGunu === null) {
        throw new BadRequestException('Aktif etmeden önce ödeme günü belirlenmeli');
      }
      await sql(`UPDATE "Isletme" SET durum = $2, "updatedAt" = now() WHERE id = $1`, [id, durum]);
      await audit(sql, adminId, durum === 'AKTIF' ? 'ISLETME_AKTIF' : 'ISLETME_PASIF', 'Isletme', id,
        { durum: cur.durum }, { durum });
      return { ok: true, durum };
    });
  }

  async setPaymentDay(adminId: number, id: number, odemeGunu: number) {
    return this.db.transaction(async (client) => {
      const sql: Sql = (t, p) => client.query(t, p);
      const r = await sql(
        `SELECT "odemeGunu" FROM "Isletme" WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (!r.rows[0]) throw new NotFoundException('İşletme bulunamadı');
      await sql(`UPDATE "Isletme" SET "odemeGunu" = $2, "updatedAt" = now() WHERE id = $1`, [id, odemeGunu]);
      await audit(sql, adminId, 'ISLETME_ODEME_GUNU', 'Isletme', id,
        { odemeGunu: r.rows[0].odemeGunu }, { odemeGunu });
      return { ok: true, odemeGunu };
    });
  }

  // ---- Ödeme takibi ----

  // Seçilen tarihte ödemesi olan işletmeler (ödendi / ödenmedi) ve ödemesi geçmiş olanlar.
  async payments(date: string) {
    const [y, m] = date.split('-').map(Number);
    const today = istanbulDate(Date.now());

    const isletmeler = await this.db.query<{
      id: number;
      ad: string;
      durum: string;
      odemeGunu: number;
      onayTarihi: Date;
      planAd: string;
      aylikUcret: number;
    }>(
      `SELECT i.id, i.ad, i.durum, i."odemeGunu", i."onayTarihi", p.ad AS "planAd",
              p."aylikUcret"::float8 AS "aylikUcret"
       FROM "Isletme" i JOIN "Plan" p ON p.kod = i."planKod"
       WHERE i."odemeGunu" IS NOT NULL AND i.durum <> 'ONAY_BEKLIYOR'
       ORDER BY i.ad`,
    );

    const odemeRows = await this.db.query<{ isletmeId: number; odemeTarihi: string; onaylandiAt: Date; tutar: number }>(
      `SELECT "isletmeId", "odemeTarihi"::text AS "odemeTarihi", "onaylandiAt", tutar::float8 AS tutar
       FROM "Odeme"`,
    );
    const odemeKey = (isletmeId: number, tarih: string) => `${isletmeId}|${tarih}`;
    const odemeMap = new Map(
      odemeRows.rows.map((o) => [odemeKey(o.isletmeId, o.odemeTarihi), o]),
    );

    const gunluk: unknown[] = [];
    const gecmis: unknown[] = [];

    for (const i of isletmeler.rows) {
      const base = { id: i.id, ad: i.ad, durum: i.durum, planAd: i.planAd, odemeGunu: i.odemeGunu };

      // Seçilen tarih bu işletmenin ödeme günü mü?
      if (dueDateOf(y, m, i.odemeGunu) === date) {
        const odeme = odemeMap.get(odemeKey(i.id, date)) ?? null;
        gunluk.push({ ...base, odendi: !!odeme, odeme });
      }

      // Son ödeme tarihi bugünden önce ve ödeme kaydı yoksa, ödeme geçmiş demektir.
      const sonTarih = lastDueOnOrBefore(today, i.odemeGunu);
      const onay = istanbulDate(new Date(i.onayTarihi).getTime());
      if (sonTarih >= onay && !odemeMap.has(odemeKey(i.id, sonTarih))) {
        gecmis.push({ ...base, sonOdemeTarihi: sonTarih });
      }
    }

    return { tarih: date, gunluk, gecmis };
  }

  // Admin, ödeme takibinden bir işletme için ödemeyi onaylar. Kayıt tekil: çift onay engellenir.
  async recordPayment(adminId: number, isletmeId: number, odemeTarihi: string) {
    return this.db.transaction(async (client) => {
      const sql: Sql = (t, p) => client.query(t, p);
      const r = await sql(
        `SELECT i.durum, p."aylikUcret"::float8 AS "aylikUcret"
         FROM "Isletme" i JOIN "Plan" p ON p.kod = i."planKod"
         WHERE i.id = $1 FOR UPDATE OF i`,
        [isletmeId],
      );
      if (!r.rows[0]) throw new NotFoundException('İşletme bulunamadı');
      if (r.rows[0].durum === 'ONAY_BEKLIYOR') {
        throw new BadRequestException('Önce işletmeyi onaylayın');
      }
      if (r.rows[0].aylikUcret === null) {
        throw new BadRequestException('Bu plan için aylık ücret tanımlı değil');
      }
      return this.insertPayment(sql, adminId, isletmeId, odemeTarihi, r.rows[0].aylikUcret);
    });
  }

  private async insertPayment(sql: Sql, adminId: number, isletmeId: number, odemeTarihi: string, tutar: number) {
    try {
      const r = await sql(
        `INSERT INTO "Odeme" ("isletmeId", "odemeTarihi", tutar, "onaylayanId")
         VALUES ($1, $2, $3, $4) RETURNING id, "odemeTarihi"::text AS "odemeTarihi", tutar::float8 AS tutar`,
        [isletmeId, odemeTarihi, tutar, adminId],
      );
      await audit(sql, adminId, 'ODEME_ONAY', 'Odeme', r.rows[0].id, null,
        { isletmeId, odemeTarihi, tutar });
      return r.rows[0];
    } catch (err) {
      if (pgCode(err) === UNIQUE_VIOLATION) {
        throw new ConflictException('Bu ödeme tarihi için kayıt zaten var');
      }
      throw err;
    }
  }

  // ---- Planlar ve denetim ----

  async updatePlan(adminId: number, kod: string, aylikUcret: number) {
    return this.db.transaction(async (client) => {
      const sql: Sql = (t, p) => client.query(t, p);
      const r = await sql(
        `SELECT "aylikUcret"::float8 AS "aylikUcret" FROM "Plan" WHERE kod = $1 FOR UPDATE`,
        [kod],
      );
      if (!r.rows[0]) throw new NotFoundException('Plan bulunamadı');
      await sql(`UPDATE "Plan" SET "aylikUcret" = $2 WHERE kod = $1`, [kod, aylikUcret]);
      await audit(sql, adminId, 'PLAN_FIYAT', 'Plan', kod,
        { aylikUcret: r.rows[0].aylikUcret }, { aylikUcret });
      return { ok: true, kod, aylikUcret };
    });
  }

  async audit(limit: number) {
    const r = await this.db.query(
      `SELECT a.id, a.islem, a."hedefTablo", a."hedefId", a."oncekiDeger", a."yeniDeger", a."createdAt",
              u.ad AS "adminAd", u.soyad AS "adminSoyad"
       FROM "AdminIslem" a JOIN "User" u ON u.id = a."adminId"
       ORDER BY a."createdAt" DESC LIMIT $1`,
      [limit],
    );
    return r.rows;
  }
}
