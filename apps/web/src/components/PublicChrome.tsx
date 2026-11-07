import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import i18n from '../i18n';

const NAV = [
  { href: '#hakkinda', key: 'navAbout' },
  { href: '#ozellikler', key: 'navFeatures' },
  { href: '#en-iyiler', key: 'navTop' },
  { href: '#yorumlar', key: 'navReviews' },
  { href: '#galeri', key: 'navGallery' },
  { href: '#planlar', key: 'navPlans' },
];

// Landing'de bağlantılar aynı sayfadaki bölümlere gider; diğer sayfalarda önce ana sayfaya döner.
function sectionHref(href: string, onLanding: boolean) {
  return onLanding ? href : `/${href}`;
}

// Herkese açık sayfaların (landing, kayıt) üst menüsü.
export function PublicHeader({ onLanding = false }: { onLanding?: boolean }) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  function switchLang() {
    const next = i18n.language === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(next);
    try {
      localStorage.setItem('lang', next);
    } catch {
      // Tercih kaydedilemezse dil yalnızca bu oturumda geçerli olur.
    }
  }

  return (
    <header className="lp-header sticky-top">
      <nav className="navbar navbar-expand-xl container py-2" aria-label={t('landing.navLabel')}>
        <Link to="/" className="lp-logo text-nowrap">
          <i className="bi bi-scissors" aria-hidden="true" />
          {t('app.title')}
        </Link>
        <button
          type="button"
          className="navbar-toggler"
          aria-label={t('nav.menu')}
          aria-expanded={menuOpen}
          aria-controls="lp-menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'} fs-4`} aria-hidden="true" />
        </button>
        <div id="lp-menu" className={`collapse navbar-collapse ${menuOpen ? 'show' : ''}`}>
          <ul className="navbar-nav mx-auto gap-xl-3">
            {NAV.map((n) => (
              <li key={n.href} className="nav-item">
                <a className="nav-link lp-nav-link" href={sectionHref(n.href, onLanding)} onClick={() => setMenuOpen(false)}>{t(`landing.${n.key}`)}</a>
              </li>
            ))}
          </ul>
          <div className="d-flex flex-wrap align-items-center gap-2 py-2 py-xl-0">
            <button type="button" className="btn btn-sm btn-link lp-lang" onClick={switchLang}>
              {i18n.language === 'tr' ? 'EN' : 'TR'}
            </button>
            <Link to="/login" className="btn btn-outline-primary rounded-pill px-3 text-nowrap">{t('login.submit')}</Link>
            <Link to="/kayit" className="btn btn-primary rounded-pill px-3 text-nowrap">{t('landing.openAccount')}</Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

// Herkese açık sayfaların koyu alt bilgisi.
export function PublicFooter({ onLanding = false }: { onLanding?: boolean }) {
  const { t } = useTranslation();
  return (
    <footer className="lp-footer">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="lp-logo lp-logo-light">
              <i className="bi bi-scissors" aria-hidden="true" />
              {t('app.title')}
            </div>
            <p className="mt-3 mb-0 lp-footer-about">{t('landing.footerAbout')}</p>
          </div>
          <div className="col-6 col-lg-3">
            <h2 className="lp-footer-title">{t('landing.footerExplore')}</h2>
            <ul className="list-unstyled vstack gap-2 mb-0">
              {NAV.map((n) => <li key={n.href}><a href={sectionHref(n.href, onLanding)}>{t(`landing.${n.key}`)}</a></li>)}
            </ul>
          </div>
          <div className="col-6 col-lg-3">
            <h2 className="lp-footer-title">{t('landing.footerAccount')}</h2>
            <ul className="list-unstyled vstack gap-2 mb-0">
              <li><Link to="/login">{t('login.submit')}</Link></li>
              <li><Link to="/kayit">{t('landing.openAccount')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} {t('app.title')} · {t('landing.footerRights')}</span>
          <span>{t('landing.footerPhotos')}</span>
        </div>
      </div>
    </footer>
  );
}
