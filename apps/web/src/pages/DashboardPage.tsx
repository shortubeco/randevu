import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import BarChart from '../components/BarChart';
import { useDashboardQuery } from '../store/apiSlice';
import { errorText } from '../store/baseQuery';
import { formatDate, formatTime } from '../lib/format';

const money = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data, error: queryError } = useDashboardQuery();
  const error = queryError ? errorText(queryError, t('common.error')) : '';

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <p className="text-secondary">{t('common.loading')}</p>;

  const k = data.kpi;
  const isOwner = data.scope === 'ISLETME_SAHIBI';
  const kpis = [
    { label: t('dashboard.today'), value: k.bugun, color: '#0d6efd', icon: 'bi-calendar-day' },
    { label: t('dashboard.pending'), value: k.bekleyen, color: '#ffc107', icon: 'bi-hourglass-split' },
    { label: t('dashboard.monthCompleted'), value: k.buAyTamamlanan, color: '#198754', icon: 'bi-check2-circle' },
    { label: t('dashboard.monthRevenue'), value: money(k.buAyCiro), color: '#6f42c1', icon: 'bi-cash-stack' },
  ];

  return (
    <div className="vstack gap-4">
      <div>
        <h1 className="h3 page-title mb-1">{t('dashboard.title')}</h1>
        <p className="text-secondary mb-0 small">{user?.ad} {user?.soyad}</p>
      </div>

      <div className="row g-3">
        {kpis.map((c) => (
          <div key={c.label} className="col-6 col-xl-3">
            <div className="card kpi-card shadow-sm h-100" style={{ ['--kpi-color' as string]: c.color }}>
              <div className="card-body">
                <div className="kpi-label mb-1"><i className={`bi ${c.icon} me-1`} aria-hidden="true" />{c.label}</div>
                <div className="kpi-value">{c.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h2 className="h6 fw-semibold mb-3">{t('dashboard.monthlyCount')}</h2>
              <BarChart
                ariaLabel={t('dashboard.monthlyCount')}
                data={data.monthly.map((m) => ({ label: m.ay.slice(5), value: m.toplam }))}
                format={(n) => String(n)}
              />
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h2 className="h6 fw-semibold mb-3">{t('dashboard.monthlyRevenue')}</h2>
              <BarChart
                ariaLabel={t('dashboard.monthlyRevenue')}
                data={data.monthly.map((m) => ({ label: m.ay.slice(5), value: m.ciro }))}
                format={(n) => Math.round(n).toLocaleString('tr-TR')}
                color="#6f42c1"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h2 className="h6 fw-semibold mb-3">{t('dashboard.statusMonth')}</h2>
              {data.statusMonth.length === 0 ? (
                <p className="text-secondary mb-0">{t('common.empty')}</p>
              ) : (
                <ul className="list-unstyled vstack gap-2 mb-0">
                  {data.statusMonth.map((s) => (
                    <li key={s.status} className="d-flex justify-content-between">
                      <span>{t(`status.${s.status}`)}</span>
                      <span className="fw-semibold">{s.adet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h2 className="h6 fw-semibold mb-3">{t('dashboard.todayList')}</h2>
              {data.bugunList.length === 0 ? (
                <p className="text-secondary mb-0">{t('appointments.noneToday')}</p>
              ) : (
                <ul className="list-unstyled vstack gap-2 mb-0">
                  {data.bugunList.map((a) => (
                    <li key={a.id} className="d-flex justify-content-between align-items-center border-bottom pb-2">
                      <span>
                        <span className="fw-semibold">{formatTime(a.baslangic)}</span> {a.musteriAd} {a.musteriSoyad}
                        <span className="text-secondary small"> · {a.hizmet}{isOwner && ` · ${a.kuaforAd}`}</span>
                      </span>
                      <span className={`badge ${a.status === 'BEKLIYOR' ? 'text-bg-warning' : a.status === 'ONAYLANDI' ? 'text-bg-primary' : 'text-bg-secondary'}`}>
                        {t(`status.${a.status}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="small text-secondary mt-2">{formatDate(new Date().toISOString(), i18n.language)}</div>
            </div>
          </div>
        </div>
      </div>

      {isOwner && data.kuaforler && (
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <h2 className="h6 fw-semibold mb-3">{t('dashboard.stylistsTable')}</h2>
            <div className="d-md-none vstack gap-2">
              {data.kuaforler.map((s) => (
                <div key={s.id} className="border rounded p-2">
                  <div className="fw-semibold">{s.ad} {s.soyad}</div>
                  <div className="small text-secondary">{s.buAy} {t('dashboard.appointments')} · {money(s.ciro)}</div>
                </div>
              ))}
            </div>
            <div className="d-none d-md-block">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr><th>{t('stylists.name')}</th><th>{t('dashboard.appointments')}</th><th>{t('dashboard.revenue')}</th><th>{t('common.status')}</th></tr>
                </thead>
                <tbody>
                  {data.kuaforler.map((s) => (
                    <tr key={s.id}>
                      <td>{s.ad} {s.soyad}</td>
                      <td>{s.buAy}</td>
                      <td>{money(s.ciro)}</td>
                      <td><span className={`badge ${s.aktif ? 'text-bg-success' : 'text-bg-secondary'}`}>{s.aktif ? t('common.active') : t('common.passive')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
