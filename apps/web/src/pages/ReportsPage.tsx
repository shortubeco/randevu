import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/client';
import { dayEndIso, dayStartIso, todayIstanbul } from '../lib/format';
import type { AppointmentStatus } from '../types';

interface ReportData {
  byStatus: { status: AppointmentStatus; adet: number }[];
  byStylist: { stylistId: number; ad: string; soyad: string; toplam: number; tamamlanan: number; ciro: number }[];
  totalRevenue: number;
}

const BAR_STATUS: Record<AppointmentStatus, string> = {
  BEKLIYOR: 'bg-warning',
  ONAYLANDI: 'bg-primary',
  TAMAMLANDI: 'bg-success',
  GELMEDI: 'bg-dark',
  IPTAL: 'bg-danger',
};

function monthStart(): string {
  return `${todayIstanbul().slice(0, 8)}01`;
}

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayIstanbul());
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState('');

  const money = new Intl.NumberFormat(i18n.language === 'en' ? 'en-GB' : 'tr-TR', { style: 'currency', currency: 'TRY' });

  // Sayfa açılınca bu ayın raporu gösterilir; tarih aralığı değiştirilip yeniden getirilebilir.
  useEffect(() => {
    const params = new URLSearchParams({ from: dayStartIso(monthStart()), to: dayEndIso(todayIstanbul()) });
    api<ReportData>(`/admin/reports?${params.toString()}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : t('common.error')));
  }, [t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (to < from) {
      setError(t('reports.invalidRange'));
      return;
    }
    try {
      const params = new URLSearchParams({ from: dayStartIso(from), to: dayEndIso(to) });
      setData(await api<ReportData>(`/admin/reports?${params.toString()}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  const statusMax = Math.max(1, ...(data?.byStatus.map((s) => s.adet) ?? [1]));

  return (
    <div className="vstack gap-4">
      <h1 className="h3 page-title mb-0">{t('reports.title')}</h1>

      <form onSubmit={onSubmit} className="card shadow-sm border-0">
        <div className="card-body d-flex flex-wrap align-items-end gap-3">
          <div>
            <label className="form-label small fw-semibold" htmlFor="from">{t('common.from')}</label>
            <input id="from" type="date" className="form-control" value={from} onChange={(e) => setFrom(e.target.value)} required />
          </div>
          <div>
            <label className="form-label small fw-semibold" htmlFor="to">{t('common.to')}</label>
            <input id="to" type="date" className="form-control" value={to} onChange={(e) => setTo(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary">
            <i className="bi bi-search me-1" aria-hidden="true" />
            {t('reports.run')}
          </button>
        </div>
      </form>

      {error && <div className="alert alert-danger mb-0">{error}</div>}

      {data && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <h2 className="h6 fw-semibold mb-3">{t('reports.byStatus')}</h2>
                {data.byStatus.length === 0 ? (
                  <p className="text-secondary small mb-0">{t('common.empty')}</p>
                ) : (
                  <div className="vstack gap-3">
                    {data.byStatus.map((r) => (
                      <div key={r.status}>
                        <div className="d-flex justify-content-between small mb-1">
                          <span>{t(`status.${r.status}`)}</span>
                          <span className="fw-semibold">{r.adet}</span>
                        </div>
                        <div className="progress progress-thin">
                          <div className={`progress-bar ${BAR_STATUS[r.status]}`} style={{ width: `${(r.adet / statusMax) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h6 fw-semibold mb-0">{t('reports.byStylist')}</h2>
                  <span className="badge text-bg-success fs-6">
                    {t('reports.totalRevenue')}: {money.format(data.totalRevenue)}
                  </span>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 small">
                    <thead className="table-light">
                      <tr>
                        <th>{t('reports.stylist')}</th>
                        <th className="text-end">{t('reports.total')}</th>
                        <th className="text-end">{t('reports.completed')}</th>
                        <th className="text-end">{t('reports.revenue')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byStylist.map((r) => (
                        <tr key={r.stylistId}>
                          <td className="fw-semibold">{r.ad} {r.soyad}</td>
                          <td className="text-end">{r.toplam}</td>
                          <td className="text-end">{r.tamamlanan}</td>
                          <td className="text-end">{money.format(Number(r.ciro))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
