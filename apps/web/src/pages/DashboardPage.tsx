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

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">{t('common.loading')}</p>;

  const isAdmin = data.scope === 'ADMIN';
  const k = data.kpi;

  const tiles: { label: string; value: string }[] = [
    { label: t('dashboard.today'), value: count(k.bugun) },
    { label: t('dashboard.pending'), value: count(k.bekleyen) },
    { label: t('dashboard.monthCompleted'), value: count(k.buAyTamamlanan) },
    { label: t('dashboard.monthRevenue'), value: money.format(k.buAyCiro) },
  ];
  if (isAdmin) {
    tiles.push(
      { label: t('dashboard.customers'), value: count(k.musteri ?? 0) },
      { label: t('dashboard.stylists'), value: count(k.kuafor ?? 0) },
      { label: t('dashboard.services'), value: count(k.hizmet ?? 0) },
    );
  }

  const statusMax = Math.max(1, ...data.statusMonth.map((s) => s.adet));
  const statusCount = (s: AppointmentStatus) => data.statusMonth.find((x) => x.status === s)?.adet ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">{t('dashboard.title')}</h1>

      <div className={`grid gap-3 ${isAdmin ? 'grid-cols-2 lg:grid-cols-4 xl:grid-cols-7' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {tiles.map((tile) => (
          <div key={tile.label} className="card">
            <div className="text-xs text-slate-500">{tile.label}</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{tile.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-semibold text-slate-900">{t('dashboard.monthlyCount')}</h2>
          <BarChart
            ariaLabel={t('dashboard.monthlyCount')}
            data={data.monthly.map((m) => ({ label: monthLabel(m.ay), value: m.toplam }))}
            format={count}
          />
        </section>
        <section className="card space-y-3">
          <h2 className="font-semibold text-slate-900">{t('dashboard.monthlyRevenue')}</h2>
          <BarChart
            ariaLabel={t('dashboard.monthlyRevenue')}
            data={data.monthly.map((m) => ({ label: monthLabel(m.ay), value: m.ciro }))}
            format={(n) => money.format(n)}
          />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card space-y-3">
          <h2 className="font-semibold text-slate-900">{t('dashboard.statusMonth')}</h2>
          <ul className="space-y-2">
            {STATUSES.map((s) => {
              const n = statusCount(s);
              return (
                <li key={s} className="text-sm">
                  <div className="flex justify-between">
                    <span>{t(`status.${s}`)}</span>
                    <span className="font-medium">{n}</span>
                  </div>
                  <div className="mt-1 h-2 rounded bg-slate-100">
                    <div className="h-2 rounded bg-slate-700" style={{ width: `${(n / statusMax) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">{t('dashboard.todayList')}</h2>
            <Link to="/randevular" className="text-sm text-slate-600 underline">{t('dashboard.viewAll')}</Link>
          </div>
          {data.bugunList.length === 0 ? (
            <p className="text-sm text-slate-500">{t('appointments.noneToday')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.bugunList.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="font-medium">{formatTime(a.baslangic)}</span>
                  <span className="flex-1">{a.musteriAd} {a.musteriSoyad} · {a.hizmet}</span>
                  {isAdmin && <span className="text-slate-500">{a.kuaforAd} {a.kuaforSoyad}</span>}
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{t(`status.${a.status}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {isAdmin && data.kuaforler && data.hizmetler && data.sonMusteriler && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card space-y-3 overflow-x-auto p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{t('dashboard.stylistsTable')}</h2>
                <Link to="/kuaforler" className="text-sm text-slate-600 underline">{t('dashboard.viewAll')}</Link>
              </div>
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-1">{t('stylists.name')}</th>
                    <th className="py-1 text-right">{t('dashboard.appointments')}</th>
                    <th className="py-1 text-right">{t('dashboard.monthRevenue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.kuaforler.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="py-1.5">
                        {s.ad} {s.soyad} {!s.isActive && <span className="text-xs text-slate-400">({t('common.passive')})</span>}
                      </td>
                      <td className="py-1.5 text-right">{s.buAy}</td>
                      <td className="py-1.5 text-right">{money.format(s.ciro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card space-y-3 overflow-x-auto p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{t('dashboard.servicesTable')}</h2>
                <Link to="/hizmetler" className="text-sm text-slate-600 underline">{t('dashboard.viewAll')}</Link>
              </div>
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-1">{t('services.name')}</th>
                    <th className="py-1 text-right">{t('dashboard.appointments')}</th>
                    <th className="py-1 text-right">{t('dashboard.monthRevenue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hizmetler.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="py-1.5">
                        {s.ad} <span className="text-xs text-slate-400">· {s.sureDk} dk · {money.format(Number(s.fiyat))}</span>
                      </td>
                      <td className="py-1.5 text-right">{s.buAy}</td>
                      <td className="py-1.5 text-right">{money.format(s.ciro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <section className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">{t('dashboard.recentCustomers')}</h2>
              <Link to="/musteriler" className="text-sm text-slate-600 underline">{t('dashboard.viewAll')}</Link>
            </div>
            {data.sonMusteriler.length === 0 ? (
              <p className="text-sm text-slate-500">{t('dashboard.noData')}</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {data.sonMusteriler.map((c) => (
                  <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="font-medium">{c.ad} {c.soyad}</span>
                    <span className="text-slate-500">{c.telefon}</span>
                    <span className="text-slate-500">{t('dashboard.registeredAt')}: {formatDate(c.createdAt, lang)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
