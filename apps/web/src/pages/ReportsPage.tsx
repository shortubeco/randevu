import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/client';
import { dayEndIso, dayStartIso, todayIstanbul } from '../lib/format';

interface ReportData {
  byStatus: { status: string; adet: number }[];
  byStylist: { stylistId: number; ad: string; soyad: string; toplam: number; tamamlanan: number; ciro: number }[];
  totalRevenue: number;
}

function monthStart(): string {
  return `${todayIstanbul().slice(0, 8)}01`;
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayIstanbul());
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState('');

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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('reports.title')}</h1>

      <form onSubmit={onSubmit} className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="from">{t('common.from')}</label>
          <input id="from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="to">{t('common.to')}</label>
          <input id="to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary">{t('reports.run')}</button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-3">
            <h2 className="font-semibold">{t('reports.byStatus')}</h2>
            {data.byStatus.length === 0 ? (
              <p className="text-sm text-slate-500">{t('common.empty')}</p>
            ) : (
              <table className="min-w-full text-sm">
                <tbody>
                  {data.byStatus.map((r) => (
                    <tr key={r.status} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{t(`status.${r.status}`)}</td>
                      <td className="px-2 py-1.5 text-right font-medium">{r.adet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">{t('reports.totalRevenue')}: {data.totalRevenue.toFixed(2)} ₺</h2>
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-600">
                <tr>
                  <th className="px-2 py-1.5">{t('reports.stylist')}</th>
                  <th className="px-2 py-1.5 text-right">{t('reports.total')}</th>
                  <th className="px-2 py-1.5 text-right">{t('reports.completed')}</th>
                  <th className="px-2 py-1.5 text-right">{t('reports.revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {data.byStylist.map((r) => (
                  <tr key={r.stylistId} className="border-t border-slate-100">
                    <td className="px-2 py-1.5">{r.ad} {r.soyad}</td>
                    <td className="px-2 py-1.5 text-right">{r.toplam}</td>
                    <td className="px-2 py-1.5 text-right">{r.tamamlanan}</td>
                    <td className="px-2 py-1.5 text-right">{Number(r.ciro).toFixed(2)} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
