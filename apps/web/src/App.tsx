import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth, type Role } from './auth/AuthContext';
import Layout from './components/Layout';
import AppointmentsPage from './pages/AppointmentsPage';
import AuditPage from './pages/AuditPage';
import BusinessDetailPage from './pages/BusinessDetailPage';
import BusinessesPage from './pages/BusinessesPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import OwnerSchedulePage from './pages/OwnerSchedulePage';
import PaymentsPage from './pages/PaymentsPage';
import PlansPage from './pages/PlansPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import ResultPage from './pages/ResultPage';
import SchedulePage from './pages/SchedulePage';
import SettingsPage from './pages/SettingsPage';
import ShopsPage from './pages/ShopsPage';
import StylistEditPage from './pages/StylistEditPage';
import StylistsPage from './pages/StylistsPage';

const STAFF: Role[] = ['PLATFORM_ADMIN', 'ISLETME_SAHIBI', 'KUAFOR'];
const OWNER: Role[] = ['ISLETME_SAHIBI'];
const SALON: Role[] = ['ISLETME_SAHIBI', 'KUAFOR'];
const ADMIN: Role[] = ['PLATFORM_ADMIN'];

function Protected({ roles, children }: { roles: Role[]; children: ReactElement }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) return <div className="p-4 text-secondary">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <div className="alert alert-warning m-4">{t('common.noAccess')}</div>;
  }
  return children;
}

// Ana adres: ziyaretçiye tanıtım sayfası, giriş yapmış kullanıcıya kendi ana sayfası.
function HomeGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <LandingPage />;
  return <Navigate to={user.role === 'PLATFORM_ADMIN' ? '/admin/isletmeler' : '/panel'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomeGate />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/kayit" element={<RegisterPage />} />
        <Route path="/kayit-sonuc" element={<ResultPage />} />
        <Route element={<Protected roles={STAFF}><Layout /></Protected>}>
          <Route path="sifre-degistir" element={<ChangePasswordPage />} />
          <Route path="panel" element={<Protected roles={SALON}><DashboardPage /></Protected>} />
          <Route path="randevular" element={<Protected roles={SALON}><AppointmentsPage /></Protected>} />
          <Route path="dukkanlar" element={<Protected roles={OWNER}><ShopsPage /></Protected>} />
          <Route path="kuaforler" element={<Protected roles={OWNER}><StylistsPage /></Protected>} />
          <Route path="kuaforler/:id" element={<Protected roles={OWNER}><StylistEditPage /></Protected>} />
          <Route path="kuaforler/:id/calisma" element={<Protected roles={OWNER}><OwnerSchedulePage /></Protected>} />
          <Route path="calisma" element={<Protected roles={['KUAFOR']}><SchedulePage basePath="/stylists/me" /></Protected>} />
          <Route path="profil" element={<Protected roles={SALON}><ProfilePage /></Protected>} />
          <Route path="admin/isletmeler" element={<Protected roles={ADMIN}><BusinessesPage /></Protected>} />
          <Route path="admin/isletmeler/:id" element={<Protected roles={ADMIN}><BusinessDetailPage /></Protected>} />
          <Route path="admin/odemeler" element={<Protected roles={ADMIN}><PaymentsPage /></Protected>} />
          <Route path="admin/planlar" element={<Protected roles={ADMIN}><PlansPage /></Protected>} />
          <Route path="admin/ayarlar" element={<Protected roles={ADMIN}><SettingsPage /></Protected>} />
          <Route path="admin/denetim" element={<Protected roles={ADMIN}><AuditPage /></Protected>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
