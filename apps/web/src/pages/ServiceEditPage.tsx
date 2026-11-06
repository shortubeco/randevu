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
        body: JSON.stringify({ ad: form.ad, sureDk: Number(form.sureDk), fiyat: Number(form.fiyat), aktif: form.aktif }),
      });
      setMessage(t('services.saved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="vstack gap-4" style={{ maxWidth: 720 }}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h1 className="h3 page-title mb-0">{t('services.editTitle')}</h1>
        <Link to="/hizmetler" className="btn btn-outline-secondary">{t('services.back')}</Link>
      </div>

      {!form && !error && <p className="text-secondary">{t('common.loading')}</p>}
      {error && <div className="alert alert-danger mb-0">{error}</div>}

      {form && (
        <form onSubmit={onSubmit} className="card shadow-sm border-0">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label small" htmlFor="ad">{t('services.name')}</label>
                <input id="ad" className="form-control" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} required />
              </div>
              <div className="col-md-6">
                <label className="form-label small" htmlFor="sure">{t('services.duration')}</label>
                <input id="sure" type="number" min={5} max={480} className="form-control" value={form.sureDk} onChange={(e) => setForm({ ...form, sureDk: Number(e.target.value) })} required />
              </div>
              <div className="col-md-6">
                <label className="form-label small" htmlFor="fiyat">{t('services.price')}</label>
                <input id="fiyat" type="number" min={0} step="0.01" className="form-control" value={form.fiyat} onChange={(e) => setForm({ ...form, fiyat: Number(e.target.value) })} required />
              </div>
              <div className="col-12">
                <div className="form-check form-switch">
                  <input id="aktif" className="form-check-input" type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
                  <label className="form-check-label" htmlFor="aktif">{t('common.active')}</label>
                </div>
              </div>
              <div className="col-12 d-flex align-items-center gap-3">
                <button type="submit" className="btn btn-primary" disabled={saving}>{t('common.save')}</button>
                {message && <span className="text-success small">{message}</span>}
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
