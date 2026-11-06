import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAdminBusinessesQuery } from '../store/apiSlice';
import { errorText } from '../store/baseQuery';
import { formatDate } from '../lib/format';
import { DURUM_BADGE } from '../lib/badges';
import type { IsletmeDurum } from '../types';

// Platform admini: tüm işletmeler. Onay bekleyenler listenin üstündedir.
export default function BusinessesPage() {
  const { t, i18n } = useTranslation();
  const { data: rows, error: queryError } = useAdminBusinessesQuery();
  const error = queryError ? errorText(queryError, t('common.error')) : '';

  const durumLabel = (d: IsletmeDurum) => t(`durum.${d}`);

  return (
    <div className="vstack gap-4">
      <h1 className="h3 page-title mb-0">{t('businesses.title')}</h1>
      {error && <div className="alert alert-danger mb-0">{error}</div>}

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {!rows ? (
            <p className="p-4 text-secondary mb-0">{t('common.loading')}</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-secondary mb-0">{t('common.empty')}</p>
          ) : (
            <>
              <div className="d-md-none">
                {rows.map((b) => (
                  <Link key={b.id} to={`/admin/isletmeler/${b.id}`} className="d-block p-3 border-bottom text-decoration-none text-body">
                    <div className="d-flex justify-content-between">
                      <span className="fw-semibold">{b.ad}</span>
                      <span className={`badge ${DURUM_BADGE[b.durum]}`}>{durumLabel(b.durum)}</span>
                    </div>
                    <div className="small text-secondary">{b.planAd} · {b.sahipAd} {b.sahipSoyad}</div>
                  </Link>
                ))}
              </div>
              <div className="d-none d-md-block">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>{t('businesses.name')}</th>
                      <th>{t('businesses.owner')}</th>
                      <th>{t('businesses.plan')}</th>
                      <th>{t('businesses.paymentDay')}</th>
                      <th>{t('businesses.approvedAt')}</th>
                      <th>{t('common.status')}</th>
                      <th className="text-end"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((b) => (
                      <tr key={b.id}>
                        <td className="fw-semibold">{b.ad}</td>
                        <td>{b.sahipAd} {b.sahipSoyad}<div className="small text-secondary">{b.email}</div></td>
                        <td>{b.planAd}</td>
                        <td>{b.odemeGunu ?? '-'}</td>
                        <td>{b.onayTarihi ? formatDate(b.onayTarihi, i18n.language) : '-'}</td>
                        <td><span className={`badge ${DURUM_BADGE[b.durum]}`}>{durumLabel(b.durum)}</span></td>
                        <td className="text-end"><Link className="btn btn-sm btn-outline-primary" to={`/admin/isletmeler/${b.id}`}>{t('common.edit')}</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
