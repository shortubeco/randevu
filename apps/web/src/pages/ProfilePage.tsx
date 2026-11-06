import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import {
  useChangePasswordMutation,
  useMyStylistQuery,
  useUpdateMeMutation,
  useUpdateMyStylistMutation,
} from '../store/apiSlice';
import { errorText } from '../store/baseQuery';
import { setFlash } from '../lib/flash';
import type { OwnStylistProfile } from '../types';

// Kişisel bilgiler, şifre ve (kuaförse) kuaför profili.
export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, refreshUser, endSession } = useAuth();
  const isStylist = user?.role === 'KUAFOR';
  const stylistQ = useMyStylistQuery(undefined, { skip: !isStylist });
  const [updateMe] = useUpdateMeMutation();
  const [updateMyStylist] = useUpdateMyStylistMutation();
  const [changePassword] = useChangePasswordMutation();

  const [personal, setPersonal] = useState({ ad: user?.ad ?? '', soyad: user?.soyad ?? '', telefon: user?.telefon ?? '' });
  const [pw, setPw] = useState({ current: '', next: '', repeat: '' });
  const [stylist, setStylist] = useState<OwnStylistProfile | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Kuaför profili önbellekten gelir; düzenleme için yerel kopya tutulur.
  useEffect(() => {
    if (stylistQ.data) setStylist(stylistQ.data);
  }, [stylistQ.data]);

  async function savePersonal(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await updateMe(personal).unwrap();
      await refreshUser();
      setMessage(t('profile.personalSaved'));
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  async function saveStylist(e: FormEvent) {
    e.preventDefault();
    if (!stylist) return;
    setError('');
    setMessage('');
    try {
      await updateMyStylist({
        bio: stylist.bio ?? '',
        photoUrl: stylist.photoUrl || undefined,
        slotDakika: stylist.slotDakika,
      }).unwrap();
      setMessage(t('profile.saved'));
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (pw.next !== pw.repeat) {
      setError(t('profile.mismatch'));
      return;
    }
    try {
      await changePassword({ currentPassword: pw.current, newPassword: pw.next }).unwrap();
      // Sunucu tüm oturumları kapatır; kullanıcı tekrar giriş yapar.
      setFlash(t('profile.passwordChanged'));
      endSession();
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  return (
    <div className="vstack gap-4" style={{ maxWidth: 760 }}>
      <h1 className="h3 page-title mb-0">{t('profile.title')}</h1>
      {error && <div className="alert alert-danger mb-0">{error}</div>}
      {message && <div className="alert alert-success mb-0">{message}</div>}

      <form onSubmit={savePersonal} className="card shadow-sm border-0">
        <div className="card-body vstack gap-3">
          <h2 className="h6 fw-semibold mb-0">{t('profile.personal')}</h2>
          <div className="row g-2">
            <div className="col-md-4"><label className="form-label small" htmlFor="p-ad">{t('register.name')}</label><input id="p-ad" className="form-control" required value={personal.ad} onChange={(e) => setPersonal({ ...personal, ad: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small" htmlFor="p-soyad">{t('register.surname')}</label><input id="p-soyad" className="form-control" required value={personal.soyad} onChange={(e) => setPersonal({ ...personal, soyad: e.target.value })} /></div>
            <div className="col-md-4"><label className="form-label small" htmlFor="p-tel">{t('register.phone')}</label><input id="p-tel" className="form-control" required value={personal.telefon} onChange={(e) => setPersonal({ ...personal, telefon: e.target.value })} /></div>
          </div>
          <div><button type="submit" className="btn btn-primary">{t('profile.savePersonal')}</button></div>
        </div>
      </form>

      {isStylist && stylist && (
        <form onSubmit={saveStylist} className="card shadow-sm border-0">
          <div className="card-body vstack gap-3">
            <h2 className="h6 fw-semibold mb-0">{t('profile.stylistInfo')}</h2>
            <div>
              <label className="form-label small" htmlFor="s-bio">{t('stylists.bio')}</label>
              <textarea id="s-bio" className="form-control" rows={3} maxLength={500} value={stylist.bio ?? ''} onChange={(e) => setStylist({ ...stylist, bio: e.target.value })} />
            </div>
            <div className="row g-2">
              <div className="col-md-8"><label className="form-label small" htmlFor="s-photo">{t('profile.photo')}</label><input id="s-photo" className="form-control" value={stylist.photoUrl ?? ''} onChange={(e) => setStylist({ ...stylist, photoUrl: e.target.value })} /></div>
              <div className="col-md-4"><label className="form-label small" htmlFor="s-slot">{t('stylists.slot')}</label><input id="s-slot" type="number" min={15} max={120} className="form-control" value={stylist.slotDakika} onChange={(e) => setStylist({ ...stylist, slotDakika: Number(e.target.value) })} /></div>
            </div>
            <div><button type="submit" className="btn btn-primary">{t('common.save')}</button></div>
          </div>
        </form>
      )}

      <form onSubmit={onChangePassword} className="card shadow-sm border-0">
        <div className="card-body vstack gap-3">
          <h2 className="h6 fw-semibold mb-0">{t('profile.password')}</h2>
          <div><label className="form-label small" htmlFor="cur">{t('profile.currentPassword')}</label><input id="cur" type="password" className="form-control" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></div>
          <div className="row g-2">
            <div className="col-md-6"><label className="form-label small" htmlFor="new">{t('profile.newPassword')}</label><input id="new" type="password" className="form-control" required minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" /></div>
            <div className="col-md-6"><label className="form-label small" htmlFor="rep">{t('profile.newPasswordRepeat')}</label><input id="rep" type="password" className="form-control" required minLength={8} value={pw.repeat} onChange={(e) => setPw({ ...pw, repeat: e.target.value })} autoComplete="new-password" /></div>
          </div>
          <div><button type="submit" className="btn btn-outline-primary">{t('profile.changePassword')}</button></div>
        </div>
      </form>
    </div>
  );
}
