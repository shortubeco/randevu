const FOLD: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};

// Aramada Türkçe harf ve büyük/küçük farkını yok sayar: "sanliurfa" ve "ŞANLIURFA" Şanlıurfa'yı bulur.
// Hermes'te yerel ayarlı küçük harf çevirisine güvenilmediği için İ ve I elle çevrilir.
export function foldTurkish(value: string): string {
  return value
    .replace(/[İI]/g, 'i')
    .toLowerCase()
    .replace(/[çğıöşüâîû]/g, (ch) => FOLD[ch])
    .replace(/̇/g, '')
    .trim();
}
