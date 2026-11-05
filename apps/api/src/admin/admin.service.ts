import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService) {}

  // Müşteriler ve toplam randevu sayıları.
  async customers() {
    const r = await this.db.query(
      `SELECT u.id, u.ad, u.soyad, u.telefon, u.email, u."isActive", u."createdAt",
              COUNT(a.id)::int AS "randevuSayisi"
       FROM "User" u
       LEFT JOIN "Appointment" a ON a."customerId" = u.id AND a."deletedAt" IS NULL
       WHERE u.role = 'MUSTERI' AND u."deletedAt" IS NULL
       GROUP BY u.id
       ORDER BY u.ad, u.soyad`,
    );
    return r.rows;
  }

  // Seçilen tarih aralığında durum dağılımı ve kuaför bazlı ciro (yalnızca TAMAMLANDI).
  async reports(fromIso: string, toIso: string) {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      throw new BadRequestException('Bitiş tarihi başlangıçtan sonra olmalı');
    }

    const byStatus = await this.db.query(
      `SELECT status::text AS status, COUNT(*)::int AS adet
       FROM "Appointment"
       WHERE "deletedAt" IS NULL AND baslangic >= $1 AND baslangic < $2
       GROUP BY status ORDER BY status`,
      [from, to],
    );

    const byStylist = await this.db.query(
      `SELECT s.id AS "stylistId", u.ad, u.soyad,
              COUNT(a.id)::int AS toplam,
              COUNT(a.id) FILTER (WHERE a.status = 'TAMAMLANDI')::int AS tamamlanan,
              COALESCE(SUM(sv.fiyat) FILTER (WHERE a.status = 'TAMAMLANDI'), 0)::float8 AS ciro
       FROM "Stylist" s
       JOIN "User" u ON u.id = s."userId"
       LEFT JOIN "Appointment" a ON a."stylistId" = s.id AND a."deletedAt" IS NULL
         AND a.baslangic >= $1 AND a.baslangic < $2
       LEFT JOIN "Service" sv ON sv.id = a."serviceId"
       WHERE s."deletedAt" IS NULL
       GROUP BY s.id, u.ad, u.soyad
       ORDER BY ciro DESC, u.ad`,
      [from, to],
    );

    const totalRevenue = byStylist.rows.reduce((sum, row) => sum + Number(row.ciro), 0);
    return { byStatus: byStatus.rows, byStylist: byStylist.rows, totalRevenue };
  }
}
