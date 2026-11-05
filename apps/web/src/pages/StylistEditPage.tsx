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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');

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
          // Boş fotoğraf adresi gönderilmez; mevcut değer korunur.
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
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{t('stylists.editTitle')}</h1>
        <Link to="/kuaforler" className="btn-ghost">{t('stylists.back')}</Link>
      </div>

      {!form && !error && <p className="text-sm text-slate-500">{t('common.loading')}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {form && (
        <form onSubmit={onSubmit} className="card grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ad">{t('stylists.name')}</label>
            <input id="ad" className="input" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="soyad">{t('stylists.surname')}</label>
            <input id="soyad" className="input" value={form.soyad} onChange={(e) => setForm({ ...form, soyad: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="email">{t('stylists.email')}</label>
            <input id="email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="telefon">{t('stylists.phone')}</label>
            <input id="telefon" className="input" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="slot">{t('stylists.slot')}</label>
            <input id="slot" type="number" min={15} max={120} className="input" value={form.slotDakika} onChange={(e) => setForm({ ...form, slotDakika: Number(e.target.value) })} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              {t('common.active')}
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="newPassword">{t('stylists.newPassword')}</label>
            <input
              id="newPassword"
              type="password"
              minLength={8}
              autoComplete="new-password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">{t('stylists.passwordHint')}</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="bio">{t('stylists.bio')}</label>
            <textarea id="bio" rows={4} className="input" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
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
