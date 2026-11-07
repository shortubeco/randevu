import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PublicFooter, PublicHeader } from '../components/PublicChrome';
import { useLandingQuery, usePlansQuery } from '../store/apiSlice';
import type { LandingStylist } from '../types';

// Fotoğraflar Pexels lisansıyla kullanılır; dosya adının sonundaki sayı Pexels fotoğraf numarasıdır.
const IMG = '/images/landing';

const SLIDES = [
  { img: `${IMG}/hero-beard-9992819.jpg`, key: 'slide1' },
  { img: `${IMG}/hero-stylist-3993320.jpg`, key: 'slide2' },
  { img: `${IMG}/hero-salon-7195805.jpg`, key: 'slide3' },
];

const AUDIENCE = [
  { img: `${IMG}/card-barber-4625626.jpg`, key: 'audience1' },
  { img: `${IMG}/card-women-3993462.jpg`, key: 'audience2' },
  { img: `${IMG}/card-shave-4627333.jpg`, key: 'audience3' },
];

const FEATURES = [
  { icon: 'bi-calendar2-check', key: 'feature1' },
  { icon: 'bi-people', key: 'feature2' },
  { icon: 'bi-graph-up-arrow', key: 'feature3' },
  { icon: 'bi-clock-history', key: 'feature4' },
  { icon: 'bi-bell', key: 'feature5' },
  { icon: 'bi-star', key: 'feature6' },
];

const STEPS = [
  { icon: 'bi-geo-alt', key: 'step1' },
  { icon: 'bi-shop', key: 'step2' },
  { icon: 'bi-scissors', key: 'step3' },
  { icon: 'bi-phone', key: 'step4' },
];

const GALLERY = [
  { img: `${IMG}/gallery-blowdry-3993467.jpg`, key: 'gallery1' },
  { img: `${IMG}/gallery-waves-20046793.jpg`, key: 'gallery2' },
  { img: `${IMG}/gallery-classic-16997937.jpg`, key: 'gallery3' },
  { img: `${IMG}/gallery-prep-3998391.jpg`, key: 'gallery4' },
  { img: `${IMG}/gallery-interior-3993308.jpg`, key: 'gallery5' },
  { img: `${IMG}/gallery-bursa-32847602.jpg`, key: 'gallery6' },
  { img: `${IMG}/gallery-street-17712921.jpg`, key: 'gallery7' },
  { img: `${IMG}/gallery-tools-1319459.jpg`, key: 'gallery8' },
];

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

