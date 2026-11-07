export type AppointmentStatus = 'BEKLIYOR' | 'ONAYLANDI' | 'IPTAL' | 'TAMAMLANDI' | 'GELMEDI';
export type IsletmeDurum = 'ONAY_BEKLIYOR' | 'AKTIF' | 'PASIF';
export type PlanKod = 'UCRETSIZ' | 'SILVER' | 'GOLD';

export interface Appointment {
  id: number;
  baslangic: string;
  bitis: string;
  status: AppointmentStatus;
  stylistId: number;
  kuaforAd: string;
  kuaforSoyad: string;
  dukkanAd: string;
  isletmeAd: string;
  serviceId: number;
  hizmet: string;
  fiyat: number;
  musteriAd: string;
  musteriSoyad: string;
  musteriTelefon: string;
  puan: number | null;
}

export interface Service {
  id: number;
  ad: string;
  sureDk: number;
  fiyat: number;
  aktif: boolean;
}

export interface WorkingHour {
  gun: number;
  baslangic: string;
  bitis: string;
  molaBaslangic: string | null;
  molaBitis: string | null;
}

export interface TimeOff {
  id: number;
  baslangic: string;
  bitis: string;
  sebep: string | null;
}

export interface Plan {
  kod: PlanKod;
  ad: string;
  siralama: number;
  maxDukkan: number | null;
  maxKuaforDukkan: number | null;
  maxHizmetKuafor: number | null;
  aylikUcret: number | null;
}

export interface City {
  id: number;
  ad: string;
}

export interface Havale {
  banka: string;
  alici: string;
  iban: string;
}

export interface Shop {
  id: number;
  ad: string;
  adres: string | null;
  telefon: string | null;
  aktif: boolean;
  ilId: number;
  ilceId: number;
  ilAd: string;
  ilceAd: string;
  kuaforSayisi: number;
}

export interface OwnerStylist {
  id: number;
  ad: string;
  soyad: string;
  email: string;
  telefon: string;
  aktif: boolean;
  bio: string | null;
  photoUrl: string | null;
  slotDakika: number;
  dukkanId: number;
  dukkanAd: string;
}

export interface Overview {
  id: number;
  ad: string;
  durum: IsletmeDurum;
  odemeGunu: number | null;
  onayTarihi: string | null;
  planKod: PlanKod;
  planAd: string;
  aylikUcret: number | null;
  maxDukkan: number | null;
  maxKuaforDukkan: number | null;
  maxHizmetKuafor: number | null;
}

export interface AdminBusiness {
  id: number;
  ad: string;
  durum: IsletmeDurum;
  odemeGunu: number | null;
  onayTarihi: string | null;
  planKod: PlanKod;
  planAd: string;
  aylikUcret: number | null;
  sahipAd: string;
  sahipSoyad: string;
  email: string;
  telefon: string;
  dukkanSayisi: number;
}

export interface Payment {
  id: number;
  odemeTarihi: string;
  tutar: number | null;
  onaylandiAt: string;
}

export interface AdminBusinessDetail extends AdminBusiness {
  dukkanlar: { id: number; ad: string; adres: string | null; telefon: string | null; aktif: boolean; ilAd: string; ilceAd: string }[];
  odemeler: Payment[];
}

export interface PaymentRow {
  id: number;
  ad: string;
  durum: IsletmeDurum;
  planAd: string;
  odemeGunu: number;
  odendi: boolean;
  odeme: Payment | null;
}

export interface OverdueRow {
  id: number;
  ad: string;
  durum: IsletmeDurum;
  planAd: string;
  odemeGunu: number;
  sonOdemeTarihi: string;
}

export interface AuditRow {
  id: number;
  islem: string;
  hedefTablo: string;
  hedefId: string;
  oncekiDeger: unknown;
  yeniDeger: unknown;
  createdAt: string;
  adminAd: string;
  adminSoyad: string;
}

export interface Profile {
  id: number;
  bio: string | null;
  photoUrl: string | null;
  slotDakika: number;
}

export interface LandingStylist {
  id: number;
  ad: string;
  soyadKisa: string;
  photoUrl: string | null;
  bio: string | null;
  dukkanAd: string;
  isletmeAd: string;
  ilAd: string;
  ilceAd: string;
  ortalama: number;
  adet: number;
}

export interface LandingReview {
  id: number;
  puan: number;
  yorum: string;
  musteriAd: string;
  musteriSoyadKisa: string;
  kuaforAd: string;
  kuaforSoyadKisa: string;
  isletmeAd: string;
  ilceAd: string;
}

export interface LandingData {
  stats: { isletme: number; kuafor: number; degerlendirme: number };
  topStylists: LandingStylist[];
  cities: { ilAd: string; stylists: LandingStylist[] }[];
  // Eski API sürümü bu alanı göndermez; bölüm o durumda gizlenir.
  yorumlar?: LandingReview[];
}

export interface Dashboard {
  scope: 'ISLETME_SAHIBI' | 'KUAFOR';
  kpi: { bugun: number; bekleyen: number; buAyTamamlanan: number; buAyCiro: number; buAyToplam: number };
  monthly: { ay: string; toplam: number; tamamlanan: number; ciro: number }[];
  statusMonth: { status: AppointmentStatus; adet: number }[];
  bugunList: Appointment[];
  kuaforler?: { id: number; ad: string; soyad: string; aktif: boolean; buAy: number; ciro: number }[];
}

export interface PaymentsResponse {
  tarih: string;
  gunluk: PaymentRow[];
  gecmis: OverdueRow[];
}

export interface OwnStylistProfile {
  id: number;
  ad: string;
  soyad: string;
  telefon: string;
  email: string;
  bio: string | null;
  photoUrl: string | null;
  slotDakika: number;
  aktif: boolean;
  dukkanId: number;
}

export interface StylistReview {
  adet: number;
  ortalama: number | null;
  yorumlar: { id: number; puan: number; yorum: string | null; createdAt: string; musteri: string }[];
}
