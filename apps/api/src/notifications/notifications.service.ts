import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;

const TITLES: Record<string, string> = {
  ONAYLANDI: 'Randevu onaylandı',
  IPTAL: 'Randevu iptal edildi',
  TAMAMLANDI: 'Randevu tamamlandı',
  HATIRLATMA: 'Randevu hatırlatması',
};

// Europe/Istanbul sabit UTC+03:00: "GG.AA SS:dd"
export function formatIstanbul(date: Date): string {
  const d = new Date(date.getTime() + ISTANBUL_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');

  constructor(private readonly db: DatabaseService) {}

  async registerDevice(userId: number, token: string) {
    await this.db.query(
      `INSERT INTO "DeviceToken" ("userId", "expoPushToken") VALUES ($1, $2)
       ON CONFLICT ("expoPushToken") DO UPDATE SET "userId" = EXCLUDED."userId"`,
      [userId, token],
    );
    return { ok: true };
  }

  async unregisterDevice(userId: number, token: string) {
    await this.db.query(`DELETE FROM "DeviceToken" WHERE "userId" = $1 AND "expoPushToken" = $2`, [userId, token]);
    return { ok: true };
  }

  // Okunmamış bildirim sayısı (mobil sekme rozeti).
  async unreadCount(userId: number) {
    const r = await this.db.query<{ adet: number }>(
      `SELECT COUNT(*)::int AS adet FROM "NotificationLog" WHERE "userId" = $1 AND okundu = false`,
      [userId],
    );
    return { adet: r.rows[0].adet };
  }

  // Bildirim ekranı açıldığında tümü okundu sayılır.
  async markAllRead(userId: number) {
    await this.db.query(
      `UPDATE "NotificationLog" SET okundu = true WHERE "userId" = $1 AND okundu = false`,
      [userId],
    );
    return { ok: true };
  }

  async listForUser(userId: number) {
    const r = await this.db.query(
      `SELECT id, tip, icerik, "createdAt" FROM "NotificationLog"
       WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 50`,
      [userId],
    );
    return r.rows;
  }

  // Çağıran akışı bekletmeden bildirim kaydeder ve gönderir. Hatalar yalnızca loglanır.
  notify(userId: number, tip: string, icerik: string, randevuId: number | null = null): void {
    this.deliver(userId, tip, icerik, randevuId).catch((err) =>
      this.logger.error(`Bildirim gönderilemedi: ${err instanceof Error ? err.message : String(err)}`),
    );
  }

  private async deliver(userId: number, tip: string, icerik: string, randevuId: number | null) {
    const log = await this.db.query<{ id: number }>(
      `INSERT INTO "NotificationLog" ("userId", tip, icerik, "randevuId") VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, tip, icerik, randevuId],
    );
    const devices = await this.db.query<{ expoPushToken: string }>(
      `SELECT "expoPushToken" FROM "DeviceToken" WHERE "userId" = $1`,
      [userId],
    );
    if (devices.rows.length === 0) return;

    const sent = await this.sendPush(
      devices.rows.map((d) => d.expoPushToken),
      TITLES[tip] ?? 'Bildirim',
      icerik,
    );
    if (sent) {
      await this.db.query(`UPDATE "NotificationLog" SET gonderildi = true WHERE id = $1`, [log.rows[0].id]);
    }
  }

  // Expo push servisi. Cihaz artık kayıtlı değilse (DeviceNotRegistered) token silinir.
  private async sendPush(tokens: string[], title: string, body: string): Promise<boolean> {
    let anySent = false;
    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk.map((to) => ({ to, title, body, sound: 'default' }))),
      });
      if (!res.ok) {
        this.logger.error(`Expo push HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
      (json.data ?? []).forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          anySent = true;
        } else if (ticket.details?.error === 'DeviceNotRegistered') {
          this.db
            .query(`DELETE FROM "DeviceToken" WHERE "expoPushToken" = $1`, [chunk[idx]])
            .catch(() => undefined);
        }
      });
    }
    return anySent;
  }

  // Önümüzdeki 2 saat içindeki onaylı randevular için müşteriye hatırlatma. Her randevu bir kez.
  async runReminders(): Promise<number> {
    const r = await this.db.query<{ id: number; customerId: number; baslangic: Date; hizmet: string }>(
      `SELECT a.id, a."customerId", a.baslangic, sv.ad AS hizmet
       FROM "Appointment" a JOIN "Service" sv ON sv.id = a."serviceId"
       WHERE a.status = 'ONAYLANDI' AND a."deletedAt" IS NULL
         AND a.baslangic > now() AND a.baslangic <= now() + interval '2 hours'
         AND NOT EXISTS (
           SELECT 1 FROM "NotificationLog" n WHERE n."randevuId" = a.id AND n.tip = 'HATIRLATMA'
         )`,
    );
    let count = 0;
    for (const row of r.rows) {
      try {
        // Kayıt önce yazılır; böylece bir sonraki çalıştırma aynı randevuyu tekrar seçmez.
        await this.deliver(row.customerId, 'HATIRLATMA', `${formatIstanbul(row.baslangic)} randevun var: ${row.hizmet}`, row.id);
        count++;
      } catch (err) {
        this.logger.error(`Hatırlatma hatası (randevu ${row.id}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return count;
  }
}
