import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useHavaleQuery, useSetHavaleMutation } from '../store/apiSlice';
import { errorText } from '../store/baseQuery';
import type { Havale } from '../types';

// Havale bilgisi: ödeme sayfasında işletme sahiplerine gösterilir.
export default function SettingsPage() {
  const { t } = useTranslation();
  const { data: havale, error: queryError, isSuccess } = useHavaleQuery();
  const [setHavale] = useSetHavaleMutation();
  const [form, setForm] = useState<Havale>({ banka: '', alici: '', iban: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Form, kayıtlı havale bilgisiyle doldurulur.
  useEffect(() => {
    if (havale) setForm(havale);
  }, [havale]);

  const loadError = queryError ? errorText(queryError, t('common.error')) : '';

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await setHavale(form).unwrap();
      setMessage(t('settings.saved'));
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  return (
    <div className="vstack gap-4" style={{ maxWidth: 680 }}>
      <h1 className="h3 page-title mb-0">{t('settings.title')}</h1>
      <p className="text-secondary mb-0">{t('settings.hint')}</p>
      {(error || loadError) && <div className="alert alert-danger mb-0">{error || loadError}</div>}
      {message && <div className="alert alert-success mb-0">{message}</div>}

      {isSuccess && (
        <form onSubmit={save} className="card shadow-sm border-0">
          <div className="card-body vstack gap-3">
            <div><label className="form-label" htmlFor="bank">{t('settings.bank')}</label><input id="bank" className="form-control" required value={form.banka} onChange={(e) => setForm({ ...form, banka: e.target.value })} /></div>
            <div><label className="form-label" htmlFor="recipient">{t('settings.recipient')}</label><input id="recipient" className="form-control" required value={form.alici} onChange={(e) => setForm({ ...form, alici: e.target.value })} /></div>
            <div><label className="form-label" htmlFor="iban">{t('settings.iban')}</label><input id="iban" className="form-control font-monospace" required value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="TR00 0000 0000 0000 0000 0000 00" /></div>
            <div><button type="submit" className="btn btn-primary">{t('common.save')}</button></div>
          </div>
        </form>
      )}
    </div>
  );
}
