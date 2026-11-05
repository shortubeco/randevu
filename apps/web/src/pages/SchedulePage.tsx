import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/client';
import { formatDate, formatTime } from '../lib/format';
import type { TimeOff, WorkingHour } from '../types';

interface DayForm {
  open: boolean;
  baslangic: string;
  bitis: string;
  mola: boolean;
  molaBaslangic: string;
  molaBitis: string;
}

const DEFAULT_DAY: DayForm = {
  open: false,
  baslangic: '09:00',
  bitis: '18:00',
  mola: false,
  molaBaslangic: '12:30',
  molaBitis: '13:30',
};

export default function SchedulePage() {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState<DayForm[]>(() => Array.from({ length: 7 }, () => ({ ...DEFAULT_DAY })));
  const [timeOff, setTimeOff] = useState<TimeOff[] | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [off, setOff] = useState({ baslangic: '', bitis: '', sebep: '' });

  async function load() {
    setError('');
    try {
      const [wh, to] = await Promise.all([
        api<WorkingHour[]>('/stylists/me/working-hours'),
        api<TimeOff[]>('/stylists/me/time-off'),
      ]);
      // Arayüz gün başına tek aralık gösterir; ilk kayıt alınır.
      const next = Array.from({ length: 7 }, () => ({ ...DEFAULT_DAY }));
      for (const r of wh) {
        if (next[r.gun].open) continue;
        next[r.gun] = {
          open: true,
          baslangic: r.baslangic,
          bitis: r.bitis,
          mola: !!r.molaBaslangic,
          molaBaslangic: r.molaBaslangic ?? DEFAULT_DAY.molaBaslangic,
          molaBitis: r.molaBitis ?? DEFAULT_DAY.molaBitis,
        };
      }
      setDays(next);
      setTimeOff(to);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateDay(i: number, patch: Partial<DayForm>) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  async function saveHours(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    const payload = days
      .map((d, gun) =>
        d.open
          ? {
              gun,
              baslangic: d.baslangic,
              bitis: d.bitis,
              ...(d.mola ? { molaBaslangic: d.molaBaslangic, molaBitis: d.molaBitis } : {}),
            }
          : null,
      )
      .filter(Boolean);
    try {
      await api('/stylists/me/working-hours', { method: 'PUT', body: JSON.stringify({ days: payload }) });
      setMessage(t('schedule.saved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  async function addTimeOff(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      // datetime-local değeri Istanbul saatidir; sunucuya offset ile gönderilir.
      await api('/stylists/me/time-off', {
        method: 'POST',
        body: JSON.stringify({
          baslangic: `${off.baslangic}:00+03:00`,
          bitis: `${off.bitis}:00+03:00`,
          ...(off.sebep ? { sebep: off.sebep } : {}),
        }),
      });
      setOff({ baslangic: '', bitis: '', sebep: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  async function removeTimeOff(id: number) {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await api(`/stylists/me/time-off/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  const dayNames = t('days', { returnObjects: true }) as string[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">{t('schedule.title')}</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      <form onSubmit={saveHours} className="card space-y-3">
        {days.map((d, i) => (
          <div key={i} className="grid items-center gap-2 border-b border-slate-100 pb-3 last:border-0 sm:grid-cols-[120px_80px_1fr]">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={d.open} onChange={(e) => updateDay(i, { open: e.target.checked })} />
              {dayNames[i]}
            </label>
            {!d.open ? (
              <span className="text-sm text-slate-400">{t('schedule.off')}</span>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input type="time" className="input w-28" value={d.baslangic} onChange={(e) => updateDay(i, { baslangic: e.target.value })} />
                <span>–</span>
                <input type="time" className="input w-28" value={d.bitis} onChange={(e) => updateDay(i, { bitis: e.target.value })} />
                <label className="ml-3 flex items-center gap-1">
                  <input type="checkbox" checked={d.mola} onChange={(e) => updateDay(i, { mola: e.target.checked })} />
                  {t('schedule.breakStart')}
                </label>
                {d.mola && (
                  <>
                    <input type="time" className="input w-28" value={d.molaBaslangic} onChange={(e) => updateDay(i, { molaBaslangic: e.target.value })} />
                    <span>–</span>
                    <input type="time" className="input w-28" value={d.molaBitis} onChange={(e) => updateDay(i, { molaBitis: e.target.value })} />
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        <button type="submit" className="btn-primary">{t('schedule.saveHours')}</button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">{t('schedule.timeOff')}</h2>
        <form onSubmit={addTimeOff} className="card grid gap-3 sm:grid-cols-4">
          <input type="datetime-local" className="input" value={off.baslangic} onChange={(e) => setOff({ ...off, baslangic: e.target.value })} required aria-label={t('common.from')} />
          <input type="datetime-local" className="input" value={off.bitis} onChange={(e) => setOff({ ...off, bitis: e.target.value })} required aria-label={t('common.to')} />
          <input className="input" placeholder={t('schedule.reason')} value={off.sebep} onChange={(e) => setOff({ ...off, sebep: e.target.value })} />
          <button type="submit" className="btn-primary">{t('schedule.addTimeOff')}</button>
        </form>

        <div className="card p-0">
          {timeOff === null ? (
            <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>
          ) : timeOff.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">{t('common.empty')}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {timeOff.map((x) => (
                <li key={x.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>
                    {formatDate(x.baslangic, i18n.language)} {formatTime(x.baslangic)} – {formatDate(x.bitis, i18n.language)} {formatTime(x.bitis)}
                    {x.sebep && <span className="text-slate-500"> · {x.sebep}</span>}
                  </span>
                  <button className="btn-danger" onClick={() => removeTimeOff(x.id)}>{t('common.delete')}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
