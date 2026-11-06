import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  usePaymentsQuery,
  useRecordPaymentMutation,
  useSetBusinessStatusMutation,
} from '../store/apiSlice';
import { errorText } from '../store/baseQuery';
import { formatDate, todayIstanbul } from '../lib/format';
import { DURUM_BADGE } from '../lib/badges';
import type { IsletmeDurum } from '../types';

// Ödeme takibi: seçilen tarihte ödemesi olan işletmeler ve ödemesi geçmiş olanlar.
export default function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState(todayIstanbul());
  const [tab, setTab] = useState<'gun' | 'gecmis'>('gun');
  const { data, error: queryError } = usePaymentsQuery(date);
  const [recordPayment] = useRecordPaymentMutation();
  const [setStatus] = useSetBusinessStatusMutation();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const loadError = queryError ? errorText(queryError, t('common.error')) : '';

  async function approvePayment(isletmeId: number) {
    setError('');
    setMessage('');
    try {
      await recordPayment({ isletmeId, odemeTarihi: date }).unwrap();
      setMessage(t('payments.approved'));
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  async function changeDurum(isletmeId: number, durum: 'AKTIF' | 'PASIF') {
    setError('');
    setMessage('');
    try {
      await setStatus({ id: isletmeId, durum }).unwrap();
      setMessage(t('businesses.statusChanged'));
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  // Aktif/pasif düğmesi: aktifse pasife alır, pasifse aktif eder.
  const toggleButton = (id: number, durum: IsletmeDurum) =>
    durum === 'AKTIF' ? (
      <button className="btn btn-sm btn-outline-secondary" onClick={() => changeDurum(id, 'PASIF')}>{t('common.passivate')}</button>
    ) : (
      <button className="btn btn-sm btn-outline-success" onClick={() => changeDurum(id, 'AKTIF')}>{t('common.activate')}</button>
    );

  return (
    <div className="vstack gap-4">
      <h1 className="h3 page-title mb-0">{t('payments.title')}</h1>

      <div className="card shadow-sm border-0">
        <div className="card-body d-flex flex-wrap align-items-end gap-3">
          <div>
            <label className="form-label small fw-semibold" htmlFor="pay-date">{t('payments.date')}</label>
            <input id="pay-date" type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button className="btn btn-outline-primary" onClick={() => setDate(todayIstanbul())}>{t('appointments.today')}</button>
        </div>
      </div>

      <ul className="nav nav-tabs">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'gun' ? 'active' : ''}`} onClick={() => setTab('gun')}>
            {t('payments.dayTab')} {data && `(${data.gunluk.length})`}
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'gecmis' ? 'active' : ''}`} onClick={() => setTab('gecmis')}>
            {t('payments.overdueTab')} {data && `(${data.gecmis.length})`}
          </button>
        </li>
      </ul>

      {(error || loadError) && <div className="alert alert-danger mb-0">{error || loadError}</div>}
      {message && <div className="alert alert-success mb-0">{message}</div>}

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {!data ? (
            <p className="p-4 text-secondary mb-0">{t('common.loading')}</p>
          ) : tab === 'gun' ? (
            data.gunluk.length === 0 ? (
              <p className="p-4 text-secondary mb-0">{t('payments.noneForDay')}</p>
            ) : (
              <ul className="list-group list-group-flush">
                {data.gunluk.map((p) => (
                  <li key={p.id} className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <span>
                      <Link to={`/admin/isletmeler/${p.id}`} className="fw-semibold">{p.ad}</Link>
                      <span className="small text-secondary"> · {p.planAd}</span>
                      <span className={`badge ms-2 ${DURUM_BADGE[p.durum]}`}>{t(`durum.${p.durum}`)}</span>
                    </span>
                    <span className="d-flex flex-wrap gap-2 align-items-center">
                      {p.odendi ? (
                        <span className="badge text-bg-success">
                          <i className="bi bi-check2 me-1" aria-hidden="true" />
                          {t('payments.paid')}
                          {p.odeme && ` · ${formatDate(p.odeme.onaylandiAt, i18n.language)}`}
                        </span>
                      ) : (
                        <button className="btn btn-sm btn-success" onClick={() => approvePayment(p.id)}>{t('payments.approve')}</button>
                      )}
                      {toggleButton(p.id, p.durum)}
                    </span>
                  </li>
                ))}
              </ul>
            )
          ) : data.gecmis.length === 0 ? (
            <p className="p-4 text-secondary mb-0">{t('payments.noOverdue')}</p>
          ) : (
            <ul className="list-group list-group-flush">
              {data.gecmis.map((p) => (
                <li key={p.id} className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <span>
                    <Link to={`/admin/isletmeler/${p.id}`} className="fw-semibold">{p.ad}</Link>
                    <span className="small text-secondary"> · {t('payments.dueDate')}: {formatDate(p.sonOdemeTarihi, i18n.language)}</span>
                    <span className={`badge ms-2 ${DURUM_BADGE[p.durum]}`}>{t(`durum.${p.durum}`)}</span>
                  </span>
                  <span>{toggleButton(p.id, p.durum)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
