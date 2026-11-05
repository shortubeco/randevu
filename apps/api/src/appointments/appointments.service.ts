import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../auth/decorators';
import { Role } from '../auth/roles.enum';
import { DatabaseService } from '../database/database.service';
import {
  busyIntervals,
  dayStartMs,
  isValidDate,
  istanbulDate,
  istanbulTime,
  loadWorkingRows,
  MIN_MS,
  Sql,
  validateBooking,
  workingIntervals,
} from '../scheduling/scheduling';
import { CreateAppointmentDto, ListAppointmentsQuery, RescheduleDto } from './appointments.dto';

// Müşteri iptal ve değişiklik yapabilmesi için randevuya en az bu kadar süre kalmalı.
const CUSTOMER_CHANGE_WINDOW_MS = 120 * MIN_MS;

const TRANSITIONS: Record<string, string[]> = {
  BEKLIYOR: ['ONAYLANDI', 'IPTAL'],
  ONAYLANDI: ['TAMAMLANDI', 'GELMEDI', 'IPTAL'],
  IPTAL: [],
  TAMAMLANDI: [],
  GELMEDI: [],
};

const APPOINTMENT_SELECT = `
  SELECT a.id, a.baslangic, a.bitis, a.status, a."notu",
         s.id AS "stylistId", ku.ad AS "kuaforAd", ku.soyad AS "kuaforSoyad",
         sv.id AS "serviceId", sv.ad AS hizmet, sv.fiyat::float8 AS fiyat,
         cu.ad AS "musteriAd", cu.soyad AS "musteriSoyad", cu.telefon AS "musteriTelefon"
  FROM "Appointment" a
  JOIN "Stylist" s ON s.id = a."stylistId"
  JOIN "User" ku ON ku.id = s."userId"
  JOIN "Service" sv ON sv.id = a."serviceId"
  JOIN "User" cu ON cu.id = a."customerId"`;

