import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth, type Role } from '../auth/AuthContext';
import i18n from '../i18n';

interface NavItem {
  to: string;
  labelKey: string;
  icon: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: 'bi-speedometer2', roles: ['ADMIN', 'KUAFOR'] },
  { to: '/randevular', labelKey: 'nav.appointments', icon: 'bi-calendar-check', roles: ['ADMIN', 'KUAFOR'] },
  { to: '/kuaforler', labelKey: 'nav.stylists', icon: 'bi-scissors', roles: ['ADMIN'] },
  { to: '/hizmetler', labelKey: 'nav.services', icon: 'bi-list-check', roles: ['ADMIN'] },
  { to: '/musteriler', labelKey: 'nav.customers', icon: 'bi-people', roles: ['ADMIN'] },
  { to: '/raporlar', labelKey: 'nav.reports', icon: 'bi-bar-chart-line', roles: ['ADMIN'] },
  { to: '/calisma', labelKey: 'nav.schedule', icon: 'bi-clock-history', roles: ['KUAFOR'] },
  { to: '/profil', labelKey: 'nav.profile', icon: 'bi-person-circle', roles: ['ADMIN', 'KUAFOR'] },
];

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  // Dar ekranda (tablet ve mobil) kenar çubuğu çekmece olarak açılır/kapanır.
  const [menuOpen, setMenuOpen] = useState(false);

  function switchLang() {
    const next = i18n.language === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  }

  return (
    <div className="app-shell">
      <header className="app-topbar d-lg-none">
        <div className="app-brand">
          <i className="bi bi-scissors me-2" aria-hidden="true" />
          {t('app.title')}
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary"
          aria-label={t('nav.menu')}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'} fs-5`} aria-hidden="true" />
        </button>
      </header>

      {menuOpen && <div className="app-backdrop d-lg-none" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <aside
        id="app-sidebar"
        className={`app-sidebar d-flex flex-column p-3 ${menuOpen ? 'is-open' : ''}`}
      >
        <div className="app-brand d-none d-lg-block fs-5 px-2 py-3 mb-2">
          <i className="bi bi-scissors me-2" aria-hidden="true" />
          {t('app.title')}
        </div>
        <nav className="nav flex-column gap-1">
          {NAV.filter((n) => user && n.roles.includes(user.role)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className="nav-link"
              onClick={() => setMenuOpen(false)}
            >
              <i className={`bi ${n.icon} me-2`} aria-hidden="true" />
              {t(n.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-3 border-top border-secondary-subtle">
          <div className="text-white-50 small px-2 mb-2 text-truncate">
            {user?.ad} {user?.soyad}
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-light flex-fill" onClick={switchLang}>
              {i18n.language === 'tr' ? 'EN' : 'TR'}
            </button>
            <button className="btn btn-sm btn-light flex-fill" onClick={logout}>
              <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </aside>

      <main className="app-content p-3 p-md-4">
        <Outlet />
      </main>
    </div>
  );
}
