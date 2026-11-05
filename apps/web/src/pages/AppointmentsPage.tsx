import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { dayEndIso, dayStartIso, formatDate, formatTime, todayIstanbul } from '../lib/format';
import type { Appointment, AppointmentStatus } from '../types';

const STATUSES: AppointmentStatus[] = ['BEKLIYOR', 'ONAYLANDI', 'IPTAL', 'TAMAMLANDI', 'GELMEDI'];

// Duruma göre gösterilecek işlemler (sunucudaki geçiş kurallarıyla aynı).
const ACTIONS: Record<AppointmentStatus, { to: AppointmentStatus; key: string; danger?: boolean }[]> = {
  BEKLIYOR: [
    { to: 'ONAYLANDI', key: 'appointments.approve' },
    { to: 'IPTAL', key: 'appointments.cancel', danger: true },
  ],
  ONAYLANDI: [
    { to: 'TAMAMLANDI', key: 'appointments.complete' },
    { to: 'GELMEDI', key: 'appointments.noShow' },
    { to: 'IPTAL', key: 'appointments.cancel', danger: true },
  ],
  IPTAL: [],
  TAMAMLANDI: [],
  GELMEDI: [],
};

export default function AppointmentsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [date, setDate] = useState(todayIstanbul());
  const [status, setStatus] = useState<string>('');
  const [rows, setRows] = useState<Appointment[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ from: dayStartIso(date), to: dayEndIso(date) });
      if (status) params.set('status', status);
      const base = user?.role === 'ADMIN' ? '/admin/appointments' : '/appointments/stylist';
      setRows(await api<Appointment[]>(`${base}?${params.toString()}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }, [date, status, user?.role, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: number, to: AppointmentStatus) {
    try {
      await api(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: to }) });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  async function remove(id: number) {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await api(`/appointments/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  const lang = i18n.language;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('appointments.title')}</h1>

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="date">{t('appointments.date')}</label>
          <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="status">{t('appointments.status')}</label>
          <select id="status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
        </div>
        <button className="btn-ghost" onClick={() => setDate(todayIstanbul())}>{t('appointments.today')}</button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto p-0">
        {rows === null ? (
          <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">{t('common.empty')}</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">{t('appointments.time')}</th>
                <th className="px-3 py-2">{t('appointments.date')}</th>
                <th className="px-3 py-2">{t('appointments.customer')}</th>
                <th className="px-3 py-2">{t('appointments.phone')}</th>
                <th className="px-3 py-2">{t('appointments.service')}</th>
                {user?.role === 'ADMIN' && <th className="px-3 py-2">{t('appointments.stylist')}</th>}
                <th className="px-3 py-2">{t('appointments.status')}</th>
                <th className="px-3 py-2">{t('appointments.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{formatTime(a.baslangic)}</td>
                  <td className="px-3 py-2">{formatDate(a.baslangic, lang)}</td>
                  <td className="px-3 py-2">{a.musteriAd} {a.musteriSoyad}</td>
                  <td className="px-3 py-2">{a.musteriTelefon}</td>
                  <td className="px-3 py-2">{a.hizmet}</td>
                  {user?.role === 'ADMIN' && (
                    <td className="px-3 py-2">{a.kuaforAd} {a.kuaforSoyad}</td>
                  )}
                  <td className="px-3 py-2">{t(`status.${a.status}`)}</td>
                  <td className="space-x-2 whitespace-nowrap px-3 py-2">
                    {ACTIONS[a.status].map((act) => (
                      <button
                        key={act.to}
                        className={act.danger ? 'btn-danger' : 'btn-ghost'}
                        onClick={() => changeStatus(a.id, act.to)}
                      >
                        {t(act.key)}
                      </button>
                    ))}
                    <button className="btn-ghost" onClick={() => remove(a.id)}>{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
