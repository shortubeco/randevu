// Fiyat: tam sayıysa ondalıksız, değilse virgüllü iki basamak; binlik ayraç nokta. Örn. "350 ₺", "1.800 ₺", "349,50 ₺"
export function formatPrice(value: number): string {
  const n = Number(value);
  const [whole, decimals] = (Number.isInteger(n) ? String(n) : n.toFixed(2)).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${decimals ? `${grouped},${decimals}` : grouped} ₺`;
}
