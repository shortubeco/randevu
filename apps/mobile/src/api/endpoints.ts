import { api } from './client';
import type {
  Appointment,
  AuthResponse,
  CreatedAppointment,
  Slot,
  Stylist,
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

export const stylistsApi = {
  list: () => api<Stylist[]>('/stylists'),
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
