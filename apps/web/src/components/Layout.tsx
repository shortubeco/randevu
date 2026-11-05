import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth, type Role } from '../auth/AuthContext';
import i18n from '../i18n';

interface NavItem {
  to: string;
  labelKey: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', roles: ['ADMIN', 'KUAFOR'] },
  { to: '/randevular', labelKey: 'nav.appointments', roles: ['ADMIN', 'KUAFOR'] },
  { to: '/kuaforler', labelKey: 'nav.stylists', roles: ['ADMIN'] },
  { to: '/hizmetler', labelKey: 'nav.services', roles: ['ADMIN'] },
  { to: '/calisma', labelKey: 'nav.schedule', roles: ['KUAFOR'] },
  { to: '/profil', labelKey: 'nav.profile', roles: ['KUAFOR'] },
];

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  function switchLang() {
    const next = i18n.language === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-56 flex-col border-r border-slate-200 bg-white p-4">
        <div className="mb-6 text-lg font-bold text-slate-900">{t('app.title')}</div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.filter((n) => user && n.roles.includes(user.role)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              {t(n.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
          <div className="truncate text-slate-500">
            {user?.ad} {user?.soyad}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={switchLang}>
              {i18n.language === 'tr' ? 'EN' : 'TR'}
            </button>
            <button className="btn-ghost flex-1" onClick={logout}>
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
