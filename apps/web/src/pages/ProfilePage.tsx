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
    <div className="vstack gap-4" style={{ maxWidth: 760 }}>
      <div>
        <h1 className="h3 page-title mb-1">{t('profile.title')}</h1>
        <p className="text-secondary small mb-0">{user?.email}</p>
      </div>

      {message && <div className="alert alert-success mb-0">{message}</div>}
      {error && <div className="alert alert-danger mb-0">{error}</div>}

      <form onSubmit={savePersonal} className="card shadow-sm border-0">
        <div className="card-body">
          <h2 className="h6 fw-semibold mb-3">{t('profile.personal')}</h2>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small" htmlFor="ad">{t('stylists.name')}</label>
              <input id="ad" className="form-control" value={personal.ad} onChange={(e) => setPersonal({ ...personal, ad: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="form-label small" htmlFor="soyad">{t('stylists.surname')}</label>
              <input id="soyad" className="form-control" value={personal.soyad} onChange={(e) => setPersonal({ ...personal, soyad: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="form-label small" htmlFor="telefon">{t('stylists.phone')}</label>
              <input id="telefon" className="form-control" value={personal.telefon} onChange={(e) => setPersonal({ ...personal, telefon: e.target.value })} required />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary">{t('profile.savePersonal')}</button>
            </div>
          </div>
        </div>
      </form>

      {stylist && (
        <form onSubmit={saveStylist} className="card shadow-sm border-0">
          <div className="card-body">
            <h2 className="h6 fw-semibold mb-3">{t('profile.stylistInfo')}</h2>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label small" htmlFor="bio">{t('stylists.bio')}</label>
                <textarea id="bio" rows={4} className="form-control" value={stylist.bio} onChange={(e) => setStylist({ ...stylist, bio: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label small" htmlFor="slot">{t('stylists.slot')}</label>
                <input id="slot" type="number" min={15} max={120} className="form-control" value={stylist.slotDakika} onChange={(e) => setStylist({ ...stylist, slotDakika: Number(e.target.value) })} />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary">{t('common.save')}</button>
              </div>
            </div>
          </div>
        </form>
      )}

      <form onSubmit={changePassword} className="card shadow-sm border-0">
        <div className="card-body">
          <h2 className="h6 fw-semibold mb-3">{t('profile.password')}</h2>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label small" htmlFor="cur">{t('profile.currentPassword')}</label>
              <input id="cur" type="password" className="form-control" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="form-label small" htmlFor="new">{t('profile.newPassword')}</label>
              <input id="new" type="password" minLength={8} autoComplete="new-password" className="form-control" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="form-label small" htmlFor="rep">{t('profile.newPasswordRepeat')}</label>
              <input id="rep" type="password" minLength={8} autoComplete="new-password" className="form-control" value={pw.repeat} onChange={(e) => setPw({ ...pw, repeat: e.target.value })} required />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-outline-primary">{t('profile.changePassword')}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
