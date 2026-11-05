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

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  async function toggleActive(s: AdminStylist) {
    await run(() => api(`/admin/stylists/${s.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !s.isActive }) }));
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
    await run(() => api(`/admin/stylists/${id}/services`, { method: 'PUT', body: JSON.stringify({ serviceIds: selected }) }));
    setOpenId(null);
  }

  return (
    <div className="vstack gap-4">
      <div className="d-flex justify-content-between align-items-center">
        <h1 className="h3 page-title mb-0">{t('stylists.title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
          {t('stylists.new')}
        </button>
      </div>

      {error && <div className="alert alert-danger mb-0">{error}</div>}

      {showForm && (
        <NewStylistForm
          onDone={() => {
            setShowForm(false);
            load();
          }}
          onError={setError}
        />
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {stylists === null ? (
            <p className="p-4 text-secondary mb-0">{t('common.loading')}</p>
          ) : stylists.length === 0 ? (
            <p className="p-4 text-secondary mb-0">{t('common.empty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('stylists.name')}</th>
                    <th>{t('stylists.phone')}</th>
                    <th>{t('common.active')}</th>
                    <th className="text-end">{t('appointments.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stylists.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="fw-semibold">{s.ad} {s.soyad}</div>
                        <div className="small text-secondary">{s.email}</div>
                      </td>
                      <td>{s.telefon}</td>
                      <td>
                        <span className={`badge ${s.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                          {t(s.isActive ? 'common.active' : 'common.passive')}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end flex-wrap gap-1">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openServices(s.id)}>
                            {t('stylists.services')}
                          </button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => toggleActive(s)}>
                            {s.isActive ? t('common.passive') : t('common.active')}
                          </button>
                          <Link className="btn btn-sm btn-outline-dark" to={`/kuaforler/${s.id}`}>
                            {t('stylists.edit')}
                          </Link>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => remove(s.id)}>
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

      {openId !== null && (
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <h2 className="h6 fw-semibold mb-3">{t('stylists.services')}</h2>
            <div className="row row-cols-1 row-cols-md-2 g-2 mb-3">
              {services.map((sv) => (
                <div key={sv.id} className="col">
                  <div className="form-check">
                    <input
                      id={`sv-${sv.id}`}
                      type="checkbox"
                      className="form-check-input"
                      checked={selected.includes(sv.id)}
                      onChange={(e) =>
                        setSelected((prev) => (e.target.checked ? [...prev, sv.id] : prev.filter((x) => x !== sv.id)))
                      }
                    />
                    <label className="form-check-label" htmlFor={`sv-${sv.id}`}>
                      {sv.ad} <span className="text-secondary">({sv.sureDk} dk · {sv.fiyat} ₺)</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-primary" onClick={() => saveServices(openId)}>{t('stylists.saveServices')}</button>
              <button className="btn btn-outline-secondary" onClick={() => setOpenId(null)}>{t('common.cancel')}</button>
            </div>
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
    <form onSubmit={onSubmit} className="card shadow-sm border-0">
      <div className="card-body">
        <h2 className="h6 fw-semibold mb-3">{t('stylists.new')}</h2>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label small" htmlFor="ad">{t('stylists.name')}</label>
            <input id="ad" className="form-control" value={form.ad} onChange={(e) => set('ad', e.target.value)} required />
          </div>
          <div className="col-md-6">
            <label className="form-label small" htmlFor="soyad">{t('stylists.surname')}</label>
            <input id="soyad" className="form-control" value={form.soyad} onChange={(e) => set('soyad', e.target.value)} required />
          </div>
          <div className="col-md-6">
            <label className="form-label small" htmlFor="email">{t('stylists.email')}</label>
            <input id="email" type="email" className="form-control" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div className="col-md-6">
            <label className="form-label small" htmlFor="telefon">{t('stylists.phone')}</label>
            <input id="telefon" className="form-control" value={form.telefon} onChange={(e) => set('telefon', e.target.value)} required />
          </div>
          <div className="col-md-6">
            <label className="form-label small" htmlFor="pw">{t('stylists.password')}</label>
            <input id="pw" type="password" minLength={8} className="form-control" value={form.password} onChange={(e) => set('password', e.target.value)} required />
          </div>
          <div className="col-md-6">
            <label className="form-label small" htmlFor="slot">{t('stylists.slot')}</label>
            <input id="slot" type="number" min={15} max={120} className="form-control" value={form.slotDakika} onChange={(e) => set('slotDakika', Number(e.target.value))} />
          </div>
          <div className="col-12">
            <label className="form-label small" htmlFor="bio">{t('stylists.bio')}</label>
            <textarea id="bio" rows={2} className="form-control" value={form.bio} onChange={(e) => set('bio', e.target.value)} />
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-primary">{t('common.add')}</button>
          </div>
        </div>
      </div>
    </form>
  );
}
