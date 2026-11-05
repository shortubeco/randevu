import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/client';
import { formatDate } from '../lib/format';

interface Customer {
  id: number;
  ad: string;
  soyad: string;
  telefon: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  randevuSayisi: number;
}

export default function CustomersPage() {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    api<Customer[]>('/admin/customers')
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : t('common.error')));
  }, [t]);

  const q = query.trim().toLowerCase();
  const filtered = rows?.filter(
    (c) => !q || `${c.ad} ${c.soyad} ${c.telefon} ${c.email}`.toLowerCase().includes(q),
  );

  return (
    <div className="vstack gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <h1 className="h3 page-title mb-0">{t('customers.title')}</h1>
        <input
          type="search"
          className="form-control"
          style={{ maxWidth: 280 }}
          placeholder={t('common.filter')}
          aria-label={t('common.filter')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <div className="alert alert-danger mb-0">{error}</div>}

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {filtered === undefined ? (
            <p className="p-4 text-secondary mb-0">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-secondary mb-0">{t('common.empty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('customers.name')}</th>
                    <th>{t('customers.phone')}</th>
                    <th>{t('customers.email')}</th>
                    <th className="text-center">{t('customers.count')}</th>
                    <th>{t('customers.registered')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td className="fw-semibold">{c.ad} {c.soyad}</td>
                      <td>{c.telefon}</td>
                      <td className="text-secondary">{c.email}</td>
                      <td className="text-center">
                        <span className="badge text-bg-light border">{c.randevuSayisi}</span>
                      </td>
                      <td>{formatDate(c.createdAt, i18n.language)}</td>
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
