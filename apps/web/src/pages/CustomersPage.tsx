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

  useEffect(() => {
    api<Customer[]>('/admin/customers')
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : t('common.error')));
  }, [t]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('customers.title')}</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto p-0">
        {rows === null ? (
          <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">{t('common.empty')}</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">{t('customers.name')}</th>
                <th className="px-3 py-2">{t('customers.phone')}</th>
                <th className="px-3 py-2">{t('customers.email')}</th>
                <th className="px-3 py-2">{t('customers.count')}</th>
                <th className="px-3 py-2">{t('customers.registered')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{c.ad} {c.soyad}</td>
                  <td className="px-3 py-2">{c.telefon}</td>
                  <td className="px-3 py-2">{c.email}</td>
                  <td className="px-3 py-2">{c.randevuSayisi}</td>
                  <td className="px-3 py-2">{formatDate(c.createdAt, i18n.language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
