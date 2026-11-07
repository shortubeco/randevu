import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useHavaleQuery } from '../store/apiSlice';
import type { Havale, PlanKod } from '../types';

interface ResultState {
  result: { isletmeId: number; durum: string; havale: Havale | null };
  planKod: PlanKod;
  isletmeAd: string;
}

// Kayıt sonrası ödeme sayfası: ücretli planda havale bilgileri (admin ayarlarından gelir), ücretsizde onay bilgisi.
export default function ResultPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const state = location.state as ResultState | null;
  const paid = !!state && state.planKod !== 'UCRETSIZ';
  // Kayıt yanıtında havale yoksa güncel ayar store/sunucudan alınır.
  const havaleQ = useHavaleQuery(undefined, { skip: !paid || !!state?.result.havale });
  const havale: Havale | null | undefined = state?.result.havale ?? havaleQ.data;

  if (!state) return <Navigate to="/kayit" replace />;

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3" style={{ background: 'var(--app-bg)' }}>
      <div className="card border-0 shadow-sm w-100" style={{ maxWidth: 560 }}>
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-3">
            <i className="bi bi-check-circle display-5 text-success" aria-hidden="true" />
            <h1 className="h4 fw-bold mt-2">{t('result.title')}</h1>
            <p className="text-secondary mb-0">{t('result.pendingText')}</p>
          </div>

          {paid && (
            <div className="mt-4">
              <h2 className="h6 fw-bold">{t('result.paymentTitle')}</h2>
              <p className="small text-secondary">{t('result.paymentText')}</p>
              {havale === undefined ? (
                <p className="text-secondary">{t('common.loading')}</p>
              ) : havale ? (
                <dl className="row small mb-0 border rounded p-3 bg-light">
                  <dt className="col-5">{t('result.bank')}</dt><dd className="col-7">{havale.banka}</dd>
                  <dt className="col-5">{t('result.recipient')}</dt><dd className="col-7">{havale.alici}</dd>
                  <dt className="col-5">{t('result.iban')}</dt><dd className="col-7 font-monospace">{havale.iban}</dd>
                  <dt className="col-5">{t('result.description')}</dt><dd className="col-7">{state.isletmeAd}</dd>
                </dl>
              ) : (
                <div className="alert alert-warning mb-0">{t('result.noHavale')}</div>
              )}
            </div>
          )}

          <div className="text-center mt-4">
            <Link to="/login" className="btn btn-primary">{t('login.submit')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
