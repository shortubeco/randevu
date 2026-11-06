import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAddTimeOffMutation,
  useDeleteTimeOffMutation,
  useSetWorkingHoursMutation,
  useTimeOffQuery,
  useWorkingHoursQuery,
} from '../store/apiSlice';
import { errorText } from '../store/baseQuery';
import { formatDate, formatTime } from '../lib/format';

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

interface Props {
  // Kuaförün kendi sayfası: /stylists/me. İşletme sahibi: /business/stylists/:id.
  basePath: string;
}

export default function SchedulePage({ basePath }: Props) {
  const { t, i18n } = useTranslation();
  const hoursQ = useWorkingHoursQuery(basePath);
  const timeOffQ = useTimeOffQuery(basePath);
  const [setHours] = useSetWorkingHoursMutation();
  const [addTimeOff] = useAddTimeOffMutation();
  const [deleteTimeOff] = useDeleteTimeOffMutation();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [off, setOff] = useState({ baslangic: '', bitis: '', sebep: '' });

  // Çalışma saatleri sunucudan (ya da önbellekten) geldiğinde form doldurulur.
  useEffect(() => {
    if (!hoursQ.data) return;
    setBlocks(
      hoursQ.data.map((r) => ({
        gun: r.gun,
        baslangic: r.baslangic,
        bitis: r.bitis,
        mola: !!r.molaBaslangic,
        molaBaslangic: r.molaBaslangic ?? '12:30',
        molaBitis: r.molaBitis ?? '13:30',
      })),
    );
  }, [hoursQ.data]);

  const loadError = hoursQ.error || timeOffQ.error ? errorText(hoursQ.error ?? timeOffQ.error, t('common.error')) : '';
  const timeOff = timeOffQ.data ?? null;

  function toggleDay(gun: number, open: boolean) {
    setBlocks((prev) => (open ? [...prev, newBlock(gun)] : prev.filter((b) => b.gun !== gun)));
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
      await setHours({ base: basePath, days: payload }).unwrap();
      setMessage(t('schedule.saved'));
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  async function onAddTimeOff(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      // datetime-local değeri Istanbul saatidir; sunucuya offset ile gönderilir.
      await addTimeOff({
        base: basePath,
        body: {
          baslangic: `${off.baslangic}:00+03:00`,
          bitis: `${off.bitis}:00+03:00`,
          ...(off.sebep ? { sebep: off.sebep } : {}),
        },
      }).unwrap();
      setOff({ baslangic: '', bitis: '', sebep: '' });
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  async function removeTimeOff(id: number) {
    if (!window.confirm(t('common.confirmDelete'))) return;
    setError('');
    try {
      await deleteTimeOff({ base: basePath, tid: id }).unwrap();
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  const dayNames = t('days', { returnObjects: true }) as string[];

  return (
    <div className="vstack gap-4" style={{ maxWidth: 960 }}>
      <h1 className="h3 page-title mb-0">{t('schedule.title')}</h1>
      {(error || loadError) && <div className="alert alert-danger mb-0">{error || loadError}</div>}
      {message && <div className="alert alert-success mb-0">{message}</div>}

      <form onSubmit={saveHours} className="card shadow-sm border-0">
        <div className="card-body vstack gap-3">
          {dayNames.map((name, gun) => {
            const dayBlocks = blocks.map((b, index) => ({ b, index })).filter(({ b }) => b.gun === gun);
            const open = dayBlocks.length > 0;
            return (
              <div key={gun} className="row align-items-start g-2 pb-3 border-bottom">
                <div className="col-md-2">
                  <div className="form-check form-switch pt-1">
                    <input id={`day-${gun}`} className="form-check-input" type="checkbox" checked={open} onChange={(e) => toggleDay(gun, e.target.checked)} />
                    <label className="form-check-label fw-semibold" htmlFor={`day-${gun}`}>{name}</label>
                  </div>
                </div>
                <div className="col-md-10">
                  {!open ? (
                    <span className="badge text-bg-light border text-secondary">{t('schedule.off')}</span>
                  ) : (
                    <div className="vstack gap-2">
                      {dayBlocks.map(({ b, index }) => (
                        <div key={index} className="d-flex flex-wrap align-items-center gap-2">
                          <input type="time" className="form-control form-control-sm" style={{ width: 120 }} value={b.baslangic} onChange={(e) => updateBlock(index, { baslangic: e.target.value })} aria-label={t('schedule.start')} />
                          <span className="text-secondary">–</span>
                          <input type="time" className="form-control form-control-sm" style={{ width: 120 }} value={b.bitis} onChange={(e) => updateBlock(index, { bitis: e.target.value })} aria-label={t('schedule.end')} />
                          <div className="form-check form-switch ms-2">
                            <input id={`mola-${index}`} className="form-check-input" type="checkbox" checked={b.mola} onChange={(e) => updateBlock(index, { mola: e.target.checked })} />
                            <label className="form-check-label small" htmlFor={`mola-${index}`}>{t('schedule.breakStart')}</label>
                          </div>
                          {b.mola && (
                            <>
                              <input type="time" className="form-control form-control-sm" style={{ width: 120 }} value={b.molaBaslangic} onChange={(e) => updateBlock(index, { molaBaslangic: e.target.value })} aria-label={t('schedule.breakStart')} />
                              <span className="text-secondary">–</span>
                              <input type="time" className="form-control form-control-sm" style={{ width: 120 }} value={b.molaBitis} onChange={(e) => updateBlock(index, { molaBitis: e.target.value })} aria-label={t('schedule.breakEnd')} />
                            </>
                          )}
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeBlock(index)}>
                            {t('schedule.removeBlock')}
                          </button>
                        </div>
                      ))}
                      <div>
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setBlocks((prev) => [...prev, newBlock(gun)])}>
                          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
                          {t('schedule.addBlock')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div>
            <button type="submit" className="btn btn-primary">{t('schedule.saveHours')}</button>
          </div>
        </div>
      </form>

      <section className="vstack gap-3">
        <h2 className="h5 fw-semibold mb-0">{t('schedule.timeOff')}</h2>
        <form onSubmit={onAddTimeOff} className="card shadow-sm border-0">
          <div className="card-body">
            <div className="row g-2 align-items-end">
              <div className="col-md-3">
                <label className="form-label small" htmlFor="off-start">{t('common.from')}</label>
                <input id="off-start" type="datetime-local" className="form-control" value={off.baslangic} onChange={(e) => setOff({ ...off, baslangic: e.target.value })} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small" htmlFor="off-end">{t('common.to')}</label>
                <input id="off-end" type="datetime-local" className="form-control" value={off.bitis} onChange={(e) => setOff({ ...off, bitis: e.target.value })} required />
              </div>
              <div className="col-md-3">
                <label className="form-label small" htmlFor="off-reason">{t('schedule.reason')}</label>
                <input id="off-reason" className="form-control" value={off.sebep} onChange={(e) => setOff({ ...off, sebep: e.target.value })} />
              </div>
              <div className="col-md-3">
                <button type="submit" className="btn btn-primary w-100">{t('schedule.addTimeOff')}</button>
              </div>
            </div>
          </div>
        </form>

        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            {timeOff === null ? (
              <p className="p-4 text-secondary mb-0">{t('common.loading')}</p>
            ) : timeOff.length === 0 ? (
              <p className="p-4 text-secondary mb-0">{t('common.empty')}</p>
            ) : (
              <ul className="list-group list-group-flush">
                {timeOff.map((x) => (
                  <li key={x.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      {formatDate(x.baslangic, i18n.language)} {formatTime(x.baslangic)} – {formatDate(x.bitis, i18n.language)} {formatTime(x.bitis)}
                      {x.sebep && <span className="text-secondary"> · {x.sebep}</span>}
                    </span>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => removeTimeOff(x.id)}>{t('common.delete')}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
