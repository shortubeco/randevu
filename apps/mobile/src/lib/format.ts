// Fiyat: tam sayıysa ondalıksız, değilse virgüllü iki basamak. Örn. "350 ₺", "349,50 ₺"
export function formatPrice(value: number): string {
  const n = Number(value);
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
  return `${text} ₺`;
}
