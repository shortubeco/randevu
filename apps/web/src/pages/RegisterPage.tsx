import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { errorText } from '../store/baseQuery';
import { useCitiesQuery, useDistrictsQuery, usePlansQuery, useRegisterIsletmeMutation } from '../store/apiSlice';
import type { PlanKod } from '../types';

// İşletme sahibi kaydı: sahip bilgileri, işletme, ilk dükkan ve plan.
export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Landing'deki plan seçimi ?plan=GOLD gibi gelir; geçersiz değerde ücretsiz plan seçili olur.
  const requested = searchParams.get('plan');
  const initialPlan: PlanKod = requested === 'GOLD' || requested === 'SILVER' || requested === 'UCRETSIZ' ? requested : 'UCRETSIZ';

  const plansQ = usePlansQuery();
  const citiesQ = useCitiesQuery();
  const [form, setForm] = useState({
    ad: '', soyad: '', telefon: '', email: '', password: '', passwordRepeat: '',
    isletmeAd: '', planKod: initialPlan,
    dukkanAd: '', ilId: '', ilceId: '', adres: '', dukkanTelefon: '',
  });
  const districtsQ = useDistrictsQuery(Number(form.ilId), { skip: !form.ilId });
  const [register, registerState] = useRegisterIsletmeMutation();
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onCityChange(id: string) {
    setForm((f) => ({ ...f, ilId: id, ilceId: '' }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.passwordRepeat) {
      setError(t('register.mismatch'));
      return;
    }
    try {
      const result = await register({
        ad: form.ad,
        soyad: form.soyad,
        telefon: form.telefon,
        email: form.email,
        password: form.password,
        isletmeAd: form.isletmeAd,
        planKod: form.planKod,
        dukkan: {
          ad: form.dukkanAd,
          ilId: Number(form.ilId),
          ilceId: Number(form.ilceId),
          ...(form.adres ? { adres: form.adres } : {}),
          ...(form.dukkanTelefon ? { telefon: form.dukkanTelefon } : {}),
        },
      }).unwrap();
      navigate('/kayit-sonuc', { state: { result, planKod: form.planKod, isletmeAd: form.isletmeAd } });
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  const plans = plansQ.data ?? [];
  const cities = citiesQ.data ?? [];
  const districts = districtsQ.data ?? [];

  return (
    <div className="min-vh-100 py-4 px-3" style={{ background: '#f4f6f9' }}>
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="h3 page-title mb-0">{t('register.title')}</h1>
          <Link to="/" className="small">{t('register.back')}</Link>
        </div>
        <form onSubmit={onSubmit} className="vstack gap-4">
          <section className="card shadow-sm border-0">
            <div className="card-body">
              <h2 className="h6 fw-bold mb-3">{t('register.ownerSection')}</h2>
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label" htmlFor="ad">{t('register.name')}</label><input id="ad" className="form-control" required value={form.ad} onChange={(e) => set('ad', e.target.value)} /></div>
                <div className="col-md-6"><label className="form-label" htmlFor="soyad">{t('register.surname')}</label><input id="soyad" className="form-control" required value={form.soyad} onChange={(e) => set('soyad', e.target.value)} /></div>
                <div className="col-md-6"><label className="form-label" htmlFor="telefon">{t('register.phone')}</label><input id="telefon" className="form-control" required value={form.telefon} onChange={(e) => set('telefon', e.target.value)} /></div>
                <div className="col-md-6"><label className="form-label" htmlFor="email">{t('register.email')}</label><input id="email" type="email" className="form-control" required value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" /></div>
                <div className="col-md-6"><label className="form-label" htmlFor="password">{t('register.password')}</label><input id="password" type="password" className="form-control" required minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" /></div>
                <div className="col-md-6"><label className="form-label" htmlFor="passwordRepeat">{t('register.passwordRepeat')}</label><input id="passwordRepeat" type="password" className="form-control" required minLength={8} value={form.passwordRepeat} onChange={(e) => set('passwordRepeat', e.target.value)} autoComplete="new-password" /></div>
              </div>
            </div>
          </section>

          <section className="card shadow-sm border-0">
            <div className="card-body">
              <h2 className="h6 fw-bold mb-3">{t('register.salonSection')}</h2>
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label" htmlFor="isletmeAd">{t('register.businessName')}</label><input id="isletmeAd" className="form-control" required value={form.isletmeAd} onChange={(e) => set('isletmeAd', e.target.value)} /></div>
                <div className="col-md-6"><label className="form-label" htmlFor="dukkanAd">{t('register.shopName')}</label><input id="dukkanAd" className="form-control" required value={form.dukkanAd} onChange={(e) => set('dukkanAd', e.target.value)} /></div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="il">{t('register.city')}</label>
                  <select id="il" className="form-select" required value={form.ilId} onChange={(e) => onCityChange(e.target.value)}>
                    <option value="">{t('register.choose')}</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.ad}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="ilce">{t('register.district')}</label>
                  <select id="ilce" className="form-select" required value={form.ilceId} onChange={(e) => set('ilceId', e.target.value)} disabled={!form.ilId}>
                    <option value="">{t('register.choose')}</option>
                    {districts.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
                  </select>
                </div>
                <div className="col-md-8"><label className="form-label" htmlFor="adres">{t('register.address')}</label><input id="adres" className="form-control" value={form.adres} onChange={(e) => set('adres', e.target.value)} /></div>
                <div className="col-md-4"><label className="form-label" htmlFor="dukkanTelefon">{t('register.shopPhone')}</label><input id="dukkanTelefon" className="form-control" value={form.dukkanTelefon} onChange={(e) => set('dukkanTelefon', e.target.value)} /></div>
              </div>
            </div>
          </section>

          <section className="card shadow-sm border-0">
            <div className="card-body">
              <h2 className="h6 fw-bold mb-3">{t('register.planSection')}</h2>
              <div className="row g-3">
                {plans.map((p) => (
                  <div key={p.kod} className="col-md-4">
                    <label className={`card h-100 p-3 ${form.planKod === p.kod ? 'border-primary border-2' : ''}`} style={{ cursor: 'pointer' }}>
                      <div className="form-check">
                        <input className="form-check-input" type="radio" name="plan" value={p.kod} checked={form.planKod === p.kod} onChange={() => set('planKod', p.kod)} />
                        <span className="form-check-label fw-semibold">{p.ad}</span>
                      </div>
                      <div className="small text-secondary mt-1">
                        {p.aylikUcret === null ? t('landing.priceSoon') : p.aylikUcret === 0 ? t('landing.free') : `${p.aylikUcret.toLocaleString('tr-TR')} ₺ ${t('landing.perMonth')}`}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {error && <div className="alert alert-danger mb-0">{error}</div>}
          <div className="d-flex justify-content-end">
            <button type="submit" className="btn btn-primary btn-lg" disabled={registerState.isLoading}>{t('register.submit')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
