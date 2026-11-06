import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlansQuery, useUpdatePlanMutation } from '../store/apiSlice';
import { errorText } from '../store/baseQuery';

// Plan fiyatları admin tarafından belirlenir. Limitler sabittir ve burada değiştirilmez.
export default function PlansPage() {
  const { t } = useTranslation();
  const { data: plans, error: queryError } = usePlansQuery();
  const [updatePlan] = useUpdatePlanMutation();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Fiyat alanları sunucu verisiyle doldurulur (yeni veri geldiğinde).
  useEffect(() => {
    if (plans) setPrices(Object.fromEntries(plans.map((p) => [p.kod, p.aylikUcret === null ? '' : String(p.aylikUcret)])));
  }, [plans]);

  const loadError = queryError ? errorText(queryError, t('common.error')) : '';

  async function save(kod: 'UCRETSIZ' | 'SILVER' | 'GOLD') {
    setError('');
    setMessage('');
    try {
      await updatePlan({ kod, aylikUcret: Number(prices[kod]) }).unwrap();
      setMessage(t('plans.saved'));
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  return (
    <div className="vstack gap-4" style={{ maxWidth: 800 }}>
      <h1 className="h3 page-title mb-0">{t('plans.title')}</h1>
      {(error || loadError) && <div className="alert alert-danger mb-0">{error || loadError}</div>}
      {message && <div className="alert alert-success mb-0">{message}</div>}

      {!plans ? (
        <p className="text-secondary">{t('common.loading')}</p>
      ) : (
        plans.map((p) => (
          <div key={p.kod} className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                <div>
                  <h2 className="h5 fw-semibold mb-1">{p.ad}</h2>
                  <div className="small text-secondary">
                    {t('landing.shops')}: {p.maxDukkan ?? t('landing.unlimited')} · {t('landing.stylists')}: {p.maxKuaforDukkan ?? t('landing.unlimited')} · {t('landing.services')}: {p.maxHizmetKuafor ?? t('landing.unlimited')}
                  </div>
                </div>
                <div className="d-flex gap-2 align-items-end">
                  <div>
                    <label className="form-label small" htmlFor={`price-${p.kod}`}>{t('plans.monthlyPrice')} (₺)</label>
                    <input id={`price-${p.kod}`} type="number" min={0} step="0.01" className="form-control" value={prices[p.kod] ?? ''} onChange={(e) => setPrices({ ...prices, [p.kod]: e.target.value })} />
                  </div>
                  <button className="btn btn-primary" onClick={() => save(p.kod)} disabled={prices[p.kod] === ''}>{t('common.save')}</button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
