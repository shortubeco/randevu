import { api } from './client';
import type {
  Appointment,
  AppNotification,
  AuthResponse,
  City,
  CreatedAppointment,
  Review,
  Shop,
  Slot,
  Stylist,
  StylistReviews,
  StylistService,
  User,
} from './types';

export interface RegisterInput {
  ad: string;
  soyad: string;
  telefon: string;
  email: string;
  password: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (input: RegisterInput) =>
    api<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false }),
  logout: (refreshToken: string) =>
    api<{ ok: true }>('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),
  me: () => api<User>('/auth/me'),
  updateProfile: (input: { ad?: string; soyad?: string; telefon?: string }) =>
    api<User>('/auth/me', { method: 'PATCH', body: input }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ ok: true }>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
};

// Konum: şehir, ilçe ve ilçedeki aktif dükkanlar. Kayıt öncesi de kullanılabilir (cities/districts herkese açık).
export const locationsApi = {
  cities: () => api<City[]>('/locations/cities', { auth: false }),
  districts: (ilId: number) => api<City[]>(`/locations/cities/${ilId}/districts`, { auth: false }),
  shops: (ilceId: number, service?: string) => {
    const q = service ? `?service=${encodeURIComponent(service)}` : '';
    return api<Shop[]>(`/locations/districts/${ilceId}/shops${q}`);
  },
};

export const stylistsApi = {
  // Bir dükkanın görünür (aktif) kuaförleri.
  byShop: (shopId: number) => api<Stylist[]>(`/stylists?shopId=${shopId}`),
  get: (id: number) => api<Stylist>(`/stylists/${id}`),
  services: (id: number) => api<StylistService[]>(`/stylists/${id}/services`),
  availability: (id: number, date: string, serviceId: number) =>
    api<Slot[]>(`/stylists/${id}/availability?date=${date}&serviceId=${serviceId}`),
};

export const appointmentsApi = {
  mine: () => api<Appointment[]>('/appointments/mine'),
  create: (stylistId: number, serviceId: number, startsAt: string) =>
    api<CreatedAppointment>('/appointments', {
      method: 'POST',
      body: { stylistId, serviceId, startsAt },
    }),
  reschedule: (id: number, startsAt: string) =>
    api<CreatedAppointment>(`/appointments/${id}/reschedule`, {
      method: 'PATCH',
      body: { startsAt },
    }),
  cancel: (id: number) =>
    api<{ id: number; status: string }>(`/appointments/${id}/cancel`, { method: 'PATCH' }),
};

export const reviewsApi = {
  forStylist: (stylistId: number) => api<StylistReviews>(`/stylists/${stylistId}/reviews`),
  create: (appointmentId: number, puan: number, yorum: string) =>
    api<Review>(`/appointments/${appointmentId}/review`, {
      method: 'POST',
      body: { puan, yorum: yorum.trim() || undefined },
    }),
};

export const notificationsApi = {
  mine: () => api<AppNotification[]>('/notifications/mine'),
  unreadCount: () => api<{ adet: number }>('/notifications/unread-count'),
  markAllRead: () => api<{ ok: true }>('/notifications/read-all', { method: 'POST' }),
};

export const devicesApi = {
  register: (expoPushToken: string) =>
    api<{ ok: true }>('/devices', { method: 'POST', body: { expoPushToken } }),
  unregister: (expoPushToken: string) =>
    api<{ ok: true }>(`/devices/${encodeURIComponent(expoPushToken)}`, { method: 'DELETE' }),
};
