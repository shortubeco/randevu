import type { Appointment } from '../api/types';

// Europe/Istanbul sabit UTC+03:00 (DST yok). Intl yerine elle hesaplanır; Hermes'te güvenilir.
const IST_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const CHANGE_WINDOW_MS = 2 * 60 * 60 * 1000; // sunucudaki kuralla aynı

const pad = (n: number) => String(n).padStart(2, '0');

// Bugünün İstanbul tarihi, YYYY-MM-DD.
export function istanbulDateKey(ms: number = Date.now()): string {
  return new Date(ms + IST_MS).toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

// 0 = Pazar ... 6 = Cumartesi
export function weekdayOf(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// YYYY-MM-DD → GG.AA.YYYY
export function formatDateKey(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}.${m}.${y}`;
}

// ISO zaman → İstanbul saati, HH:mm
export function istanbulTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + IST_MS);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// ISO zaman → İstanbul tarihi, YYYY-MM-DD
export function istanbulDateOf(iso: string): string {
  return istanbulDateKey(new Date(iso).getTime());
}

// Sunucudaki kuralla aynı: iptal ve değişiklik randevuya 2 saatten az kala yapılamaz.
export function canChange(a: Pick<Appointment, 'status' | 'baslangic'>, now = Date.now()): boolean {
  const active = a.status === 'BEKLIYOR' || a.status === 'ONAYLANDI';
  return active && new Date(a.baslangic).getTime() - now >= CHANGE_WINDOW_MS;
}