// Bölüm başlığı: küçük üst başlık, başlık, makas ayracı ve açıklama.
function SectionHead({ eyebrow, title, text, dark }: { eyebrow: string; title: string; text?: string; dark?: boolean }) {
  return (
    <div className={`lp-head ${dark ? 'lp-head-dark' : ''}`}>
      <div className="lp-eyebrow">{eyebrow}</div>
      <h2 className="lp-title">{title}</h2>
      <div className="lp-divider" aria-hidden="true"><i className="bi bi-scissors" /></div>
      {text && <p className="lp-lead">{text}</p>}
    </div>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);
  // Veriler store'da önbelleğe alınır; sayfalar arası gezintide sunucuya tekrar istek gitmez.
  const plansQ = usePlansQuery();
  const landingQ = useLandingQuery();
  const plans = plansQ.data ?? null;
  // Veri alınamazsa boş özet gösterilir; yükleniyor yazısı sonsuza dek kalmaz.
  const data = landingQ.isError
    ? { stats: { isletme: 0, kuafor: 0, degerlendirme: 0 }, topStylists: [], cities: [] }
    : landingQ.data ?? null;

  // Slayt 6 saniyede bir değişir; kullanıcı noktaya basınca süre baştan başlar. Hareket azaltma tercihine uyulur.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setTimeout(() => setSlide((s) => (s + 1) % SLIDES.length), 6000);
    return () => window.clearTimeout(id);
  }, [slide]);

  const stats = data
    ? [
        { v: data.stats.isletme, l: t('landing.statsBusinesses'), icon: 'bi-shop' },
        { v: data.stats.kuafor, l: t('landing.statsStylists'), icon: 'bi-scissors' },
        { v: data.stats.degerlendirme, l: t('landing.statsReviews'), icon: 'bi-star-fill' },
      ]
    : [];
  const hasStats = stats.some((s) => s.v > 0);
  const topStylists = data?.topStylists ?? [];
  const reviews = landingQ.data?.yorumlar ?? [];
  const current = SLIDES[slide].key;

  const planClass = (kod: string) => (kod === 'GOLD' ? 'plan-card-gold' : kod === 'SILVER' ? 'plan-card-silver' : 'plan-card-free');

  return (
    <div className="landing" id="ust">
      <PublicHeader onLanding />

      <section className="lp-hero" aria-roledescription="carousel" aria-label={t('landing.heroLabel')}>
        {SLIDES.map((s, i) => (
          <img key={s.img} src={s.img} alt="" className={`lp-hero-img ${i === slide ? 'is-active' : ''}`} />
        ))}
        <div className="container lp-hero-body">
          <div className="lp-eyebrow">{t(`landing.${current}Eyebrow`)}</div>
          <h1 className="lp-hero-title">{t(`landing.${current}Title`)}</h1>
          <p className="lp-hero-text">{t(`landing.${current}Text`)}</p>
          <div className="d-flex flex-wrap gap-2 mt-4">
            <Link to="/kayit" className="btn btn-primary btn-lg rounded-pill px-4">{t('landing.openAccount')}</Link>
            <a href="#planlar" className="btn btn-outline-light btn-lg rounded-pill px-4">{t('landing.seePlans')}</a>
          </div>
        </div>
        <div className="lp-dots">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`lp-dot ${i === slide ? 'is-active' : ''}`}
              aria-label={t('landing.goToSlide', { n: i + 1 })}
              aria-current={i === slide}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      </section>

      {hasStats && (
        <section className="lp-stats" aria-label={t('landing.statsLabel')}>
          <div className="container">
            <div className="row g-3 text-center">
              {stats.map((s) => (
                <div key={s.l} className="col-4">
                  <i className={`bi ${s.icon} lp-stat-icon`} aria-hidden="true" />
                  <div className="lp-stat-value">{s.v.toLocaleString('tr-TR')}</div>
                  <div className="lp-stat-label">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="hakkinda" className="container lp-section">
        <div className="row g-5 align-items-center">
          <div className="col-lg-6">
            <div className="lp-collage">
              <img src={`${IMG}/about-barber-3998407.jpg`} alt={t('landing.aboutImg1')} className="lp-collage-a" loading="lazy" />
              <img src={`${IMG}/about-scissors-3356170.jpg`} alt={t('landing.aboutImg2')} className="lp-collage-b" loading="lazy" />
            </div>
          </div>
          <div className="col-lg-6">
            <div className="lp-eyebrow">{t('landing.aboutEyebrow')}</div>
            <h2 className="lp-title lp-title-left">{t('landing.aboutTitle')}</h2>
            <p className="mt-3">{t('landing.aboutText')}</p>
            <ul className="list-unstyled vstack gap-2 my-4">
              {['aboutPoint1', 'aboutPoint2', 'aboutPoint3'].map((k) => (
                <li key={k} className="d-flex gap-2">
                  <i className="bi bi-check-circle-fill lp-check" aria-hidden="true" />
                  <span>{t(`landing.${k}`)}</span>
                </li>
              ))}
            </ul>
            <Link to="/kayit" className="btn btn-primary rounded-pill px-4">{t('landing.openAccount')}</Link>
          </div>
        </div>
      </section>

      <section className="lp-section lp-tint">
        <div className="container">
          <SectionHead eyebrow={t('landing.audienceEyebrow')} title={t('landing.audienceTitle')} text={t('landing.audienceText')} />
          <div className="row g-4">
            {AUDIENCE.map((a) => (
              <div key={a.key} className="col-md-4">
                <article className="lp-photo-card h-100">
                  <img src={a.img} alt={t(`landing.${a.key}Alt`)} loading="lazy" />
                  <div className="lp-photo-card-body">
                    <h3 className="h5">{t(`landing.${a.key}Title`)}</h3>
                    <p className="mb-0">{t(`landing.${a.key}Text`)}</p>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ozellikler" className="lp-section lp-dark" style={{ backgroundImage: `url(${IMG}/services-bg-19664892.jpg)` }}>
        <div className="container position-relative">
          <SectionHead dark eyebrow={t('landing.featuresEyebrow')} title={t('landing.featuresTitle')} text={t('landing.featuresText')} />
          <div className="row g-4">
            {FEATURES.map((f) => (
              <div key={f.key} className="col-md-6 col-lg-4">
                <div className="lp-feature h-100">
                  <span className="lp-feature-icon"><i className={`bi ${f.icon}`} aria-hidden="true" /></span>
                  <h3 className="h5 mt-3">{t(`landing.${f.key}Title`)}</h3>
                  <p className="mb-0">{t(`landing.${f.key}Text`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container lp-section">
        <SectionHead eyebrow={t('landing.stepsEyebrow')} title={t('landing.stepsTitle')} text={t('landing.stepsText')} />
        <div className="row g-4">
          {STEPS.map((s, i) => (
            <div key={s.key} className="col-6 col-lg-3 text-center">
              <span className="lp-step-icon">
                <i className={`bi ${s.icon}`} aria-hidden="true" />
                <span className="lp-step-no">{i + 1}</span>
              </span>
              <h3 className="h6 mt-3">{t(`landing.${s.key}Title`)}</h3>
              <p className="small mb-0">{t(`landing.${s.key}Text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="en-iyiler" className="lp-section lp-tint">
        <div className="container">
          <SectionHead eyebrow={t('landing.topEyebrow')} title={t('landing.topTitle')} text={t('landing.topText')} />
          <div className="lp-frame">
            {data === null ? (
              <p className="text-secondary text-center mb-0">{t('common.loading')}</p>
            ) : topStylists.length === 0 ? (
              <p className="text-secondary text-center mb-0">{t('landing.noRatedYet')}</p>
            ) : (
              <ol className="list-unstyled mb-0 lp-top-list" style={{ ['--rows' as string]: Math.ceil(topStylists.length / 2) }}>
                {topStylists.map((s, i) => <StylistRow key={s.id} s={s} rank={i + 1} />)}
              </ol>
            )}
          </div>

          {data && data.cities.length > 0 && (
            <div className="mt-5 pt-3">
              <SectionHead eyebrow={t('landing.citiesEyebrow')} title={t('landing.citiesTitle')} text={t('landing.citiesText')} />
              <div className="row g-4">
                {data.cities.map((c) => (
                  <div key={c.ilAd} className="col-lg-4 min-w-0">
                    <div className="card city-card shadow-sm h-100">
                      <div className="card-body overflow-hidden">
                        <h3 className="h5 mb-2">
                          <i className="bi bi-geo-alt-fill me-1 lp-check" aria-hidden="true" />
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
            </div>
          )}
        </div>
      </section>

      {reviews.length > 0 && (
        <section id="yorumlar" className="lp-section lp-dark" style={{ backgroundImage: `url(${IMG}/hero-salon-7195805.jpg)` }}>
          <div className="container position-relative">
            <SectionHead dark eyebrow={t('landing.reviewsEyebrow')} title={t('landing.reviewsTitle')} text={t('landing.reviewsText')} />
            <div className="row g-4 justify-content-center">
              {reviews.map((r) => (
                <div key={r.id} className="col-md-6 col-lg-4">
                  <figure className="lp-review h-100">
                    <i className="bi bi-quote lp-review-mark" aria-hidden="true" />
                    <Stars value={r.puan} />
                    <blockquote className="lp-review-text">{r.yorum}</blockquote>
                    <figcaption className="lp-review-by">
                      <div className="lp-review-name">{r.musteriAd} {r.musteriSoyadKisa}.</div>
                      <div className="small text-secondary">
                        {t('landing.reviewFor', { name: `${r.kuaforAd} ${r.kuaforSoyadKisa}.` })} · {r.isletmeAd} · {r.ilceAd}
                      </div>
                    </figcaption>
                  </figure>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="galeri" className="container lp-section">
        <SectionHead eyebrow={t('landing.galleryEyebrow')} title={t('landing.galleryTitle')} text={t('landing.galleryText')} />
        <div className="lp-gallery">
          {GALLERY.map((g) => (
            <figure key={g.key} className="lp-gallery-item">
              <img src={g.img} alt={t(`landing.${g.key}`)} loading="lazy" />
              <figcaption>{t(`landing.${g.key}`)}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="planlar" className="lp-section lp-tint">
        <div className="container">
          <SectionHead eyebrow={t('landing.plansEyebrow')} title={t('landing.plansTitle')} text={t('landing.plansText')} />
          {plans === null ? (
            <p className="text-center text-secondary">{t('common.loading')}</p>
          ) : (
            <div className="row g-4 justify-content-center">
              {plans.map((p) => (
                <div key={p.kod} className="col-md-6 col-lg-4">
                  <div className={`card plan-card h-100 ${planClass(p.kod)}`}>
                    <div className="card-body d-flex flex-column p-4">
                      <h3 className="h4">{p.ad}</h3>
                      <div className="plan-price my-2">
                        {p.aylikUcret === null
                          ? t('landing.priceSoon')
                          : p.aylikUcret === 0
                            ? t('landing.free')
                            : `${p.aylikUcret.toLocaleString('tr-TR')} ₺`}
                        {p.aylikUcret !== null && p.aylikUcret > 0 && <span className="fs-6 fw-normal"> {t('landing.perMonth')}</span>}
                      </div>
                      <ul className="list-unstyled mb-4 vstack gap-2">
                        <li><i className="bi bi-check-circle-fill me-2 lp-check" aria-hidden="true" />{t('landing.shops')}: {p.maxDukkan === null ? t('landing.unlimited') : p.maxDukkan}</li>
                        <li><i className="bi bi-check-circle-fill me-2 lp-check" aria-hidden="true" />{t('landing.stylists')}: {p.maxKuaforDukkan === null ? t('landing.unlimited') : `${p.maxKuaforDukkan} (${t('landing.perShop')})`}</li>
                        <li><i className="bi bi-check-circle-fill me-2 lp-check" aria-hidden="true" />{t('landing.services')}: {p.maxHizmetKuafor === null ? t('landing.unlimited') : `${p.maxHizmetKuafor} (${t('landing.perStylist')})`}</li>
                      </ul>
                      <Link to={`/kayit?plan=${p.kod}`} className="btn btn-primary rounded-pill fw-semibold mt-auto">{t('landing.choose')}</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-secondary small mt-4 mb-0">{t('landing.paymentNote')}</p>
        </div>
      </section>

      <section className="lp-cta" style={{ backgroundImage: `url(${IMG}/cta-bg-33448216.jpg)` }}>
        <div className="container position-relative text-center">
          <h2 className="lp-title text-white">{t('landing.ctaTitle')}</h2>
          <p className="lp-cta-text">{t('landing.ctaText')}</p>
          <Link to="/kayit" className="btn btn-primary btn-lg rounded-pill px-4">{t('landing.openAccount')}</Link>
        </div>
      </section>

      <PublicFooter onLanding />

      <a href="#ust" className="lp-top" aria-label={t('landing.backToTop')}>
        <i className="bi bi-chevron-double-up" aria-hidden="true" />
      </a>
    </div>
  );
}
