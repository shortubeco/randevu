import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';
import type {
  AdminBusiness,
  AdminBusinessDetail,
  Appointment,
  AppointmentStatus,
  AuditRow,
  City,
  Dashboard,
  Havale,
  LandingData,
  OwnerStylist,
  Overview,
  PaymentsResponse,
  Plan,
  PlanKod,
  Profile,
  Service,
  Shop,
  TimeOff,
  WorkingHour,
  StylistReview,
  OwnStylistProfile,
} from '../types';

// Önbellek bir yıl tutulur. Sayfalar arasında gezinirken veri store'dan gelir; sunucuya yalnızca
// sekme yenilenince (store sıfırlanınca) veya ilgili bir yazma işlemi sonrası istek gider.
const CACHE_SECONDS = 60 * 60 * 24 * 365;

export interface RegisterResult {
  isletmeId: number;
  durum: string;
  havale: Havale | null;
}

export interface AppointmentFilter {
  status?: string;
  from?: string;
  to?: string;
}

export interface PaymentRow {
  id: number;
  ad: string;
  durum: string;
  planAd: string;
  odemeGunu: number;
  odendi: boolean;
  odeme: { id: number; odemeTarihi: string; tutar: number | null; onaylandiAt: string } | null;
}

const qs = (params: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  keepUnusedDataFor: CACHE_SECONDS,
  tagTypes: [
    'Plans', 'Landing', 'Havale', 'Cities', 'Districts', 'Me',
    'Business', 'OwnerShops', 'OwnerStylists', 'StylistDetail', 'StylistServices', 'StylistReviews',
    'Schedule', 'StylistMe', 'Appointments', 'Dashboard',
    'AdminBusiness', 'AdminBusinessDetail', 'Payments', 'Audit',
  ],
  endpoints: (b) => ({
    // ---------- Herkese açık ----------
    plans: b.query<Plan[], void>({
      query: () => ({ url: '/plans' }),
      providesTags: ['Plans'],
    }),
    landing: b.query<LandingData, void>({
      query: () => ({ url: '/landing' }),
      providesTags: ['Landing'],
    }),
    havale: b.query<Havale | null, void>({
      query: () => ({ url: '/settings/havale' }),
      providesTags: ['Havale'],
    }),
    cities: b.query<City[], void>({
      query: () => ({ url: '/locations/cities' }),
      providesTags: ['Cities'],
    }),
    districts: b.query<City[], number>({
      query: (ilId) => ({ url: `/locations/cities/${ilId}/districts` }),
      providesTags: ['Districts'],
    }),
    registerIsletme: b.mutation<RegisterResult, unknown>({
      query: (body) => ({ url: '/auth/isletme-kayit', method: 'POST', body }),
    }),

    // ---------- Oturum sahibi ----------
    updateMe: b.mutation<unknown, { ad?: string; soyad?: string; telefon?: string }>({
      query: (body) => ({ url: '/auth/me', method: 'PATCH', body }),
    }),
    changePassword: b.mutation<unknown, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
    }),

    // ---------- İşletme sahibi ----------
    overview: b.query<Overview, void>({
      query: () => ({ url: '/business' }),
      providesTags: ['Business'],
    }),
    ownerShops: b.query<Shop[], void>({
      query: () => ({ url: '/business/shops' }),
      providesTags: ['OwnerShops'],
    }),
    createShop: b.mutation<unknown, unknown>({
      query: (body) => ({ url: '/business/shops', method: 'POST', body }),
      invalidatesTags: ['OwnerShops', 'Business', 'Dashboard'],
    }),
    updateShop: b.mutation<unknown, { id: number; body: unknown }>({
      query: ({ id, body }) => ({ url: `/business/shops/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['OwnerShops', 'Business', 'OwnerStylists'],
    }),
    deleteShop: b.mutation<unknown, number>({
      query: (id) => ({ url: `/business/shops/${id}`, method: 'DELETE' }),
      invalidatesTags: ['OwnerShops', 'Business'],
    }),

    ownerStylists: b.query<OwnerStylist[], void>({
      query: () => ({ url: '/business/stylists' }),
      providesTags: ['OwnerStylists'],
    }),
    ownerStylist: b.query<OwnerStylist, number>({
      query: (id) => ({ url: `/business/stylists/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'StylistDetail', id }],
    }),
    createStylist: b.mutation<unknown, unknown>({
      query: (body) => ({ url: '/business/stylists', method: 'POST', body }),
      invalidatesTags: ['OwnerStylists', 'OwnerShops', 'Business'],
    }),
    updateStylist: b.mutation<unknown, { id: number; body: unknown }>({
      query: ({ id, body }) => ({ url: `/business/stylists/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => ['OwnerStylists', 'Business', { type: 'StylistDetail', id }],
    }),
    deleteStylist: b.mutation<unknown, number>({
      query: (id) => ({ url: `/business/stylists/${id}`, method: 'DELETE' }),
      invalidatesTags: ['OwnerStylists', 'OwnerShops', 'Business', 'Dashboard'],
    }),

    stylistServices: b.query<Service[], number>({
      query: (id) => ({ url: `/business/stylists/${id}/services` }),
      providesTags: (_r, _e, id) => [{ type: 'StylistServices', id }],
    }),
    createService: b.mutation<unknown, { stylistId: number; body: unknown }>({
      query: ({ stylistId, body }) => ({ url: `/business/stylists/${stylistId}/services`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { stylistId }) => [{ type: 'StylistServices', id: stylistId }],
    }),
    updateService: b.mutation<unknown, { id: number; stylistId: number; body: unknown }>({
      query: ({ id, body }) => ({ url: `/business/services/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { stylistId }) => [{ type: 'StylistServices', id: stylistId }],
    }),
    deleteService: b.mutation<unknown, { id: number; stylistId: number }>({
      query: ({ id }) => ({ url: `/business/services/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { stylistId }) => [{ type: 'StylistServices', id: stylistId }],
    }),

    stylistReviews: b.query<StylistReview, number>({
      query: (id) => ({ url: `/business/stylists/${id}/reviews` }),
      providesTags: (_r, _e, id) => [{ type: 'StylistReviews', id }],
    }),

    // ---------- Çalışma saatleri ve izinler (base: kuaförün kendi veya işletme sahibinin yolu) ----------
    workingHours: b.query<WorkingHour[], string>({
      query: (base) => ({ url: `${base}/working-hours` }),
      providesTags: (_r, _e, base) => [{ type: 'Schedule', id: base }],
    }),
    timeOff: b.query<TimeOff[], string>({
      query: (base) => ({ url: `${base}/time-off` }),
      providesTags: (_r, _e, base) => [{ type: 'Schedule', id: base }],
    }),
    setWorkingHours: b.mutation<unknown, { base: string; days: unknown[] }>({
      query: ({ base, days }) => ({ url: `${base}/working-hours`, method: 'PUT', body: { days } }),
      invalidatesTags: (_r, _e, { base }) => [{ type: 'Schedule', id: base }],
    }),
    addTimeOff: b.mutation<unknown, { base: string; body: unknown }>({
      query: ({ base, body }) => ({ url: `${base}/time-off`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { base }) => [{ type: 'Schedule', id: base }],
    }),
    deleteTimeOff: b.mutation<unknown, { base: string; tid: number }>({
      query: ({ base, tid }) => ({ url: `${base}/time-off/${tid}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { base }) => [{ type: 'Schedule', id: base }],
    }),

    // ---------- Kuaför (kendi profili) ----------
    myStylist: b.query<OwnStylistProfile, void>({
      query: () => ({ url: '/stylists/me' }),
      providesTags: ['StylistMe'],
    }),
    updateMyStylist: b.mutation<Profile, { bio?: string; photoUrl?: string; slotDakika?: number }>({
      query: (body) => ({ url: '/stylists/me', method: 'PATCH', body }),
      invalidatesTags: ['StylistMe'],
    }),

    // ---------- Randevular ve panel ----------
    appointmentsBusiness: b.query<Appointment[], AppointmentFilter>({
      query: (f) => ({ url: `/appointments/business${qs({ status: f.status, from: f.from, to: f.to })}` }),
      providesTags: ['Appointments'],
    }),
    appointmentsStylist: b.query<Appointment[], AppointmentFilter>({
      query: (f) => ({ url: `/appointments/stylist${qs({ status: f.status, from: f.from, to: f.to })}` }),
      providesTags: ['Appointments'],
    }),
    setAppointmentStatus: b.mutation<unknown, { id: number; status: AppointmentStatus }>({
      query: ({ id, status }) => ({ url: `/appointments/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Appointments', 'Dashboard'],
    }),
    deleteAppointment: b.mutation<unknown, number>({
      query: (id) => ({ url: `/appointments/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Appointments', 'Dashboard'],
    }),
    dashboard: b.query<Dashboard, void>({
      query: () => ({ url: '/dashboard' }),
      providesTags: ['Dashboard'],
    }),

    // ---------- Platform admini ----------
    adminBusinesses: b.query<AdminBusiness[], void>({
      query: () => ({ url: '/admin/business' }),
      providesTags: ['AdminBusiness'],
    }),
    adminBusiness: b.query<AdminBusinessDetail, number>({
      query: (id) => ({ url: `/admin/business/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'AdminBusinessDetail', id }],
    }),
    approveBusiness: b.mutation<unknown, { id: number; body: unknown }>({
      query: ({ id, body }) => ({ url: `/admin/business/${id}/approve`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => ['AdminBusiness', 'Payments', 'Audit', { type: 'AdminBusinessDetail', id }],
    }),
    setBusinessStatus: b.mutation<unknown, { id: number; durum: 'AKTIF' | 'PASIF' }>({
      query: ({ id, durum }) => ({ url: `/admin/business/${id}/status`, method: 'PATCH', body: { durum } }),
      invalidatesTags: (_r, _e, { id }) => ['AdminBusiness', 'Payments', 'Audit', { type: 'AdminBusinessDetail', id }],
    }),
    setPaymentDay: b.mutation<unknown, { id: number; odemeGunu: number }>({
      query: ({ id, odemeGunu }) => ({ url: `/admin/business/${id}/payment-day`, method: 'PATCH', body: { odemeGunu } }),
      invalidatesTags: (_r, _e, { id }) => ['AdminBusiness', 'Payments', 'Audit', { type: 'AdminBusinessDetail', id }],
    }),
    payments: b.query<PaymentsResponse, string>({
      query: (date) => ({ url: `/admin/payments?date=${date}` }),
      providesTags: ['Payments'],
    }),
    recordPayment: b.mutation<unknown, { isletmeId: number; odemeTarihi: string }>({
      query: (body) => ({ url: '/admin/payments', method: 'POST', body }),
      invalidatesTags: (_r, _e, { isletmeId }) => ['Payments', 'AdminBusiness', 'Audit', { type: 'AdminBusinessDetail', id: isletmeId }],
    }),
    updatePlan: b.mutation<unknown, { kod: PlanKod; aylikUcret: number }>({
      query: ({ kod, aylikUcret }) => ({ url: `/admin/plans/${kod}`, method: 'PATCH', body: { aylikUcret } }),
      invalidatesTags: ['Plans', 'Audit'],
    }),
    setHavale: b.mutation<Havale, Havale>({
      query: (body) => ({ url: '/admin/settings/havale', method: 'PUT', body }),
      invalidatesTags: ['Havale', 'Audit'],
    }),
    audit: b.query<AuditRow[], number>({
      query: (limit) => ({ url: `/admin/audit?limit=${limit}` }),
      providesTags: ['Audit'],
    }),
  }),
});

export const {
  usePlansQuery,
  useLandingQuery,
  useHavaleQuery,
  useCitiesQuery,
  useDistrictsQuery,
  useRegisterIsletmeMutation,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useOverviewQuery,
  useOwnerShopsQuery,
  useCreateShopMutation,
  useUpdateShopMutation,
  useDeleteShopMutation,
  useOwnerStylistsQuery,
  useOwnerStylistQuery,
  useCreateStylistMutation,
  useUpdateStylistMutation,
  useDeleteStylistMutation,
  useStylistServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useStylistReviewsQuery,
  useWorkingHoursQuery,
  useTimeOffQuery,
  useSetWorkingHoursMutation,
  useAddTimeOffMutation,
  useDeleteTimeOffMutation,
  useMyStylistQuery,
  useUpdateMyStylistMutation,
  useAppointmentsBusinessQuery,
  useAppointmentsStylistQuery,
  useSetAppointmentStatusMutation,
  useDeleteAppointmentMutation,
  useDashboardQuery,
  useAdminBusinessesQuery,
  useAdminBusinessQuery,
  useApproveBusinessMutation,
  useSetBusinessStatusMutation,
  useSetPaymentDayMutation,
  usePaymentsQuery,
  useRecordPaymentMutation,
  useUpdatePlanMutation,
  useSetHavaleMutation,
  useAuditQuery,
} = apiSlice;
