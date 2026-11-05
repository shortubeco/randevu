// Tüm saatler Europe/Istanbul'da gösterilir (sunucu da aynı saat dilimini kullanır).
const TZ = 'Europe/Istanbul';

export function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'tr-TR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Istanbul'daki bugünün tarihi (YYYY-MM-DD).
export function todayIstanbul(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  return parts; // en-CA biçimi YYYY-MM-DD verir
}

// Bir Istanbul günü için sunucuya gidecek ISO başlangıcı.
export function dayStartIso(date: string): string {
  return `${date}T00:00:00+03:00`;
}

export function dayEndIso(date: string): string {
  return `${date}T23:59:59+03:00`;
}