interface ListFilters {
  customerId?: number;
  stylistId?: number;
  stylistUserId?: number;
  status?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AppointmentsService {
  constructor(private readonly db: DatabaseService) {}

  // Kuaförün belirli bir gün ve hizmet için boş slotları.
  async availability(stylistId: number, dateStr: string, serviceId: number) {
    if (!isValidDate(dateStr)) {
      throw new BadRequestException('Tarih YYYY-MM-DD formatında olmalı');
    }
    const sql: Sql = (t, p) => this.db.query(t, p);

    const st = await sql(
      `SELECT s."slotDakika" FROM "Stylist" s JOIN "User" u ON u.id = s."userId"
       WHERE s.id = $1 AND s."deletedAt" IS NULL AND u."isActive" = true AND u."deletedAt" IS NULL`,
      [stylistId],
    );
    if (!st.rows[0]) throw new NotFoundException('Kuaför bulunamadı');

    const svc = await sql(
      `SELECT sv."sureDk" FROM "StylistService" ss JOIN "Service" sv ON sv.id = ss."serviceId"
       WHERE ss."stylistId" = $1 AND ss."serviceId" = $2 AND sv.aktif = true AND sv."deletedAt" IS NULL`,
      [stylistId, serviceId],
    );
    if (!svc.rows[0]) throw new BadRequestException('Bu kuaför seçilen hizmeti vermiyor');

    const slotMin: number = st.rows[0].slotDakika;
    const durationMs = svc.rows[0].sureDk * MIN_MS;

    const blocks = workingIntervals(await loadWorkingRows(sql, stylistId), dateStr);
    if (blocks.length === 0) return [];

    const from = Math.min(...blocks.map((b) => b.start));
    const to = Math.max(...blocks.map((b) => b.end));
    const busy = await busyIntervals(sql, stylistId, from, to);
    const now = Date.now();

    const slots: { startsAt: string; label: string }[] = [];
    for (const b of blocks) {
      for (let t = b.start; t + durationMs <= b.end; t += slotMin * MIN_MS) {
        if (t <= now) continue;
        const slot = { start: t, end: t + durationMs };
        if (busy.some((x) => x.start < slot.end && slot.start < x.end)) continue;
        slots.push({ startsAt: new Date(t).toISOString(), label: istanbulTime(t) });
      }
    }
    return slots;
  }

  async create(customerId: number, dto: CreateAppointmentDto) {
    const startMs = Date.parse(dto.startsAt);
    if (Number.isNaN(startMs)) throw new BadRequestException('Geçersiz tarih');
    if (startMs <= Date.now()) throw new BadRequestException('Geçmiş bir zamana randevu alınamaz');

    return this.db.transaction(async (client) => {
      const sql: Sql = (t, p) => client.query(t, p);

      // Kuaför satırını kilitle: aynı kuaför için eşzamanlı istekler sıraya girer.
      const st = await sql(
        `SELECT id, "slotDakika" FROM "Stylist" WHERE id = $1 AND "deletedAt" IS NULL FOR UPDATE`,
        [dto.stylistId],
      );
      if (!st.rows[0]) throw new NotFoundException('Kuaför bulunamadı');

      const svc = await sql(
        `SELECT sv."sureDk" FROM "StylistService" ss JOIN "Service" sv ON sv.id = ss."serviceId"
         WHERE ss."stylistId" = $1 AND ss."serviceId" = $2 AND sv.aktif = true AND sv."deletedAt" IS NULL`,
        [dto.stylistId, dto.serviceId],
      );
      if (!svc.rows[0]) throw new BadRequestException('Bu kuaför seçilen hizmeti vermiyor');

      const durationMin: number = svc.rows[0].sureDk;
      await validateBooking(sql, dto.stylistId, startMs, durationMin, st.rows[0].slotDakika);

      const endMs = startMs + durationMin * MIN_MS;
      const r = await sql(
        `INSERT INTO "Appointment" ("customerId", "stylistId", "serviceId", baslangic, bitis, status, "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'BEKLIYOR', now())
         RETURNING id, baslangic, bitis, status`,
        [customerId, dto.stylistId, dto.serviceId, new Date(startMs), new Date(endMs)],
      );
      return r.rows[0];
    });
  }

  // Müşteri randevusunu yeni bir zamana taşır. Onay yeniden gerekir (BEKLIYOR).
  async reschedule(customerId: number, id: number, dto: RescheduleDto) {
    const startMs = Date.parse(dto.startsAt);
    if (Number.isNaN(startMs)) throw new BadRequestException('Geçersiz tarih');
    if (startMs <= Date.now()) throw new BadRequestException('Geçmiş bir zamana taşınamaz');

    const current = await this.findOwnActive(customerId, id);
    this.assertCustomerWindow(new Date(current.baslangic).getTime());

    return this.db.transaction(async (client) => {
      const sql: Sql = (t, p) => client.query(t, p);

      const st = await sql(
        `SELECT id, "slotDakika" FROM "Stylist" WHERE id = $1 AND "deletedAt" IS NULL FOR UPDATE`,
        [current.stylistId],
      );
      if (!st.rows[0]) throw new NotFoundException('Kuaför bulunamadı');

      const svc = await sql(`SELECT "sureDk" FROM "Service" WHERE id = $1`, [current.serviceId]);
      const durationMin: number = svc.rows[0].sureDk;

      await validateBooking(sql, current.stylistId, startMs, durationMin, st.rows[0].slotDakika, id);

      const endMs = startMs + durationMin * MIN_MS;
      const r = await sql(
        `UPDATE "Appointment" SET baslangic = $2, bitis = $3, status = 'BEKLIYOR', "updatedAt" = now()
         WHERE id = $1 RETURNING id, baslangic, bitis, status`,
        [id, new Date(startMs), new Date(endMs)],
      );
      return r.rows[0];
    });
  }

  async cancelByCustomer(customerId: number, id: number) {
    const current = await this.findOwnActive(customerId, id);
    this.assertCustomerWindow(new Date(current.baslangic).getTime());

    const r = await this.db.query(
      `UPDATE "Appointment" SET status = 'IPTAL', "iptalEdenId" = $2, "updatedAt" = now()
       WHERE id = $1 RETURNING id, status`,
      [id, customerId],
    );
    return r.rows[0];
  }

  async listForCustomer(customerId: number) {
    return this.list({ customerId });
  }

  async listForStylistUser(userId: number, q: ListAppointmentsQuery) {
    return this.list({ stylistUserId: userId, status: q.status, from: q.from, to: q.to });
  }

  async listForAdmin(q: ListAppointmentsQuery) {
    return this.list({ stylistId: q.stylistId, status: q.status, from: q.from, to: q.to });
  }

  // Kuaför yalnızca kendi randevularının durumunu değiştirebilir; ADMIN hepsini.
  async updateStatus(actor: AuthUser, id: number, status: string) {
    const a = await this.findForActor(actor, id);
    if (!TRANSITIONS[a.status].includes(status)) {
      throw new BadRequestException(`${a.status} durumundan ${status} durumuna geçilemez`);
    }
    const r = await this.db.query(
      `UPDATE "Appointment" SET
         status = $2::"AppointmentStatus",
         "iptalEdenId" = CASE WHEN $2 = 'IPTAL' THEN $3::int ELSE "iptalEdenId" END,
         "updatedAt" = now()
       WHERE id = $1 RETURNING id, status`,
      [id, status, actor.sub],
    );
    return r.rows[0];
  }

  async remove(actor: AuthUser, id: number) {
    await this.findForActor(actor, id);
    await this.db.query(
      `UPDATE "Appointment" SET "deletedAt" = now(), "updatedAt" = now() WHERE id = $1`,
      [id],
    );
    return { ok: true };
  }

  // ---- yardımcılar ----

  private assertCustomerWindow(startMs: number) {
    if (startMs - Date.now() < CUSTOMER_CHANGE_WINDOW_MS) {
      throw new BadRequestException('Randevuya 2 saatten az kaldığı için işlem yapılamaz');
    }
  }

  private async findOwnActive(customerId: number, id: number) {
    const r = await this.db.query(
      `SELECT id, "stylistId", "serviceId", baslangic, status FROM "Appointment"
       WHERE id = $1 AND "customerId" = $2 AND "deletedAt" IS NULL`,
      [id, customerId],
    );
    const a = r.rows[0];
    if (!a) throw new NotFoundException('Randevu bulunamadı');
    if (a.status !== 'BEKLIYOR' && a.status !== 'ONAYLANDI') {
      throw new BadRequestException('Bu randevu artık değiştirilemez');
    }
    return a;
  }

  private async findForActor(actor: AuthUser, id: number) {
    const r = await this.db.query(
      `SELECT a.id, a.status, s."userId" AS "stylistUserId"
       FROM "Appointment" a JOIN "Stylist" s ON s.id = a."stylistId"
       WHERE a.id = $1 AND a."deletedAt" IS NULL`,
      [id],
    );
    const a = r.rows[0];
    if (!a) throw new NotFoundException('Randevu bulunamadı');
    if (actor.role === Role.KUAFOR && a.stylistUserId !== actor.sub) {
      // Başkasının randevusu olduğunu belli etmemek için aynı hata.
      throw new NotFoundException('Randevu bulunamadı');
    }
    return a;
  }

  private async list(f: ListFilters) {
    const where = [`a."deletedAt" IS NULL`];
    const params: unknown[] = [];
    const add = (cond: string, value: unknown) => {
      params.push(value);
      where.push(cond.replace('?', `$${params.length}`));
    };

    if (f.customerId) add(`a."customerId" = ?`, f.customerId);
    if (f.stylistId) add(`a."stylistId" = ?`, f.stylistId);
    if (f.stylistUserId) add(`s."userId" = ?`, f.stylistUserId);
    if (f.status) add(`a.status = ?::"AppointmentStatus"`, f.status);
    if (f.from) add(`a.baslangic >= ?`, new Date(f.from));
    if (f.to) add(`a.baslangic < ?`, new Date(f.to));

    const r = await this.db.query(
      `${APPOINTMENT_SELECT} WHERE ${where.join(' AND ')} ORDER BY a.baslangic`,
      params,
    );
    return r.rows;
  }
}
