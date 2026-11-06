import { BadRequestException, ConflictException } from '@nestjs/common';

// Dışarıdan transaction'a veya havuza bağlanan sorgu fonksiyonu.
export type Sql = (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>;

export const MIN_MS = 60 * 1000;
// Europe/Istanbul yıl boyunca UTC+03:00 (yaz saati uygulaması 2016'da kaldırıldı).
export const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;
export const ACTIVE_STATUSES = ['BEKLIYOR', 'ONAYLANDI'];

export interface Interval {
  start: number; // epoch ms
  end: number;
}

export interface WorkingRow {
  gun: number;
  baslangic: string;
  bitis: string;
  molaBaslangic: string | null;
  molaBitis: string | null;
}

export function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// Verilen anın Istanbul'daki takvim günü (YYYY-MM-DD).
export function istanbulDate(ms: number): string {
  return new Date(ms + ISTANBUL_OFFSET_MS).toISOString().slice(0, 10);
}

// Verilen anın Istanbul'daki saati (HH:mm).
export function istanbulTime(ms: number): string {
  return new Date(ms + ISTANBUL_OFFSET_MS).toISOString().slice(11, 16);
}

// Istanbul gününün başlangıcı (gece yarısı) epoch ms olarak.
export function dayStartMs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d) - ISTANBUL_OFFSET_MS;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToMs(dayStart: number, hhmm: string): number {
  return dayStart + hhmmToMinutes(hhmm) * MIN_MS;
}

// 0 = Pazar ... 6 = Cumartesi
export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function fitsIn(outer: Interval, inner: Interval): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

export async function loadWorkingRows(sql: Sql, stylistId: number): Promise<WorkingRow[]> {
  const r = await sql(
    `SELECT gun, baslangic, bitis, "molaBaslangic", "molaBitis"
     FROM "WorkingHours" WHERE "stylistId" = $1 ORDER BY gun, baslangic`,
    [stylistId],
  );
  return r.rows;
}

// Belirli bir günün çalışma aralıkları; mola varsa aralık ikiye bölünür.
export function workingIntervals(rows: WorkingRow[], dateStr: string): Interval[] {
  const dow = dayOfWeek(dateStr);
  const day = dayStartMs(dateStr);
  const result: Interval[] = [];
  for (const r of rows.filter((x) => x.gun === dow)) {
    const start = minutesToMs(day, r.baslangic);
    const end = minutesToMs(day, r.bitis);
    if (r.molaBaslangic && r.molaBitis) {
      result.push({ start, end: minutesToMs(day, r.molaBaslangic) });
      result.push({ start: minutesToMs(day, r.molaBitis), end });
    } else {
      result.push({ start, end });
    }
  }
  return result;
}

// Verilen aralıkta kuaförü meşgul eden izinler ve aktif randevular.
export async function busyIntervals(
  sql: Sql,
  stylistId: number,
  from: number,
  to: number,
  excludeAppointmentId = 0,
): Promise<Interval[]> {
  const timeOff = await sql(
    `SELECT baslangic, bitis FROM "TimeOff"
     WHERE "stylistId" = $1 AND baslangic < $3 AND bitis > $2`,
    [stylistId, new Date(from), new Date(to)],
  );
  const apts = await sql(
    `SELECT baslangic, bitis FROM "Appointment"
     WHERE "stylistId" = $1 AND "deletedAt" IS NULL
       AND status::text = ANY($4::text[])
       AND baslangic < $3 AND bitis > $2 AND id <> $5`,
    [stylistId, new Date(from), new Date(to), ACTIVE_STATUSES, excludeAppointmentId],
  );
  return [...timeOff.rows, ...apts.rows].map((r) => ({
    start: new Date(r.baslangic).getTime(),
    end: new Date(r.bitis).getTime(),
  }));
}

// Randevu oluşturma ve değiştirmede ortak kontroller. Çağıran taraf kuaförün
// Stylist satırını FOR UPDATE ile kilitlemiş olmalı; böylece aynı kuaför için
// istekler sıraya girer ve çift rezervasyon oluşmaz.
export async function validateBooking(
  sql: Sql,
  stylistId: number,
  startMs: number,
  durationMin: number,
  slotMin: number,
  excludeAppointmentId = 0,
): Promise<void> {
  const dateStr = istanbulDate(startMs);
  const slot: Interval = { start: startMs, end: startMs + durationMin * MIN_MS };

  const blocks = workingIntervals(await loadWorkingRows(sql, stylistId), dateStr);
  const block = blocks.find((b) => fitsIn(b, slot));
  if (!block) {
    throw new BadRequestException('Seçilen saat kuaförün çalışma saatleri dışında');
  }
  if ((startMs - block.start) % (slotMin * MIN_MS) !== 0) {
    throw new BadRequestException('Seçilen saat kuaförün slot aralığına uymuyor');
  }

  const busy = await busyIntervals(sql, stylistId, slot.start, slot.end, excludeAppointmentId);
  if (busy.some((b) => overlaps(b, slot))) {
    throw new ConflictException('Seçilen saat dolu');
  }
}

// Kuaförün verilen aralıkta onaylı veya bekleyen randevu sayısı (izin çakışması için).
export async function countActiveOverlapping(sql: Sql, stylistId: number, from: Date, to: Date): Promise<number> {
  const r = await sql(
    `SELECT COUNT(*)::int AS n FROM "Appointment"
     WHERE "stylistId" = $1 AND "deletedAt" IS NULL
       AND status IN ('BEKLIYOR', 'ONAYLANDI')
       AND baslangic < $3 AND bitis > $2`,
    [stylistId, from, to],
  );
  return r.rows[0].n;
}

// Kuaförün ileri tarihli onaylı veya bekleyen randevu sayısı (pasifleştirme ve silme için).
export async function countUpcomingActive(sql: Sql, stylistId: number): Promise<number> {
  const r = await sql(
    `SELECT COUNT(*)::int AS n FROM "Appointment"
     WHERE "stylistId" = $1 AND "deletedAt" IS NULL
       AND status IN ('BEKLIYOR', 'ONAYLANDI') AND baslangic > now()`,
    [stylistId],
  );
  return r.rows[0].n;
}
