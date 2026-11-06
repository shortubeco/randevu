import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import BarChart from '../components/BarChart';
import { formatDate, formatTime } from '../lib/format';
import type { AppointmentStatus } from '../types';

interface MonthRow {
  ay: string;
  toplam: number;
  tamamlanan: number;
  ciro: number;
}

interface Dashboard {
  scope: 'ADMIN' | 'KUAFOR';
  kpi: {
    bugun: number;
    bekleyen: number;
    buAyTamamlanan: number;
    buAyCiro: number;
    buAyToplam: number;
    musteri?: number;
    kuafor?: number;
    hizmet?: number;
  };
  monthly: MonthRow[];
  statusMonth: { status: AppointmentStatus; adet: number }[];
  bugunList: {
    id: number;
    baslangic: string;
    status: AppointmentStatus;
    kuaforAd: string;
    kuaforSoyad: string;
    hizmet: string;
    musteriAd: string;
    musteriSoyad: string;
  }[];
  kuaforler?: { id: number; ad: string; soyad: string; isActive: boolean; buAy: number; ciro: number }[];
  hizmetler?: { id: number; ad: string; sureDk: number; fiyat: number; aktif: boolean; buAy: number; ciro: number }[];
  sonMusteriler?: { id: number; ad: string; soyad: string; telefon: string; createdAt: string }[];
}

const STATUSES: AppointmentStatus[] = ['BEKLIYOR', 'ONAYLANDI', 'TAMAMLANDI', 'GELMEDI', 'IPTAL'];

// Durum rozetleri: renk yanında metin de gösterilir.
const BADGE: Record<AppointmentStatus, string> = {
  BEKLIYOR: 'text-bg-warning',
  ONAYLANDI: 'text-bg-primary',
  TAMAMLANDI: 'text-bg-success',
  GELMEDI: 'text-bg-dark',
  IPTAL: 'text-bg-danger',
};

