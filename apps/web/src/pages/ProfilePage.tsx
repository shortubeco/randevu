import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { OwnStylist } from '../types';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [form, setForm] = useState<{ bio: string; slotDakika: number } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<OwnStylist>('/stylists/me')
      .then((s) => setForm({ bio: s.bio ?? '', slotDakika: s.slotDakika }))
      .catch((err) => setError(err instanceof ApiError ? err.message : t('common.error')));
  }, [t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError('');
    setMessage('');
    try {
      await api('/stylists/me', {
        method: 'PATCH',
        body: JSON.stringify({ bio: form.bio, slotDakika: Number(form.slotDakika) }),
      });
      setMessage(t('profile.saved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('profile.title')}</h1>

      <div className="card text-sm text-slate-700">
        <div className="font-medium">{user?.ad} {user?.soyad}</div>
        <div>{user?.email}</div>
        <div>{user?.telefon}</div>
      </div>

      {form && (
        <form onSubmit={onSubmit} className="card space-y-3">
          <div>
            <label className="label" htmlFor="bio">{t('stylists.bio')}</label>
            <textarea id="bio" className="input" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="slot">{t('stylists.slot')}</label>
            <input id="slot" type="number" min={15} max={120} className="input" value={form.slotDakika} onChange={(e) => setForm({ ...form, slotDakika: Number(e.target.value) })} />
          </div>
          <button type="submit" className="btn-primary">{t('common.save')}</button>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}
    </div>
  );
}
