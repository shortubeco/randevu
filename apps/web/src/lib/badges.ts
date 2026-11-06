import type { IsletmeDurum } from '../types';

// İşletme durumu rozet renkleri (renk + metin ile birlikte gösterilir).
export const DURUM_BADGE: Record<IsletmeDurum, string> = {
  ONAY_BEKLIYOR: 'text-bg-warning',
  AKTIF: 'text-bg-success',
  PASIF: 'text-bg-secondary',
};