const BAR_STATUS: Record<AppointmentStatus, string> = {
  BEKLIYOR: 'bg-warning',
  ONAYLANDI: 'bg-primary',
  TAMAMLANDI: 'bg-success',
  GELMEDI: 'bg-dark',
  IPTAL: 'bg-danger',
};

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const lang = i18n.language;

  useEffect(() => {
    api<Dashboard>('/dashboard')
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : t('common.error')));
  }, [t]);

  const money = new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
  const count = (n: number) => String(n);
  const monthLabel = (ay: string) => {
    const [y, m] = ay.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(lang === 'en' ? 'en-GB' : 'tr-TR', { month: 'short' });
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div className="text-secondary">{t('common.loading')}</div>;

  const isAdmin = data.scope === 'ADMIN';
  const k = data.kpi;

  const tiles: { label: string; value: string; color: string; icon: string }[] = [
    { label: t('dashboard.today'), value: count(k.bugun), color: '#0d6efd', icon: 'bi-calendar-day' },
    { label: t('dashboard.pending'), value: count(k.bekleyen), color: '#ffc107', icon: 'bi-hourglass-split' },
    { label: t('dashboard.monthCompleted'), value: count(k.buAyTamamlanan), color: '#198754', icon: 'bi-check2-circle' },
    { label: t('dashboard.monthRevenue'), value: money.format(k.buAyCiro), color: '#20c997', icon: 'bi-cash-stack' },
  ];
  if (isAdmin) {
    tiles.push(
      { label: t('dashboard.customers'), value: count(k.musteri ?? 0), color: '#6f42c1', icon: 'bi-people' },
      { label: t('dashboard.stylists'), value: count(k.kuafor ?? 0), color: '#fd7e14', icon: 'bi-scissors' },
      { label: t('dashboard.services'), value: count(k.hizmet ?? 0), color: '#0dcaf0', icon: 'bi-list-check' },
    );
  }

  const statusMax = Math.max(1, ...data.statusMonth.map((s) => s.adet));
  const statusCount = (s: AppointmentStatus) => data.statusMonth.find((x) => x.status === s)?.adet ?? 0;

  return (
    <div className="vstack gap-4">
      <div>
        <h1 className="h3 page-title mb-1">{t('dashboard.title')}</h1>
        <p className="text-secondary mb-0 small">{formatDate(new Date().toISOString(), lang)}</p>
      </div>

      <div className="row g-3">
        {tiles.map((tile) => (
          <div key={tile.label} className={isAdmin ? 'col-6 col-xl' : 'col-6 col-lg-3'}>
            <div className="card kpi-card shadow-sm h-100" style={{ ['--kpi-color' as string]: tile.color }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="kpi-label">{tile.label}</div>
                    <div className="kpi-value mt-1">{tile.value}</div>
                  </div>
                  <i className={`bi ${tile.icon} fs-4 opacity-50`} style={{ color: tile.color }} aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h2 className="h6 fw-semibold mb-3">{t('dashboard.monthlyCount')}</h2>
              <BarChart
                ariaLabel={t('dashboard.monthlyCount')}
                data={data.monthly.map((m) => ({ label: monthLabel(m.ay), value: m.toplam }))}
                format={count}
                color="#0d6efd"
              />
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h2 className="h6 fw-semibold mb-3">{t('dashboard.monthlyRevenue')}</h2>
              <BarChart
                ariaLabel={t('dashboard.monthlyRevenue')}
                data={data.monthly.map((m) => ({ label: monthLabel(m.ay), value: m.ciro }))}
                format={(n) => money.format(n)}
                color="#198754"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h2 className="h6 fw-semibold mb-3">{t('dashboard.statusMonth')}</h2>
              <div className="vstack gap-3">
                {STATUSES.map((s) => {
                  const n = statusCount(s);
                  return (
                    <div key={s}>
                      <div className="d-flex justify-content-between small mb-1">
                        <span>{t(`status.${s}`)}</span>
                        <span className="fw-semibold">{n}</span>
                      </div>
                      <div className="progress progress-thin">
                        <div className={`progress-bar ${BAR_STATUS[s]}`} style={{ width: `${(n / statusMax) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h2 className="h6 fw-semibold mb-0">{t('dashboard.todayList')}</h2>
                <Link to="/randevular" className="btn btn-sm btn-outline-primary">{t('dashboard.viewAll')}</Link>
              </div>
              {data.bugunList.length === 0 ? (
                <p className="text-secondary small mb-0">{t('appointments.noneToday')}</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 small">
                    <tbody>
                      {data.bugunList.map((a) => (
                        <tr key={a.id}>
                          <td className="fw-semibold">{formatTime(a.baslangic)}</td>
                          <td>{a.musteriAd} {a.musteriSoyad}</td>
                          <td className="text-secondary">{a.hizmet}</td>
                          {isAdmin && <td className="text-secondary">{a.kuaforAd} {a.kuaforSoyad}</td>}
                          <td className="text-end">
                            <span className={`badge ${BADGE[a.status]}`}>{t(`status.${a.status}`)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAdmin && data.kuaforler && data.hizmetler && data.sonMusteriler && (
        <>
          <div className="row g-4">
            <div className="col-md-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 className="h6 fw-semibold mb-0">{t('dashboard.stylistsTable')}</h2>
                    <Link to="/kuaforler" className="btn btn-sm btn-outline-primary">{t('dashboard.viewAll')}</Link>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 small">
                      <thead>
                        <tr className="text-secondary">
                          <th>{t('stylists.name')}</th>
                          <th className="text-end">{t('dashboard.appointments')}</th>
                          <th className="text-end">{t('dashboard.monthRevenue')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.kuaforler.map((s) => (
                          <tr key={s.id}>
                            <td>
                              {s.ad} {s.soyad}{' '}
                              {!s.isActive && <span className="badge text-bg-secondary ms-1">{t('common.passive')}</span>}
                            </td>
                            <td className="text-end">{s.buAy}</td>
                            <td className="text-end">{money.format(s.ciro)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 className="h6 fw-semibold mb-0">{t('dashboard.servicesTable')}</h2>
                    <Link to="/hizmetler" className="btn btn-sm btn-outline-primary">{t('dashboard.viewAll')}</Link>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 small">
                      <thead>
                        <tr className="text-secondary">
                          <th>{t('services.name')}</th>
                          <th className="text-end">{t('dashboard.appointments')}</th>
                          <th className="text-end">{t('dashboard.monthRevenue')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.hizmetler.map((s) => (
                          <tr key={s.id}>
                            <td>
                              {s.ad}
                              <div className="text-secondary">{s.sureDk} dk · {money.format(Number(s.fiyat))}</div>
                            </td>
                            <td className="text-end">{s.buAy}</td>
                            <td className="text-end">{money.format(s.ciro)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h2 className="h6 fw-semibold mb-0">{t('dashboard.recentCustomers')}</h2>
                <Link to="/musteriler" className="btn btn-sm btn-outline-primary">{t('dashboard.viewAll')}</Link>
              </div>
              {data.sonMusteriler.length === 0 ? (
                <p className="text-secondary small mb-0">{t('dashboard.noData')}</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 small">
                    <tbody>
                      {data.sonMusteriler.map((c) => (
                        <tr key={c.id}>
                          <td className="fw-semibold">{c.ad} {c.soyad}</td>
                          <td>{c.telefon}</td>
                          <td className="text-end text-secondary">{t('dashboard.registeredAt')}: {formatDate(c.createdAt, lang)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
