import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { AdminStylist } from '../types';

type Form = Omit<AdminStylist, 'id' | 'photoUrl' | 'bio'> & { bio: string; photoUrl: string };

export default function StylistEditPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [form, setForm] = useState<Form | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<AdminStylist>(`/admin/stylists/${id}`)
      .then((s) =>
        setForm({
          ad: s.ad,
          soyad: s.soyad,
          email: s.email,
          telefon: s.telefon,
          isActive: s.isActive,
          bio: s.bio ?? '',
          photoUrl: s.photoUrl ?? '',
          slotDakika: s.slotDakika,
        }),
      )
      .catch((err) => setError(err instanceof ApiError ? err.message : t('stylists.notFound')));
  }, [id, t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await api(`/admin/stylists/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ad: form.ad,
          soyad: form.soyad,
          email: form.email,
          telefon: form.telefon,
          isActive: form.isActive,
          bio: form.bio,
          ...(form.photoUrl ? { photoUrl: form.photoUrl } : {}),
          slotDakika: Number(form.slotDakika),
          // Boş bırakılırsa şifre değişmez.
          ...(newPassword ? { password: newPassword } : {}),
        }),
      });
      setNewPassword('');
      setMessage(t('stylists.saved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="vstack gap-4" style={{ maxWidth: 820 }}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h1 className="h3 page-title mb-0">{t('stylists.editTitle')}</h1>
        <Link to="/kuaforler" className="btn btn-outline-secondary">{t('stylists.back')}</Link>
      </div>

      {!form && !error && <p className="text-secondary">{t('common.loading')}</p>}
      {error && <div className="alert alert-danger mb-0">{error}</div>}

      {form && (
        <form onSubmit={onSubmit} className="card shadow-sm border-0">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small" htmlFor="ad">{t('stylists.name')}</label>
                <input id="ad" className="form-control" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} required />
              </div>
              <div className="col-md-6">
                <label className="form-label small" htmlFor="soyad">{t('stylists.surname')}</label>
                <input id="soyad" className="form-control" value={form.soyad} onChange={(e) => setForm({ ...form, soyad: e.target.value })} required />
              </div>
              <div className="col-md-6">
                <label className="form-label small" htmlFor="email">{t('stylists.email')}</label>
                <input id="email" type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="col-md-6">
                <label className="form-label small" htmlFor="telefon">{t('stylists.phone')}</label>
                <input id="telefon" className="form-control" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} required />
              </div>
              <div className="col-md-6">
                <label className="form-label small" htmlFor="slot">{t('stylists.slot')}</label>
                <input id="slot" type="number" min={15} max={120} className="form-control" value={form.slotDakika} onChange={(e) => setForm({ ...form, slotDakika: Number(e.target.value) })} />
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <div className="form-check form-switch">
                  <input id="active" className="form-check-input" type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  <label className="form-check-label" htmlFor="active">{t('common.active')}</label>
                </div>
              </div>
              <div className="col-12">
                <label className="form-label small" htmlFor="newPassword">{t('stylists.newPassword')}</label>
                <input id="newPassword" type="password" minLength={8} autoComplete="new-password" className="form-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <div className="form-text">{t('stylists.passwordHint')}</div>
              </div>
              <div className="col-12">
                <label className="form-label small" htmlFor="bio">{t('stylists.bio')}</label>
                <textarea id="bio" rows={4} className="form-control" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
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
