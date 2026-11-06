export type Role = 'ADMIN' | 'KUAFOR' | 'MUSTERI';

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

export interface Stylist {
  id: number;
  ad: string;
  soyad: string;
  bio: string | null;
  photoUrl: string | null;
  slotDakika: number;
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
}

export interface CreatedAppointment {
  id: number;
  baslangic: string;
  bitis: string;
  status: AppointmentStatus;
}
