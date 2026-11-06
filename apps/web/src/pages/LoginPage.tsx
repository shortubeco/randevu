import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { takeFlash } from '../lib/flash';

export default function LoginPage() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash] = useState(() => takeFlash());

  if (user) return <Navigate to="/" replace />;

  // Sunucunun döndürdüğü hata koduna göre açıklayıcı metin.
  function errorText(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.code === 'ISLETME_PASIF') return t('login.pasif');
      if (err.code === 'ISLETME_ONAY_BEKLIYOR') return t('login.onayBekliyor');
      if (err.code === 'MUSTERI_PANEL') return t('login.musteriPanel');
      if (err.status === 401) return t('login.error');
    }
    return t('common.error');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3" style={{ background: 'linear-gradient(135deg, #14213d 0%, #1b2d52 60%, #0d6efd 140%)' }}>
      <div className="card border-0 shadow-lg w-100" style={{ maxWidth: 400 }}>
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <div className="display-6 text-primary"><i className="bi bi-scissors" aria-hidden="true" /></div>
            <h1 className="h4 fw-bold mt-2 mb-0">{t('app.title')}</h1>
            <p className="text-secondary small mb-0">{t('login.title')}</p>
          </div>
          {flash && <div className="alert alert-success py-2">{flash}</div>}
          <form onSubmit={onSubmit} className="vstack gap-3">
            <div>
              <label className="form-label" htmlFor="email">{t('login.email')}</label>
              <input id="email" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="form-label" htmlFor="password">{t('login.password')}</label>
              <input id="password" type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}
            <button type="submit" className="btn btn-primary btn-lg w-100" disabled={busy}>
              {t('login.submit')}
            </button>
          </form>
          <div className="text-center mt-4 small">
            <span className="text-secondary">{t('login.noAccount')} </span>
            <Link to="/kayit">{t('login.registerLink')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
