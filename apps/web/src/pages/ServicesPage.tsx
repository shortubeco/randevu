import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Service } from '../types';

export default function ServicesPage() {
  const { t } = useTranslation();
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ ad: '', sureDk: 30, fiyat: 0 });

  async function load() {
    try {
      setServices(await api<Service[]>('/admin/services'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      await api('/admin/services', {
        method: 'POST',
        body: JSON.stringify({ ad: form.ad, sureDk: Number(form.sureDk), fiyat: Number(form.fiyat) }),
      });
      setForm({ ad: '', sureDk: 30, fiyat: 0 });
    });
  }

  return (
    <div className="vstack gap-4">
      <h1 className="h3 page-title mb-0">{t('services.title')}</h1>
      {error && <div className="alert alert-danger mb-0">{error}</div>}

      <form onSubmit={onAdd} className="card shadow-sm border-0">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-5">
              <label className="form-label small" htmlFor="sad">{t('services.name')}</label>
              <input id="sad" className="form-control" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} required />
            </div>
            <div className="col-md-2">
              <label className="form-label small" htmlFor="ssure">{t('services.duration')}</label>
              <input id="ssure" type="number" min={5} max={480} className="form-control" value={form.sureDk} onChange={(e) => setForm({ ...form, sureDk: Number(e.target.value) })} required />
            </div>
            <div className="col-md-3">
              <label className="form-label small" htmlFor="sfiyat">{t('services.price')}</label>
              <input id="sfiyat" type="number" min={0} step="0.01" className="form-control" value={form.fiyat} onChange={(e) => setForm({ ...form, fiyat: Number(e.target.value) })} required />
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-primary w-100">
                <i className="bi bi-plus-lg me-1" aria-hidden="true" />
                {t('services.new')}
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {services === null ? (
            <p className="p-4 text-secondary mb-0">{t('common.loading')}</p>
          ) : services.length === 0 ? (
            <p className="p-4 text-secondary mb-0">{t('common.empty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('services.name')}</th>
                    <th>{t('services.duration')}</th>
                    <th>{t('services.price')}</th>
                    <th>{t('common.active')}</th>
                    <th className="text-end">{t('appointments.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td className="fw-semibold">{s.ad}</td>
                      <td>{s.sureDk} dk</td>
                      <td>{Number(s.fiyat).toFixed(2)} ₺</td>
                      <td>
                        <span className={`badge ${s.aktif ? 'text-bg-success' : 'text-bg-secondary'}`}>
                          {t(s.aktif ? 'common.active' : 'common.passive')}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end flex-wrap gap-1">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => run(() => api(`/admin/services/${s.id}`, { method: 'PATCH', body: JSON.stringify({ aktif: !s.aktif }) }))}
                          >
                            {s.aktif ? t('common.passive') : t('common.active')}
                          </button>
                          <Link className="btn btn-sm btn-outline-dark" to={`/hizmetler/${s.id}`}>{t('services.edit')}</Link>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => window.confirm(t('common.confirmDelete')) && run(() => api(`/admin/services/${s.id}`, { method: 'DELETE' }))}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
