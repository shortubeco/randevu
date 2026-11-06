import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLandingQuery, usePlansQuery } from '../store/apiSlice';
import type { LandingStylist } from '../types';

// Şehir kartlarının üst çizgi renkleri.
const CITY_COLORS = ['#6f42c1', '#0d6efd', '#20c997'];

// Ortalama puanı yıldızla gösterir (en yakın tam yıldız, sayısal değer yanında).
function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="star-rating" aria-label={`${value} / 5`}>
      {'★'.repeat(full)}
      <span className="text-secondary opacity-50">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

// Fotoğraf yoksa ad ve soyad baş harflerinden daire.
function Avatar({ s }: { s: LandingStylist }) {
  if (s.photoUrl) return <img src={s.photoUrl} alt="" className="avatar" />;
  return <span className="avatar">{s.ad.charAt(0)}{s.soyadKisa}</span>;
}

function StylistRow({ s, rank }: { s: LandingStylist; rank: number }) {
  const { t } = useTranslation();
  return (
    <li className="d-flex align-items-center gap-3 py-3 border-bottom">
      <span className={`rank-badge ${rank <= 3 ? `rank-${rank}` : ''}`}>{rank}</span>
      <Avatar s={s} />
      <div className="flex-grow-1 min-w-0">
        <div className="fw-semibold text-truncate">{s.ad} {s.soyadKisa}.</div>
        <div className="small text-secondary text-truncate">
          {s.isletmeAd} · {s.ilceAd}
        </div>
      </div>
      <div className="text-end">
        <div className="fw-bold">{s.ortalama.toFixed(1)}</div>
        <Stars value={s.ortalama} />
        <div className="small text-secondary text-nowrap">{s.adet} {t('landing.reviews')}</div>
      </div>
    </li>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();
  // Veriler store'da önbelleğe alınır; sayfalar arası gezintide sunucuya tekrar istek gitmez.
  const plansQ = usePlansQuery();
  const landingQ = useLandingQuery();
  const plans = plansQ.data ?? null;
  // Veri alınamazsa boş özet gösterilir; yükleniyor yazısı sonsuza dek kalmaz.
  const data = landingQ.isError
    ? { stats: { isletme: 0, kuafor: 0, degerlendirme: 0 }, topStylists: [], cities: [] }
    : landingQ.data ?? null;

  const features = [
    { icon: 'bi-calendar2-check', bg: 'linear-gradient(135deg,#0d6efd,#6ea8fe)', title: t('landing.feature1Title'), text: t('landing.feature1Text') },
    { icon: 'bi-people', bg: 'linear-gradient(135deg,#6f42c1,#d63384)', title: t('landing.feature2Title'), text: t('landing.feature2Text') },
    { icon: 'bi-graph-up-arrow', bg: 'linear-gradient(135deg,#20c997,#198754)', title: t('landing.feature3Title'), text: t('landing.feature3Text') },
  ];

  const planClass = (kod: string) => (kod === 'GOLD' ? 'plan-card-gold' : kod === 'SILVER' ? 'plan-card-silver' : 'plan-card-free');

  return (
    <div className="min-vh-100" style={{ background: '#f4f6f9' }}>
      <header className="d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 px-md-5 py-3 bg-white shadow-sm sticky-top">
        <div className="fw-bold fs-5 text-nowrap" style={{ color: '#6f42c1' }}>
          <i className="bi bi-scissors me-2" aria-hidden="true" />
          {t('app.title')}
        </div>
        <div className="d-flex gap-2">
          <Link to="/login" className="btn btn-outline-primary btn-sm text-nowrap">{t('login.submit')}</Link>
          <Link to="/kayit" className="btn btn-sm text-white text-nowrap" style={{ background: 'linear-gradient(90deg,#6f42c1,#0d6efd)' }}>
            {t('landing.openAccount')}
          </Link>
        </div>
      </header>

      <section className="landing-hero px-3 py-5">
        <span className="landing-blob" style={{ width: 320, height: 320, background: '#ffc107', top: -120, right: -80 }} aria-hidden="true" />
        <span className="landing-blob" style={{ width: 260, height: 260, background: '#ff6b6b', bottom: -100, left: -60 }} aria-hidden="true" />
        <div className="container position-relative text-center">
          <h1 className="display-5 fw-bold">{t('landing.heroTitle')}</h1>
          <p className="lead mx-auto mt-3" style={{ maxWidth: 680 }}>{t('landing.heroText')}</p>
          <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
            <Link to="/kayit" className="btn btn-light btn-lg fw-semibold">{t('landing.openAccount')}</Link>
            <a href="#planlar" className="btn btn-outline-light btn-lg">{t('landing.seePlans')}</a>
          </div>

          {data && (
            <div className="row g-3 justify-content-center mt-4">
              {[
                { v: data.stats.isletme, l: t('landing.statsBusinesses'), bg: 'linear-gradient(135deg,#ff6b6b,#ffa94d)', icon: 'bi-shop' },
                { v: data.stats.kuafor, l: t('landing.statsStylists'), bg: 'linear-gradient(135deg,#20c997,#0ca678)', icon: 'bi-scissors' },
                { v: data.stats.degerlendirme, l: t('landing.statsReviews'), bg: 'linear-gradient(135deg,#845ef7,#be4bdb)', icon: 'bi-star-fill' },
              ].map((s) => (
                <div key={s.l} className="col-6 col-md-3">
                  <div className="card stat-tile h-100 py-3" style={{ background: s.bg }}>
                    <div className="card-body">
                      <i className={`bi ${s.icon} fs-4`} aria-hidden="true" />
                      <div className="fs-2 fw-bold">{s.v}</div>
                      <div className="small opacity-75">{s.l}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container py-5">
        <div className="row g-4 text-center">
          {features.map((f) => (
            <div key={f.title} className="col-md-4">
              <span className="feature-icon mb-3" style={{ background: f.bg }}>
                <i className={`bi ${f.icon}`} aria-hidden="true" />
              </span>
              <h2 className="h5 fw-bold mt-2">{f.title}</h2>
              <p className="text-secondary">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container pb-4">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h2 className="h3 fw-bold">{t('landing.topTitle')}</h2>
            <p className="text-secondary mb-3">{t('landing.topText')}</p>
            {data === null ? (
              <p className="text-secondary mb-0">{t('common.loading')}</p>
            ) : data.topStylists.length === 0 ? (
              <p className="text-secondary mb-0">{t('landing.noRatedYet')}</p>
            ) : (
              <ol className="list-unstyled mb-0">
                {data.topStylists.map((s, i) => <StylistRow key={s.id} s={s} rank={i + 1} />)}
              </ol>
            )}
          </div>
        </div>
      </section>

      {data && data.cities.length > 0 && (
        <section className="container pb-4">
          <h2 className="h3 fw-bold mb-1">{t('landing.citiesTitle')}</h2>
          <p className="text-secondary mb-4">{t('landing.citiesText')}</p>
          <div className="row g-4">
            {data.cities.map((c, idx) => (
              <div key={c.ilAd} className="col-lg-4 min-w-0">
                <div className="card city-card shadow-sm h-100" style={{ ['--city-color' as string]: CITY_COLORS[idx % CITY_COLORS.length] }}>
                  <div className="card-body overflow-hidden">
                    <h3 className="h5 fw-bold mb-2">
                      <i className="bi bi-geo-alt-fill me-1" style={{ color: CITY_COLORS[idx % CITY_COLORS.length] }} aria-hidden="true" />
                      {c.ilAd}
                    </h3>
                    {c.stylists.length === 0 ? (
                      <p className="text-secondary mb-0">{t('landing.noRatedYet')}</p>
                    ) : (
                      <ol className="list-unstyled mb-0">
                        {c.stylists.map((s, i) => <StylistRow key={s.id} s={s} rank={i + 1} />)}
                      </ol>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="planlar" className="container py-5">
        <h2 className="h3 text-center fw-bold mb-1">{t('landing.plansTitle')}</h2>
        <p className="text-center text-secondary mb-4">{t('landing.plansText')}</p>
        {plans === null ? (
          <p className="text-center text-secondary">{t('common.loading')}</p>
        ) : (
          <div className="row g-4 justify-content-center">
            {plans.map((p) => (
              <div key={p.kod} className="col-md-6 col-lg-4">
                <div className={`card plan-card h-100 shadow ${planClass(p.kod)}`}>
                  <div className="card-body d-flex flex-column p-4">
                    <h3 className="h4 fw-bold">{p.ad}</h3>
                    <div className="display-6 fw-bold my-2">
                      {p.aylikUcret === null
                        ? t('landing.priceSoon')
                        : p.aylikUcret === 0
                          ? t('landing.free')
                          : `${p.aylikUcret.toLocaleString('tr-TR')} ₺`}
                      {p.aylikUcret !== null && p.aylikUcret > 0 && <span className="fs-6 fw-normal"> {t('landing.perMonth')}</span>}
                    </div>
                    <ul className="list-unstyled mb-4 vstack gap-2">
                      <li><i className="bi bi-check-circle-fill me-2" aria-hidden="true" />{t('landing.shops')}: {p.maxDukkan === null ? t('landing.unlimited') : p.maxDukkan}</li>
                      <li><i className="bi bi-check-circle-fill me-2" aria-hidden="true" />{t('landing.stylists')}: {p.maxKuaforDukkan === null ? t('landing.unlimited') : `${p.maxKuaforDukkan} (${t('landing.perShop')})`}</li>
                      <li><i className="bi bi-check-circle-fill me-2" aria-hidden="true" />{t('landing.services')}: {p.maxHizmetKuafor === null ? t('landing.unlimited') : `${p.maxHizmetKuafor} (${t('landing.perStylist')})`}</li>
                    </ul>
                    <Link to={`/kayit?plan=${p.kod}`} className="btn btn-light fw-semibold mt-auto">{t('landing.choose')}</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-center text-secondary small mt-4">{t('landing.paymentNote')}</p>
      </section>

      <section className="cta-band py-5 px-3 text-center">
        <h2 className="h3 fw-bold">{t('landing.ctaTitle')}</h2>
        <p className="mb-4 opacity-75">{t('landing.ctaText')}</p>
        <Link to="/kayit" className="btn btn-light btn-lg fw-semibold">{t('landing.openAccount')}</Link>
      </section>

      <footer className="text-center text-secondary small py-4">
        © {new Date().getFullYear()} {t('app.title')} · {t('landing.footerRights')}
      </footer>
    </div>
  );
}
