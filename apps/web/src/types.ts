export type AppointmentStatus = 'BEKLIYOR' | 'ONAYLANDI' | 'IPTAL' | 'TAMAMLANDI' | 'GELMEDI';

export interface Appointment {
  id: number;
  baslangic: string;
  bitis: string;
  status: AppointmentStatus;
  stylistId: number;
  kuaforAd: string;
  kuaforSoyad: string;
  serviceId: number;
  hizmet: string;
  fiyat: number;
  musteriAd: string;
  musteriSoyad: string;
  musteriTelefon: string;
}

export interface AdminStylist {
  id: number;
  ad: string;
  soyad: string;
  email: string;
  telefon: string;
  isActive: boolean;
  bio: string | null;
  photoUrl: string | null;
  slotDakika: number;
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

export interface OwnStylist {
  id: number;
  bio: string | null;
  photoUrl: string | null;
  slotDakika: number;
}
