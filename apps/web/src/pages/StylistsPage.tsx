import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { AdminStylist, Service } from '../types';

export default function StylistsPage() {
  const { t } = useTranslation();
  const [stylists, setStylists] = useState<AdminStylist[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  async function load() {
    setError('');
    try {
      const [s, sv] = await Promise.all([
        api<AdminStylist[]>('/admin/stylists'),
        api<Service[]>('/admin/services'),
      ]);
      setStylists(s);
      setServices(sv.filter((x) => x.aktif));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(s: AdminStylist) {
    await run(() =>
      api(`/admin/stylists/${s.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !s.isActive }) }),
    );
  }

  async function remove(id: number) {
    if (!window.confirm(t('common.confirmDelete'))) return;
    await run(() => api(`/admin/stylists/${id}`, { method: 'DELETE' }));
  }

  async function openServices(id: number) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    const current = await api<{ id: number }[]>(`/stylists/${id}/services`);
    setSelected(current.map((x) => x.id));
    setOpenId(id);
  }

  async function saveServices(id: number) {
    await run(() =>
      api(`/admin/stylists/${id}/services`, { method: 'PUT', body: JSON.stringify({ serviceIds: selected }) }),
    );
    setOpenId(null);
  }

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{t('stylists.title')}</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>{t('stylists.new')}</button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showForm && (
        <NewStylistForm
          onDone={() => {
            setShowForm(false);
            load();
          }}
          onError={setError}
        />
      )}

      <div className="card overflow-x-auto p-0">
        {stylists === null ? (
          <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>
        ) : stylists.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">{t('common.empty')}</p>
        ) : (
          <table className="min-w-full text-sm">
            <tbody>
              {stylists.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{s.ad} {s.soyad}</div>
                    <div className="text-slate-500">{s.email} · {s.telefon}</div>
                  </td>
                  <td className="px-3 py-2">{t(s.isActive ? 'common.active' : 'common.passive')}</td>
                  <td className="space-x-2 whitespace-nowrap px-3 py-2">
                    <button className="btn-ghost" onClick={() => openServices(s.id)}>{t('stylists.services')}</button>
                    <button className="btn-ghost" onClick={() => toggleActive(s)}>
                      {s.isActive ? t('common.passive') : t('common.active')}
                    </button>
                    <Link className="btn-ghost" to={`/kuaforler/${s.id}`}>{t('stylists.edit')}</Link>
                    <button className="btn-danger" onClick={() => remove(s.id)}>{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openId !== null && (
        <div className="card space-y-3">
          <h2 className="font-semibold">{t('stylists.services')}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((sv) => (
              <label key={sv.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(sv.id)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked ? [...prev, sv.id] : prev.filter((x) => x !== sv.id),
                    )
                  }
                />
                {sv.ad} ({sv.sureDk} dk · {sv.fiyat} ₺)
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => saveServices(openId)}>{t('stylists.saveServices')}</button>
            <button className="btn-ghost" onClick={() => setOpenId(null)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewStylistForm({ onDone, onError }: { onDone: () => void; onError: (m: string) => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ ad: '', soyad: '', telefon: '', email: '', password: '', bio: '', slotDakika: 30 });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/stylists', { method: 'POST', body: JSON.stringify({ ...form, slotDakika: Number(form.slotDakika) }) });
      onDone();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-3 sm:grid-cols-2">
      <input className="input" placeholder={t('stylists.name')} value={form.ad} onChange={(e) => set('ad', e.target.value)} required />
      <input className="input" placeholder={t('stylists.surname')} value={form.soyad} onChange={(e) => set('soyad', e.target.value)} required />
      <input className="input" placeholder={t('stylists.email')} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
      <input className="input" placeholder={t('stylists.phone')} value={form.telefon} onChange={(e) => set('telefon', e.target.value)} required />
      <input className="input" placeholder={t('stylists.password')} type="password" minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)} required />
      <input className="input" type="number" min={15} max={120} placeholder={t('stylists.slot')} value={form.slotDakika} onChange={(e) => set('slotDakika', Number(e.target.value))} />
      <textarea className="input sm:col-span-2" placeholder={t('stylists.bio')} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary">{t('common.add')}</button>
      </div>
    </form>
  );
}
