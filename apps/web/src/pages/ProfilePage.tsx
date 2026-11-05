import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { OwnStylist } from '../types';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, refreshUser, endSession } = useAuth();

  const [personal, setPersonal] = useState({ ad: '', soyad: '', telefon: '' });
  const [stylist, setStylist] = useState<{ bio: string; slotDakika: number } | null>(null);
  const [pw, setPw] = useState({ current: '', next: '', repeat: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) setPersonal({ ad: user.ad, soyad: user.soyad, telefon: user.telefon });
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'KUAFOR') return;
    api<OwnStylist>('/stylists/me')
      .then((s) => setStylist({ bio: s.bio ?? '', slotDakika: s.slotDakika }))
      .catch((err) => setError(err instanceof ApiError ? err.message : t('common.error')));
  }, [user?.role, t]);

  function fail(err: unknown) {
    setError(err instanceof ApiError ? err.message : t('common.error'));
  }

  async function savePersonal(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api('/auth/me', { method: 'PATCH', body: JSON.stringify(personal) });
      await refreshUser();
      setMessage(t('profile.personalSaved'));
    } catch (err) {
      fail(err);
    }
  }

  async function saveStylist(e: FormEvent) {
    e.preventDefault();
    if (!stylist) return;
    setError('');
    setMessage('');
    try {
      await api('/stylists/me', {
        method: 'PATCH',
        body: JSON.stringify({ bio: stylist.bio, slotDakika: Number(stylist.slotDakika) }),
      });
      setMessage(t('profile.saved'));
    } catch (err) {
      fail(err);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (pw.next !== pw.repeat) {
      setError(t('profile.mismatch'));
      return;
    }
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      setMessage(t('profile.passwordChanged'));
      // Sunucu tüm refresh token'ları iptal ettiği için yerel oturumu da kapatıyoruz.
      setTimeout(endSession, 2500);
    } catch (err) {
      fail(err);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">{t('profile.title')}</h1>

      <form onSubmit={savePersonal} className="card space-y-3">
        <h2 className="font-semibold">{t('profile.personal')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ad">{t('stylists.name')}</label>
            <input id="ad" className="input" value={personal.ad} onChange={(e) => setPersonal({ ...personal, ad: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="soyad">{t('stylists.surname')}</label>
            <input id="soyad" className="input" value={personal.soyad} onChange={(e) => setPersonal({ ...personal, soyad: e.target.value })} required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="telefon">{t('stylists.phone')}</label>
          <input id="telefon" className="input" value={personal.telefon} onChange={(e) => setPersonal({ ...personal, telefon: e.target.value })} required />
        </div>
        <p className="text-sm text-slate-500">{user?.email}</p>
        <button type="submit" className="btn-primary">{t('profile.savePersonal')}</button>
      </form>

      {stylist && (
        <form onSubmit={saveStylist} className="card space-y-3">
          <h2 className="font-semibold">{t('profile.stylistInfo')}</h2>
          <div>
            <label className="label" htmlFor="bio">{t('stylists.bio')}</label>
            <textarea id="bio" className="input" rows={4} value={stylist.bio} onChange={(e) => setStylist({ ...stylist, bio: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="slot">{t('stylists.slot')}</label>
            <input id="slot" type="number" min={15} max={120} className="input" value={stylist.slotDakika} onChange={(e) => setStylist({ ...stylist, slotDakika: Number(e.target.value) })} />
          </div>
          <button type="submit" className="btn-primary">{t('common.save')}</button>
        </form>
      )}

      <form onSubmit={changePassword} className="card space-y-3">
        <h2 className="font-semibold">{t('profile.password')}</h2>
        <div>
          <label className="label" htmlFor="cur">{t('profile.currentPassword')}</label>
          <input id="cur" type="password" className="input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="new">{t('profile.newPassword')}</label>
          <input id="new" type="password" minLength={8} className="input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="rep">{t('profile.newPasswordRepeat')}</label>
          <input id="rep" type="password" minLength={8} className="input" value={pw.repeat} onChange={(e) => setPw({ ...pw, repeat: e.target.value })} required />
        </div>
        <button type="submit" className="btn-primary">{t('profile.changePassword')}</button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}
    </div>
  );
}
