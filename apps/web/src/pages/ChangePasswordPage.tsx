import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { errorText } from '../store/baseQuery';
import { useChangePasswordMutation } from '../store/apiSlice';
import { setFlash } from '../lib/flash';

// Geçici şifreyle giren kuaför bu sayfada yeni şifresini belirler.
// Sunucu şifre değişince tüm oturumları kapatır; bu yüzden kullanıcı tekrar giriş yapar.
export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const { user, endSession } = useAuth();
  const [changePassword, state] = useChangePasswordMutation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (next !== repeat) {
      setError(t('profile.mismatch'));
      return;
    }
    try {
      await changePassword({ currentPassword: current, newPassword: next }).unwrap();
      setFlash(t('changePassword.done'));
      endSession();
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  const forced = user?.sifreDegismeli;

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1 className="h3 page-title mb-3">{t('changePassword.title')}</h1>
      {forced && <div className="alert alert-info">{t('changePassword.forcedText')}</div>}
      <form onSubmit={onSubmit} className="card shadow-sm border-0">
        <div className="card-body vstack gap-3">
          <div>
            <label className="form-label" htmlFor="cur">{t('profile.currentPassword')}</label>
            <input id="cur" type="password" className="form-control" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <label className="form-label" htmlFor="new">{t('profile.newPassword')}</label>
            <input id="new" type="password" className="form-control" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <label className="form-label" htmlFor="rep">{t('profile.newPasswordRepeat')}</label>
            <input id="rep" type="password" className="form-control" required minLength={8} value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
          </div>
          {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}
          <div>
            <button type="submit" className="btn btn-primary" disabled={state.isLoading}>{t('changePassword.submit')}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
