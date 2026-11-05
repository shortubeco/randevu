import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Service } from '../types';

export default function ServiceEditPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [form, setForm] = useState<{ ad: string; sureDk: number; fiyat: number; aktif: boolean } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Service>(`/admin/services/${id}`)
      .then((s) => setForm({ ad: s.ad, sureDk: s.sureDk, fiyat: Number(s.fiyat), aktif: s.aktif }))
      .catch((err) => setError(err instanceof ApiError ? err.message : t('services.notFound')));
  }, [id, t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await api(`/admin/services/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ad: form.ad,
          sureDk: Number(form.sureDk),
          fiyat: Number(form.fiyat),
          aktif: form.aktif,
        }),
      });
      setMessage(t('services.saved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{t('services.editTitle')}</h1>
        <Link to="/hizmetler" className="btn-ghost">{t('services.back')}</Link>
      </div>

      {!form && !error && <p className="text-sm text-slate-500">{t('common.loading')}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {form && (
        <form onSubmit={onSubmit} className="card grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ad">{t('services.name')}</label>
            <input id="ad" className="input" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="sure">{t('services.duration')}</label>
            <input id="sure" type="number" min={5} max={480} className="input" value={form.sureDk} onChange={(e) => setForm({ ...form, sureDk: Number(e.target.value) })} required />
          </div>
          <div>
            <label className="label" htmlFor="fiyat">{t('services.price')}</label>
            <input id="fiyat" type="number" min={0} step="0.01" className="input" value={form.fiyat} onChange={(e) => setForm({ ...form, fiyat: Number(e.target.value) })} required />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
              {t('common.active')}
            </label>
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>{t('common.save')}</button>
            {message && <span className="text-sm text-green-700">{message}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
