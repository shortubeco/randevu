// Veritabanındaki rollerle aynı. Mobil uygulama yalnızca MUSTERI hesaplarını kabul eder.
export type Role = 'PLATFORM_ADMIN' | 'ISLETME_SAHIBI' | 'KUAFOR' | 'MUSTERI';

export interface User {
  id: number;
  ad: string;
  soyad: string;
  telefon: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Kuaför: dükkanı ve işletmesiyle birlikte gelir. Puan ortalaması ve değerlendirme sayısı içerir.
export interface Stylist {
  id: number;
  ad: string;
  soyad: string;
  bio: string | null;
  photoUrl: string | null;
  slotDakika: number;
  dukkanId: number;
  dukkanAd: string;
  isletmeId: number;
  isletmeAd: string;
  ortalama: number | null;
  adet: number;
}

export interface City {
  id: number;
  ad: string;
}

// Şehir/ilçe seçildikten sonra listelenen aktif dükkan.
export interface Shop {
  id: number;
  ad: string;
  adres: string | null;
  telefon: string | null;
  isletmeAd: string;
  plan: string;
  planAd: string;
  siralama: number;
  kuaforSayisi: number;
}

export interface StylistService {
  id: number;
  ad: string;
  sureDk: number;
  fiyat: number;
}

export interface Slot {
  startsAt: string;
  label: string; // "HH:mm", Europe/Istanbul
}

export type AppointmentStatus = 'BEKLIYOR' | 'ONAYLANDI' | 'IPTAL' | 'TAMAMLANDI' | 'GELMEDI';

export interface Appointment {
  id: number;
  baslangic: string;
  bitis: string;
  status: AppointmentStatus;
  notu: string | null;
  stylistId: number;
  kuaforAd: string;
  kuaforSoyad: string;
  serviceId: number;
  hizmet: string;
  fiyat: number;
  puan: number | null; // müşterinin verdiği puan (yoksa null)
}

export interface Review {
  id: number;
  puan: number;
  yorum: string | null;
  createdAt: string;
  musteri: string; // "Ad S." biçiminde
}

export interface StylistReviews {
  adet: number;
  ortalama: number | null;
  yorumlar: Review[];
}

export interface AppNotification {
  id: number;
  tip: string;
  icerik: string;
  createdAt: string;
}

export interface CreatedAppointment {
  id: number;
  baslangic: string;
  bitis: string;
  status: AppointmentStatus;
}
