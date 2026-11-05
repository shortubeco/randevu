import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth, type Role } from './auth/AuthContext';
import Layout from './components/Layout';
import AppointmentsPage from './pages/AppointmentsPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import ReportsPage from './pages/ReportsPage';
import SchedulePage from './pages/SchedulePage';
import ServiceEditPage from './pages/ServiceEditPage';
import ServicesPage from './pages/ServicesPage';
import StylistEditPage from './pages/StylistEditPage';
import StylistsPage from './pages/StylistsPage';

function Protected({ roles, children }: { roles: Role[]; children: ReactElement }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) return <p className="p-6 text-sm text-slate-500">{t('common.loading')}</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <p className="p-6 text-sm text-slate-600">{t('common.noAccess')}</p>;
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
          <Route index element={<DashboardPage />} />
          <Route path="randevular" element={<AppointmentsPage />} />
          <Route path="kuaforler" element={<Protected roles={['ADMIN']}><StylistsPage /></Protected>} />
          <Route path="kuaforler/:id" element={<Protected roles={['ADMIN']}><StylistEditPage /></Protected>} />
          <Route path="hizmetler" element={<Protected roles={['ADMIN']}><ServicesPage /></Protected>} />
          <Route path="hizmetler/:id" element={<Protected roles={['ADMIN']}><ServiceEditPage /></Protected>} />
          <Route path="musteriler" element={<Protected roles={['ADMIN']}><CustomersPage /></Protected>} />
          <Route path="raporlar" element={<Protected roles={['ADMIN']}><ReportsPage /></Protected>} />
          <Route path="calisma" element={<Protected roles={['KUAFOR']}><SchedulePage /></Protected>} />
          <Route path="profil" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
