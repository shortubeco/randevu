import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PublicFooter, PublicHeader } from '../components/PublicChrome';
import { errorText } from '../store/baseQuery';
import { useCitiesQuery, useDistrictsQuery, usePlansQuery, useRegisterIsletmeMutation } from '../store/apiSlice';
import type { PlanKod } from '../types';

interface FieldProps {
  id: string;
  label: string;
  icon: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}

// Etiketli metin alanı, sağında ikon. Sayfa bileşeninin dışında tanımlı; içeride olsaydı her tuşta odak kaybolurdu.
function Field({ id, label, icon, value, onChange, type = 'text', required, minLength, autoComplete }: FieldProps) {
  return (
    <div className="col-sm-6">
      <label className="form-label" htmlFor={id}>{label}</label>
      <div className="reg-field">
        <input
          id={id}
          type={type}
          className="form-control"
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <i className={`bi ${icon}`} aria-hidden="true" />
      </div>
    </div>
  );
}

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
    <div className="landing">
      <PublicHeader />

      <section className="lp-banner">
        <div className="container position-relative text-center">
          <h1 className="lp-banner-title">{t('register.title')}</h1>
          <nav aria-label={t('register.breadcrumb')}>
            <ol className="lp-breadcrumb">
              <li><Link to="/">{t('register.back')}</Link></li>
              <li aria-current="page">{t('register.title')}</li>
            </ol>
          </nav>
        </div>
      </section>

      <section className="container lp-section">
        <div className="row g-4 g-xl-5">
          <aside className="col-lg-5">
            <div className="reg-aside">
              <img src="/images/landing/register-barber-9992819.jpg" alt={t('register.imgAlt')} />
              <div className="lp-eyebrow mt-4">{t('register.asideEyebrow')}</div>
              <h2 className="lp-title lp-title-left reg-aside-title">{t('register.asideTitle')}</h2>
              <p className="mt-3 mb-3">{t('register.asideText')}</p>
              <ul className="list-unstyled vstack gap-2 mb-0">
                {['asidePoint1', 'asidePoint2', 'asidePoint3'].map((k) => (
                  <li key={k} className="d-flex gap-2">
                    <i className="bi bi-check-circle-fill lp-check" aria-hidden="true" />
                    <span>{t(`register.${k}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="col-lg-7">
            <form onSubmit={onSubmit} className="reg-card">
              <h2 className="reg-card-title">{t('register.formTitle')}</h2>

              <fieldset>
                <legend>{t('register.ownerSection')}</legend>
                <div className="row g-3">
                  <Field id="ad" label={t('register.name')} icon="bi-person" required value={form.ad} onChange={(v) => set('ad', v)} autoComplete="given-name" />
                  <Field id="soyad" label={t('register.surname')} icon="bi-person" required value={form.soyad} onChange={(v) => set('soyad', v)} autoComplete="family-name" />
                  <Field id="telefon" label={t('register.phone')} icon="bi-telephone" type="tel" required value={form.telefon} onChange={(v) => set('telefon', v)} autoComplete="tel" />
                  <Field id="email" label={t('register.email')} icon="bi-envelope" type="email" required value={form.email} onChange={(v) => set('email', v)} autoComplete="email" />
                  <Field id="password" label={t('register.password')} icon="bi-lock" type="password" required minLength={8} value={form.password} onChange={(v) => set('password', v)} autoComplete="new-password" />
                  <Field id="passwordRepeat" label={t('register.passwordRepeat')} icon="bi-lock" type="password" required minLength={8} value={form.passwordRepeat} onChange={(v) => set('passwordRepeat', v)} autoComplete="new-password" />
                </div>
              </fieldset>

              <fieldset>
                <legend>{t('register.salonSection')}</legend>
                <div className="row g-3">
                  <Field id="isletmeAd" label={t('register.businessName')} icon="bi-building" required value={form.isletmeAd} onChange={(v) => set('isletmeAd', v)} autoComplete="organization" />
                  <Field id="dukkanAd" label={t('register.shopName')} icon="bi-shop" required value={form.dukkanAd} onChange={(v) => set('dukkanAd', v)} />
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="il">{t('register.city')}</label>
                    <select id="il" className="form-select" required value={form.ilId} onChange={(e) => onCityChange(e.target.value)}>
                      <option value="">{t('register.choose')}</option>
                      {cities.map((c) => <option key={c.id} value={c.id}>{c.ad}</option>)}
                    </select>
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="ilce">{t('register.district')}</label>
                    <select id="ilce" className="form-select" required value={form.ilceId} onChange={(e) => set('ilceId', e.target.value)} disabled={!form.ilId}>
                      <option value="">{t('register.choose')}</option>
                      {districts.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
                    </select>
                  </div>
                  <Field id="adres" label={t('register.address')} icon="bi-geo-alt" value={form.adres} onChange={(v) => set('adres', v)} autoComplete="street-address" />
                  <Field id="dukkanTelefon" label={t('register.shopPhone')} icon="bi-telephone" type="tel" value={form.dukkanTelefon} onChange={(v) => set('dukkanTelefon', v)} />
                </div>
              </fieldset>

              <fieldset>
                <legend>{t('register.planSection')}</legend>
                <div className="row g-3">
                  {plans.map((p) => (
                    <div key={p.kod} className="col-sm-4">
                      <label className={`reg-plan ${form.planKod === p.kod ? 'is-active' : ''}`}>
                        <div className="form-check mb-0">
                          <input className="form-check-input" type="radio" name="plan" value={p.kod} checked={form.planKod === p.kod} onChange={() => set('planKod', p.kod)} />
                          <span className="form-check-label fw-semibold">{p.ad}</span>
                        </div>
                        <div className="small mt-1">
                          {p.aylikUcret === null ? t('landing.priceSoon') : p.aylikUcret === 0 ? t('landing.free') : `${p.aylikUcret.toLocaleString('tr-TR')} ₺ ${t('landing.perMonth')}`}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                <p className="small text-secondary mt-3 mb-0">{t('landing.paymentNote')}</p>
              </fieldset>

              {error && <div className="alert alert-danger" role="alert">{error}</div>}
              <div className="reg-actions">
                <button type="submit" className="btn btn-primary btn-lg rounded-pill px-5" disabled={registerState.isLoading}>{t('register.submit')}</button>
                <span className="small">{t('register.hasAccount')} <Link to="/login">{t('login.submit')}</Link></span>
              </div>
            </form>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
