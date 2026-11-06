import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import {
  useAdminBusinessQuery,
  useApproveBusinessMutation,
  useSetBusinessStatusMutation,
  useSetPaymentDayMutation,
} from '../store/apiSlice';
import { errorText } from '../store/baseQuery';
import { formatDate, todayIstanbul } from '../lib/format';
import { DURUM_BADGE } from '../lib/badges';

// Tek işletme: onay, aktif/pasif ve ödeme günü yönetimi.
export default function BusinessDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const isletmeId = Number(id);
  const { data: b, error: queryError } = useAdminBusinessQuery(isletmeId);
  const [approve] = useApproveBusinessMutation();
  const [setStatus] = useSetBusinessStatusMutation();
  const [setPaymentDay] = useSetPaymentDayMutation();

  const [approveDate, setApproveDate] = useState(todayIstanbul());
  const [payDate, setPayDate] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const loadError = queryError ? errorText(queryError, t('common.error')) : '';

  async function run(action: () => Promise<unknown>, okText: string) {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(okText);
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  // Havale kontrol edildi, onay. Ücretli planda seçilen tarih ilk ödeme tarihidir; günü ödeme günü olur.
  function onApprove(e: FormEvent) {
    e.preventDefault();
    const ucretli = b?.planKod !== 'UCRETSIZ';
    run(
      () =>
        approve({
          id: isletmeId,
          body: ucretli ? { odemeTarihi: approveDate, odemeGunu: Number(approveDate.slice(8, 10)) } : {},
        }).unwrap(),
      t('businesses.approved'),
    );
  }

  function onSetDurum(durum: 'AKTIF' | 'PASIF') {
    run(() => setStatus({ id: isletmeId, durum }).unwrap(), t('businesses.statusChanged'));
  }

  function onChangePayDay(e: FormEvent) {
    e.preventDefault();
    run(
      () => setPaymentDay({ id: isletmeId, odemeGunu: Number(payDate.slice(8, 10)) }).unwrap(),
      t('businesses.paymentDayChanged'),
    );
    setPayDate('');
  }

  if (!b && !loadError) return <p className="text-secondary">{t('common.loading')}</p>;

  return (
    <div className="vstack gap-4" style={{ maxWidth: 960 }}>
      <div>
        <Link to="/admin/isletmeler" className="small">{t('businesses.back')}</Link>
        {b && (
          <div className="d-flex flex-wrap align-items-center gap-2">
            <h1 className="h3 page-title mb-0">{b.ad}</h1>
            <span className={`badge ${DURUM_BADGE[b.durum]}`}>{t(`durum.${b.durum}`)}</span>
          </div>
        )}
      </div>

      {(error || loadError) && <div className="alert alert-danger mb-0">{error || loadError}</div>}
      {message && <div className="alert alert-success mb-0">{message}</div>}

      {b && (
        <>
          <section className="card shadow-sm border-0">
            <div className="card-body">
              <dl className="row small mb-0">
                <dt className="col-sm-3">{t('businesses.owner')}</dt><dd className="col-sm-9">{b.sahipAd} {b.sahipSoyad} · {b.email} · {b.telefon}</dd>
                <dt className="col-sm-3">{t('businesses.plan')}</dt><dd className="col-sm-9">{b.planAd} {b.aylikUcret !== null && `· ${b.aylikUcret.toLocaleString('tr-TR')} ₺ ${t('landing.perMonth')}`}</dd>
                <dt className="col-sm-3">{t('businesses.paymentDay')}</dt><dd className="col-sm-9">{b.odemeGunu ?? t('businesses.notSet')}</dd>
                <dt className="col-sm-3">{t('businesses.approvedAt')}</dt><dd className="col-sm-9">{b.onayTarihi ? formatDate(b.onayTarihi, i18n.language) : '-'}</dd>
              </dl>
            </div>
          </section>

          {b.durum === 'ONAY_BEKLIYOR' && (
            <form onSubmit={onApprove} className="card shadow-sm border-0 border-start border-warning border-4">
              <div className="card-body">
                <h2 className="h6 fw-semibold">{t('businesses.approveTitle')}</h2>
                <p className="small text-secondary">{t('businesses.approveHint')}</p>
                <div className="row g-2 align-items-end">
                  {b.planKod !== 'UCRETSIZ' && (
                    <div className="col-md-4">
                      <label className="form-label small" htmlFor="approve-date">{t('businesses.firstPaymentDate')}</label>
                      <input id="approve-date" type="date" className="form-control" required value={approveDate} onChange={(e) => setApproveDate(e.target.value)} />
                    </div>
                  )}
                  <div className="col-md-3"><button type="submit" className="btn btn-success w-100">{t('businesses.approve')}</button></div>
                </div>
              </div>
            </form>
          )}

          {b.durum !== 'ONAY_BEKLIYOR' && (
            <section className="card shadow-sm border-0">
              <div className="card-body vstack gap-3">
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <span className="fw-semibold me-2">{t('businesses.status')}:</span>
                  {b.durum === 'AKTIF' ? (
                    <button className="btn btn-outline-secondary" onClick={() => onSetDurum('PASIF')}>{t('common.passivate')}</button>
                  ) : (
                    <button className="btn btn-success" onClick={() => onSetDurum('AKTIF')}>{t('common.activate')}</button>
                  )}
                </div>
                <form onSubmit={onChangePayDay} className="row g-2 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label small" htmlFor="pay-day">{t('businesses.setPaymentDay')}</label>
                    <input id="pay-day" type="date" className="form-control" required value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                    <div className="form-text">{t('businesses.paymentDayHint')}</div>
                  </div>
                  <div className="col-md-3"><button type="submit" className="btn btn-outline-primary w-100">{t('common.save')}</button></div>
                </form>
              </div>
            </section>
          )}

          <section className="card shadow-sm border-0">
            <div className="card-body">
              <h2 className="h6 fw-semibold mb-3">{t('businesses.shops')}</h2>
              {b.dukkanlar.length === 0 ? (
                <p className="text-secondary mb-0">{t('common.empty')}</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {b.dukkanlar.map((d) => (
                    <li key={d.id} className="list-group-item px-0">
                      <span className="fw-semibold">{d.ad}</span>
                      <span className="small text-secondary"> · {d.ilAd} / {d.ilceAd}{d.adres ? ` · ${d.adres}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="card shadow-sm border-0">
            <div className="card-body">
              <h2 className="h6 fw-semibold mb-3">{t('businesses.payments')}</h2>
              {b.odemeler.length === 0 ? (
                <p className="text-secondary mb-0">{t('common.empty')}</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {b.odemeler.map((o) => (
                    <li key={o.id} className="list-group-item px-0 d-flex justify-content-between">
                      <span>{formatDate(o.odemeTarihi, i18n.language)}</span>
                      <span className="text-secondary small">{o.tutar !== null ? `${o.tutar.toLocaleString('tr-TR')} ₺` : '-'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
