import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('services.title')}</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={onAdd} className="card grid gap-3 sm:grid-cols-4">
        <input className="input" placeholder={t('services.name')} value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} required />
        <input className="input" type="number" min={5} max={480} placeholder={t('services.duration')} value={form.sureDk} onChange={(e) => setForm({ ...form, sureDk: Number(e.target.value) })} required />
        <input className="input" type="number" min={0} step="0.01" placeholder={t('services.price')} value={form.fiyat} onChange={(e) => setForm({ ...form, fiyat: Number(e.target.value) })} required />
        <button type="submit" className="btn-primary">{t('services.new')}</button>
      </form>

      <div className="card overflow-x-auto p-0">
        {services === null ? (
          <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>
        ) : services.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">{t('common.empty')}</p>
        ) : (
          <table className="min-w-full text-sm">
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{s.ad}</td>
                  <td className="px-3 py-2">{s.sureDk} dk</td>
                  <td className="px-3 py-2">{s.fiyat} ₺</td>
                  <td className="px-3 py-2">{t(s.aktif ? 'common.active' : 'common.passive')}</td>
                  <td className="space-x-2 whitespace-nowrap px-3 py-2">
                    <button
                      className="btn-ghost"
                      onClick={() => run(() => api(`/admin/services/${s.id}`, { method: 'PATCH', body: JSON.stringify({ aktif: !s.aktif }) }))}
                    >
                      {s.aktif ? t('common.passive') : t('common.active')}
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => window.confirm(t('common.confirmDelete')) && run(() => api(`/admin/services/${s.id}`, { method: 'DELETE' }))}
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
