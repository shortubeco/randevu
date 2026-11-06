import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { dayEndIso, dayStartIso, formatDate, formatTime, todayIstanbul } from '../lib/format';
import type { Appointment, AppointmentStatus } from '../types';

const STATUSES: AppointmentStatus[] = ['BEKLIYOR', 'ONAYLANDI', 'IPTAL', 'TAMAMLANDI', 'GELMEDI'];

const BADGE: Record<AppointmentStatus, string> = {
  BEKLIYOR: 'text-bg-warning',
  ONAYLANDI: 'text-bg-primary',
  IPTAL: 'text-bg-danger',
  TAMAMLANDI: 'text-bg-success',
  GELMEDI: 'text-bg-dark',
};

// Duruma göre gösterilecek işlemler (sunucudaki geçiş kurallarıyla aynı).
const ACTIONS: Record<AppointmentStatus, { to: AppointmentStatus; key: string; style: string }[]> = {
  BEKLIYOR: [
    { to: 'ONAYLANDI', key: 'appointments.approve', style: 'btn-success' },
    { to: 'IPTAL', key: 'appointments.cancel', style: 'btn-outline-danger' },
  ],
  ONAYLANDI: [
    { to: 'TAMAMLANDI', key: 'appointments.complete', style: 'btn-success' },
    { to: 'GELMEDI', key: 'appointments.noShow', style: 'btn-outline-secondary' },
    { to: 'IPTAL', key: 'appointments.cancel', style: 'btn-outline-danger' },
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
  const isAdmin = user?.role === 'ADMIN';

  // Masaüstü: birincil işlem satırda görünür, diğerleri ve Sil açılır menüde.
  const actionsDesktop = (a: Appointment) => {
    const [primary, ...rest] = ACTIONS[a.status];
    return (
      <div className="d-flex justify-content-end align-items-center gap-1">
        {primary && (
          <button className={`btn btn-sm ${primary.style}`} onClick={() => changeStatus(a.id, primary.to)}>
            {t(primary.key)}
          </button>
        )}
        <div className="dropdown d-inline-block">
          <button type="button" className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
            {t('appointments.actions')}
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-sm">
            {rest.map((act) => (
              <li key={act.to}>
                <button className="dropdown-item" onClick={() => changeStatus(a.id, act.to)}>{t(act.key)}</button>
              </li>
            ))}
            {rest.length > 0 && <li><hr className="dropdown-divider" /></li>}
            <li>
              <button className="dropdown-item text-danger" onClick={() => remove(a.id)}>{t('common.delete')}</button>
            </li>
          </ul>
        </div>
      </div>
    );
  };

  // Telefon: aynı genişlikte 2 sütunlu düğmeler; Sil ayrı renkte.
  const actionsGrid = (a: Appointment) => (
    <div className="row g-2">
      {ACTIONS[a.status].map((act) => (
        <div key={act.to} className="col-6">
          <button className={`btn btn-sm ${act.style} w-100`} onClick={() => changeStatus(a.id, act.to)}>
            {t(act.key)}
          </button>
        </div>
      ))}
      <div className="col-6">
        <button className="btn btn-sm btn-outline-danger w-100" onClick={() => remove(a.id)}>{t('common.delete')}</button>
      </div>
    </div>
  );

  return (
    <div className="vstack gap-4">
      <div>
        <h1 className="h3 page-title mb-1">{t('appointments.title')}</h1>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body d-flex flex-wrap align-items-end gap-3">
          <div>
            <label className="form-label small fw-semibold" htmlFor="date">{t('appointments.date')}</label>
            <input id="date" type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label small fw-semibold" htmlFor="status">{t('appointments.status')}</label>
            <select id="status" className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{t(`status.${s}`)}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-outline-primary" onClick={() => setDate(todayIstanbul())}>
            {t('appointments.today')}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-0">{error}</div>}

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {rows === null ? (
            <p className="p-4 text-secondary mb-0">{t('common.loading')}</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-secondary mb-0">{t('common.empty')}</p>
          ) : (
            <>
            {/* Telefon: kart görünümü; yatay kaydırma gerekmez */}
            <div className="d-md-none">
              {rows.map((a) => (
                <div key={a.id} className="p-3 border-bottom">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <span className="fw-semibold fs-5">{formatTime(a.baslangic)}</span>
                    <span className={`badge ${BADGE[a.status]}`}>{t(`status.${a.status}`)}</span>
                  </div>
                  <div>{a.musteriAd} {a.musteriSoyad}</div>
                  <div className="small text-secondary">
                    {formatDate(a.baslangic, lang)} · {a.hizmet}
                    {isAdmin && ` · ${a.kuaforAd} ${a.kuaforSoyad}`}
                  </div>
                  <div className="mt-2">{actionsGrid(a)}</div>
                </div>
              ))}
            </div>
            {/* Tablet ve masaüstü: tablo */}
            <div className="d-none d-md-block">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('appointments.time')}</th>
                    <th className="d-none d-lg-table-cell">{t('appointments.date')}</th>
                    <th>{t('appointments.customer')}</th>
                    <th className="d-none d-xl-table-cell">{t('appointments.phone')}</th>
                    <th>{t('appointments.service')}</th>
                    {isAdmin && <th>{t('appointments.stylist')}</th>}
                    <th>{t('appointments.status')}</th>
                    <th className="text-end">{t('appointments.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td className="fw-semibold">{formatTime(a.baslangic)}</td>
                      <td className="d-none d-lg-table-cell">{formatDate(a.baslangic, lang)}</td>
                      <td>{a.musteriAd} {a.musteriSoyad}</td>
                      <td className="d-none d-xl-table-cell">{a.musteriTelefon}</td>
                      <td>{a.hizmet}</td>
                      {isAdmin && <td>{a.kuaforAd} {a.kuaforSoyad}</td>}
                      <td><span className={`badge ${BADGE[a.status]}`}>{t(`status.${a.status}`)}</span></td>
                      <td className="text-end">{actionsDesktop(a)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
