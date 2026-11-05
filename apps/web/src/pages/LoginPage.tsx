import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

export default function LoginPage() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t('login.error') : t('common.error'));
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
        </div>
      </div>
    </div>
  );
}
