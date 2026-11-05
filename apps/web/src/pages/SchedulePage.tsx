import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/client';
import { formatDate, formatTime } from '../lib/format';
import type { TimeOff, WorkingHour } from '../types';

// Her satır bir çalışma aralığıdır; gün başına birden fazla aralık olabilir.
interface Block {
  gun: number;
  baslangic: string;
  bitis: string;
  mola: boolean;
  molaBaslangic: string;
  molaBitis: string;
}

function newBlock(gun: number): Block {
  return { gun, baslangic: '09:00', bitis: '18:00', mola: false, molaBaslangic: '12:30', molaBitis: '13:30' };
}

export default function SchedulePage() {
  const { t, i18n } = useTranslation();
  const [blocks, setBlocks] = useState<Block[]>([]);
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
      setBlocks(
        wh.map((r) => ({
          gun: r.gun,
          baslangic: r.baslangic,
          bitis: r.bitis,
          mola: !!r.molaBaslangic,
          molaBaslangic: r.molaBaslangic ?? '12:30',
          molaBitis: r.molaBitis ?? '13:30',
        })),
      );
      setTimeOff(to);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleDay(gun: number, open: boolean) {
    setBlocks((prev) =>
      open ? [...prev, newBlock(gun)] : prev.filter((b) => b.gun !== gun),
    );
  }

  function updateBlock(index: number, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveHours(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    const payload = blocks.map((b) => ({
      gun: b.gun,
      baslangic: b.baslangic,
      bitis: b.bitis,
      ...(b.mola ? { molaBaslangic: b.molaBaslangic, molaBitis: b.molaBitis } : {}),
    }));
    try {
      await api('/stylists/me/working-hours', { method: 'PUT', body: JSON.stringify({ days: payload }) });
      setMessage(t('schedule.saved'));
      await load();
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

      <form onSubmit={saveHours} className="card space-y-4">
        {dayNames.map((name, gun) => {
          const dayBlocks = blocks.map((b, index) => ({ b, index })).filter(({ b }) => b.gun === gun);
          const open = dayBlocks.length > 0;
          return (
            <div key={gun} className="flex flex-col gap-2 border-b border-slate-100 pb-3 last:border-0 sm:flex-row sm:items-start">
              <label className="flex w-32 items-center gap-2 pt-2 text-sm font-medium">
                <input type="checkbox" checked={open} onChange={(e) => toggleDay(gun, e.target.checked)} />
                {name}
              </label>
              {!open ? (
                <span className="pt-2 text-sm text-slate-400">{t('schedule.off')}</span>
              ) : (
                <div className="flex-1 space-y-2">
                  {dayBlocks.map(({ b, index }) => (
                    <div key={index} className="flex flex-wrap items-center gap-2 text-sm">
                      <input type="time" className="input w-28" value={b.baslangic} onChange={(e) => updateBlock(index, { baslangic: e.target.value })} aria-label={t('schedule.start')} />
                      <span>–</span>
                      <input type="time" className="input w-28" value={b.bitis} onChange={(e) => updateBlock(index, { bitis: e.target.value })} aria-label={t('schedule.end')} />
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={b.mola} onChange={(e) => updateBlock(index, { mola: e.target.checked })} />
                        {t('schedule.breakStart')}
                      </label>
                      {b.mola && (
                        <>
                          <input type="time" className="input w-28" value={b.molaBaslangic} onChange={(e) => updateBlock(index, { molaBaslangic: e.target.value })} aria-label={t('schedule.breakStart')} />
                          <span>–</span>
                          <input type="time" className="input w-28" value={b.molaBitis} onChange={(e) => updateBlock(index, { molaBitis: e.target.value })} aria-label={t('schedule.breakEnd')} />
                        </>
                      )}
                      <button type="button" className="btn-ghost" onClick={() => removeBlock(index)}>{t('schedule.removeBlock')}</button>
                    </div>
                  ))}
                  <button type="button" className="btn-ghost" onClick={() => setBlocks((prev) => [...prev, newBlock(gun)])}>
                    {t('schedule.addBlock')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
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
