import { useTranslation } from 'react-i18next';
import { useAuditQuery } from '../store/apiSlice';
import { errorText } from '../store/baseQuery';
import { formatDate, formatTime } from '../lib/format';

// Platform admin işlemleri: onay, aktif/pasif, ödeme onayı, plan ve havale değişiklikleri.
export default function AuditPage() {
  const { t, i18n } = useTranslation();
  const { data: rows, error: queryError } = useAuditQuery(200);
  const error = queryError ? errorText(queryError, t('common.error')) : '';

  const short = (v: unknown) => (v === null || v === undefined ? '-' : JSON.stringify(v));

  return (
    <div className="vstack gap-4">
      <h1 className="h3 page-title mb-0">{t('audit.title')}</h1>
      {error && <div className="alert alert-danger mb-0">{error}</div>}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {!rows ? (
            <p className="p-4 text-secondary mb-0">{t('common.loading')}</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-secondary mb-0">{t('common.empty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('audit.when')}</th>
                    <th>{t('audit.admin')}</th>
                    <th>{t('audit.action')}</th>
                    <th>{t('audit.target')}</th>
                    <th>{t('audit.before')}</th>
                    <th>{t('audit.after')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="small text-nowrap">{formatDate(r.createdAt, i18n.language)} {formatTime(r.createdAt)}</td>
                      <td className="small">{r.adminAd} {r.adminSoyad}</td>
                      <td className="small fw-semibold">{r.islem}</td>
                      <td className="small">{r.hedefTablo} #{r.hedefId}</td>
                      <td className="small font-monospace text-break">{short(r.oncekiDeger)}</td>
                      <td className="small font-monospace text-break">{short(r.yeniDeger)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
