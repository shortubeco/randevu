import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth, type Role } from './auth/AuthContext';
import Layout from './components/Layout';
import AppointmentsPage from './pages/AppointmentsPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SchedulePage from './pages/SchedulePage';
import ServicesPage from './pages/ServicesPage';
import StylistsPage from './pages/StylistsPage';

function Protected({ roles, children }: { roles: Role[]; children: JSX.Element }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) return <p className="p-6 text-sm text-slate-500">{t('common.loading')}</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <p className="p-6 text-sm text-slate-600">Bu sayfaya erişim yetkiniz yok.</p>;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <Protected roles={['ADMIN', 'KUAFOR']}>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<AppointmentsPage />} />
          <Route path="randevular" element={<AppointmentsPage />} />
          <Route
            path="kuaforler"
            element={
              <Protected roles={['ADMIN']}>
                <StylistsPage />
              </Protected>
            }
          />
          <Route
            path="hizmetler"
            element={
              <Protected roles={['ADMIN']}>
                <ServicesPage />
              </Protected>
            }
          />
          <Route
            path="calisma"
            element={
              <Protected roles={['KUAFOR']}>
                <SchedulePage />
              </Protected>
            }
          />
          <Route
            path="profil"
            element={
              <Protected roles={['KUAFOR']}>
                <ProfilePage />
              </Protected>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
