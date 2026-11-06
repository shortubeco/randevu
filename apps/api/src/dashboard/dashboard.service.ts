import { Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/decorators';
import { Role } from '../auth/roles.enum';
import { DatabaseService } from '../database/database.service';
import { scopeStylistIds } from '../common/ownership';
import { dayStartMs, istanbulDate, Sql } from '../scheduling/scheduling';

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');

// 0 tabanlı ay indeksinden (yıl*12 + ay) yıl, 1 tabanlı ay ve anahtar üretir.
function fromIndex(idx: number) {
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return { y, m, key: `${y}-${pad(m)}` };
}

// Verilen ayın [başlangıç, bitiş) aralığı (Istanbul saatiyle).
function monthRange(y: number, m: number) {
  const next = fromIndex(y * 12 + m);
  return {
    from: new Date(dayStartMs(`${y}-${pad(m)}-01`)),
    to: new Date(dayStartMs(`${next.y}-${pad(next.m)}-01`)),
  };
}

// Panel: işletme sahibi kendi işletmesinin, kuaför yalnızca kendisinin verilerini görür.
@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseService) {}

  private sql: Sql = (t, p) => this.db.query(t, p);

  async get(actor: AuthUser) {
    const isOwner = actor.role === Role.ISLETME_SAHIBI;
    const stylistIds = await scopeStylistIds(this.sql, actor);

    const now = new Date();
    const todayStr = istanbulDate(now.getTime());
    const [ty, tm] = todayStr.split('-').map(Number);
    const curIdx = ty * 12 + (tm - 1);
    const month = monthRange(ty, tm);
    const seriesStart = new Date(dayStartMs(`${fromIndex(curIdx - 11).key}-01`));
    const todayStart = new Date(dayStartMs(todayStr));
    const todayEnd = new Date(todayStart.getTime() + DAY_MS);

    // 1) Son 12 ayın randevu ve ciro serisi
    const seriesRows = await this.db.query<{ ay: string; toplam: number; tamamlanan: number; ciro: number }>(
      `SELECT to_char(date_trunc('month', a.baslangic AT TIME ZONE 'Europe/Istanbul'), 'YYYY-MM') AS ay,
              COUNT(*) FILTER (WHERE a.status <> 'IPTAL')::int AS toplam,
              COUNT(*) FILTER (WHERE a.status = 'TAMAMLANDI')::int AS tamamlanan,
              COALESCE(SUM(sv.fiyat) FILTER (WHERE a.status = 'TAMAMLANDI'), 0)::float8 AS ciro
       FROM "Appointment" a JOIN "Service" sv ON sv.id = a."serviceId"
       WHERE a."deletedAt" IS NULL AND a."stylistId" = ANY($1::int[])
         AND a.baslangic >= $2 AND a.baslangic < $3
       GROUP BY ay`,
      [stylistIds, seriesStart, month.to],
    );
    const byKey = new Map(seriesRows.rows.map((r) => [r.ay, r]));
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const key = fromIndex(curIdx - 11 + i).key;
      const r = byKey.get(key);
      return { ay: key, toplam: r?.toplam ?? 0, tamamlanan: r?.tamamlanan ?? 0, ciro: Number(r?.ciro ?? 0) };
    });
    const current = monthly[monthly.length - 1];

    // 2) Bu ayın duruma göre dağılımı
    const statusRows = await this.db.query<{ status: string; adet: number }>(
      `SELECT status AS status, COUNT(*)::int AS adet
       FROM "Appointment" a
       WHERE a."deletedAt" IS NULL AND a."stylistId" = ANY($1::int[])
         AND a.baslangic >= $2 AND a.baslangic < $3
       GROUP BY status`,
      [stylistIds, month.from, month.to],
    );

    // 3) Bugünkü sayılar ve onay bekleyenler
    const kpiRows = await this.db.query<{ bugun: number; bekleyen: number }>(
      `SELECT COUNT(*) FILTER (WHERE a.baslangic >= $2 AND a.baslangic < $3 AND a.status <> 'IPTAL')::int AS bugun,
              COUNT(*) FILTER (WHERE a.status = 'BEKLIYOR' AND a.baslangic >= $4)::int AS bekleyen
       FROM "Appointment" a
       WHERE a."deletedAt" IS NULL AND a."stylistId" = ANY($1::int[])`,
      [stylistIds, todayStart, todayEnd, now],
    );

    // 4) Bugünün randevu listesi
    const todayList = await this.db.query(
      `SELECT a.id, a.baslangic, a.bitis, a.status, s.id AS "stylistId",
              ku.ad AS "kuaforAd", ku.soyad AS "kuaforSoyad", sv.ad AS hizmet,
              cu.ad AS "musteriAd", cu.soyad AS "musteriSoyad", cu.telefon AS "musteriTelefon"
       FROM "Appointment" a
       JOIN "Stylist" s ON s.id = a."stylistId"
       JOIN "User" ku ON ku.id = s."userId"
       JOIN "Service" sv ON sv.id = a."serviceId"
       JOIN "User" cu ON cu.id = a."customerId"
       WHERE a."deletedAt" IS NULL AND a."stylistId" = ANY($1::int[])
         AND a.baslangic >= $2 AND a.baslangic < $3
       ORDER BY a.baslangic`,
      [stylistIds, todayStart, todayEnd],
    );

    const kpi = kpiRows.rows[0];
    const result: Record<string, unknown> = {
      scope: isOwner ? 'ISLETME_SAHIBI' : 'KUAFOR',
      kpi: {
        bugun: kpi.bugun,
        bekleyen: kpi.bekleyen,
        buAyTamamlanan: current.tamamlanan,
        buAyCiro: current.ciro,
        buAyToplam: current.toplam,
      },
      monthly,
      statusMonth: statusRows.rows,
      bugunList: todayList.rows,
    };

    if (isOwner) {
      const stylists = await this.db.query(
        `SELECT s.id, u.ad, u.soyad, s.aktif,
                COUNT(a.id) FILTER (WHERE a.status <> 'IPTAL')::int AS "buAy",
                COALESCE(SUM(sv.fiyat) FILTER (WHERE a.status = 'TAMAMLANDI'), 0)::float8 AS ciro
         FROM "Stylist" s
         JOIN "User" u ON u.id = s."userId"
         LEFT JOIN "Appointment" a ON a."stylistId" = s.id AND a."deletedAt" IS NULL
           AND a.baslangic >= $2 AND a.baslangic < $3
         LEFT JOIN "Service" sv ON sv.id = a."serviceId"
         WHERE s.id = ANY($1::int[]) AND s."deletedAt" IS NULL
         GROUP BY s.id, u.ad, u.soyad, s.aktif
         ORDER BY "buAy" DESC, u.ad`,
        [stylistIds, month.from, month.to],
      );
      result.kuaforler = stylists.rows;
    }

    return result;
  }
}
