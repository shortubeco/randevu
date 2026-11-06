import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useCreateStylistMutation, useOwnerShopsQuery, useOwnerStylistsQuery } from '../store/apiSlice';
import { errorText } from '../store/baseQuery';

// İşletme sahibinin kuaförleri. Yeni kuaföre e-posta ve geçici şifre verilir; kuaför ilk girişte şifresini değiştirir.
export default function StylistsPage() {
  const { t } = useTranslation();
  const stylistsQ = useOwnerStylistsQuery();
  const shopsQ = useOwnerShopsQuery();
  const stylists = stylistsQ.data ?? null;
  const shops = (shopsQ.data ?? []).filter((x) => x.aktif);
  const [createStylist, createState] = useCreateStylistMutation();
  const [form, setForm] = useState({ shopId: '', ad: '', soyad: '', telefon: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const listError = stylistsQ.error ? errorText(stylistsQ.error, t('common.error')) : '';

  async function create(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await createStylist({ ...form, shopId: Number(form.shopId) }).unwrap();
      setForm({ shopId: form.shopId, ad: '', soyad: '', telefon: '', email: '', password: '' });
      setMessage(t('stylists.created'));
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  return (
    <div className="vstack gap-4">
      <h1 className="h3 page-title mb-0">{t('stylists.title')}</h1>
      {(error || listError) && <div className="alert alert-danger mb-0">{error || listError}</div>}
      {message && <div className="alert alert-success mb-0">{message}</div>}

      {shops.length === 0 ? (
        <div className="alert alert-info mb-0">
          {t('stylists.needShop')} <Link to="/dukkanlar">{t('nav.shops')}</Link>
        </div>
      ) : (
        <form onSubmit={create} className="card shadow-sm border-0">
          <div className="card-body">
            <h2 className="h6 fw-semibold mb-3">{t('stylists.new')}</h2>
            <div className="row g-2">
              <div className="col-md-3">
                <label className="form-label small" htmlFor="st-shop">{t('stylists.shop')}</label>
                <select id="st-shop" className="form-select" required value={form.shopId} onChange={(e) => setForm({ ...form, shopId: e.target.value })}>
                  <option value="">{t('register.choose')}</option>
                  {shops.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
                </select>
              </div>
              <div className="col-md-3"><label className="form-label small" htmlFor="st-ad">{t('stylists.name')}</label><input id="st-ad" className="form-control" required value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} /></div>
              <div className="col-md-3"><label className="form-label small" htmlFor="st-soyad">{t('stylists.surname')}</label><input id="st-soyad" className="form-control" required value={form.soyad} onChange={(e) => setForm({ ...form, soyad: e.target.value })} /></div>
              <div className="col-md-3"><label className="form-label small" htmlFor="st-tel">{t('stylists.phone')}</label><input id="st-tel" className="form-control" required value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} /></div>
              <div className="col-md-4"><label className="form-label small" htmlFor="st-mail">{t('stylists.email')}</label><input id="st-mail" type="email" className="form-control" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="col-md-5"><label className="form-label small" htmlFor="st-pw">{t('stylists.tempPassword')}</label><input id="st-pw" className="form-control" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div className="col-md-3 d-flex align-items-end"><button type="submit" className="btn btn-primary w-100" disabled={createState.isLoading}>{t('common.add')}</button></div>
            </div>
            <p className="small text-secondary mt-2 mb-0">{t('stylists.tempHint')}</p>
          </div>
        </form>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {stylists === null ? (
            <p className="p-4 text-secondary mb-0">{t('common.loading')}</p>
          ) : stylists.length === 0 ? (
            <p className="p-4 text-secondary mb-0">{t('common.empty')}</p>
          ) : (
            <>
              <div className="d-md-none">
                {stylists.map((s) => (
                  <Link key={s.id} to={`/kuaforler/${s.id}`} className="d-block p-3 border-bottom text-decoration-none text-body">
                    <div className="d-flex justify-content-between">
                      <span className="fw-semibold">{s.ad} {s.soyad}</span>
                      <span className={`badge ${s.aktif ? 'text-bg-success' : 'text-bg-secondary'}`}>{s.aktif ? t('common.active') : t('common.passive')}</span>
                    </div>
                    <div className="small text-secondary">{s.dukkanAd} · {s.email}</div>
                  </Link>
                ))}
              </div>
              <div className="d-none d-md-block">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>{t('stylists.name')}</th><th>{t('stylists.shop')}</th><th>{t('stylists.email')}</th><th>{t('stylists.phone')}</th><th>{t('common.status')}</th><th className="text-end">{t('appointments.actions')}</th></tr>
                  </thead>
                  <tbody>
                    {stylists.map((s) => (
                      <tr key={s.id}>
                        <td className="fw-semibold">{s.ad} {s.soyad}</td>
                        <td>{s.dukkanAd}</td>
                        <td>{s.email}</td>
                        <td>{s.telefon}</td>
                        <td><span className={`badge ${s.aktif ? 'text-bg-success' : 'text-bg-secondary'}`}>{s.aktif ? t('common.active') : t('common.passive')}</span></td>
                        <td className="text-end"><Link className="btn btn-sm btn-outline-primary" to={`/kuaforler/${s.id}`}>{t('common.edit')}</Link></td>
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
