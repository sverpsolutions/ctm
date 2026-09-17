import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';

// Code-split pages for instant initial load
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const TasksPage = React.lazy(() => import('./pages/TasksPage').then(m => ({ default: m.TasksPage })));
const ImportantDatesPage = React.lazy(() => import('./pages/ImportantDatesPage').then(m => ({ default: m.ImportantDatesPage })));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const MastersPage = React.lazy(() => import('./pages/MastersPage').then(m => ({ default: m.MastersPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AuditLogsPage = React.lazy(() => import('./pages/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const CompanyHierarchyPage = React.lazy(() => import('./pages/CompanyHierarchyPage').then(m => ({ default: m.CompanyHierarchyPage })));
const PlatformDashboardPage = React.lazy(() => import('./pages/PlatformDashboardPage'));
const PlatformTenantsPage = React.lazy(() => import('./pages/PlatformTenantsPage'));
const PlatformRegistrationsPage = React.lazy(() => import('./pages/PlatformRegistrationsPage'));
const PlatformUsersPage = React.lazy(() => import('./pages/PlatformUsersPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const UserCompanyRightsPage = React.lazy(() => import('./pages/UserCompanyRightsPage').then(m => ({ default: m.UserCompanyRightsPage })));

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center p-16">
    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredPermission?: string }> = ({
  children,
  requiredPermission,
}) => {
  const { user, token, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register/:token" element={<Suspense fallback={<PageLoader />}><RegisterPage /></Suspense>} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <TenantProvider>
                    <NotificationProvider>
                      <AppLayout />
                    </NotificationProvider>
                  </TenantProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
              <Route path="platform/dashboard" element={<Suspense fallback={<PageLoader />}><PlatformDashboardPage /></Suspense>} />
              <Route path="platform/tenants" element={<Suspense fallback={<PageLoader />}><PlatformTenantsPage /></Suspense>} />
              <Route path="platform/registrations" element={<Suspense fallback={<PageLoader />}><PlatformRegistrationsPage /></Suspense>} />
              <Route path="platform/users" element={<Suspense fallback={<PageLoader />}><PlatformUsersPage /></Suspense>} />
              <Route path="companies" element={<Suspense fallback={<PageLoader />}><CompanyHierarchyPage /></Suspense>} />
              <Route
                path="tasks"
                element={
                  <ProtectedRoute requiredPermission="tasks.view">
                    <Suspense fallback={<PageLoader />}><TasksPage /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="important-dates"
                element={
                  <ProtectedRoute requiredPermission="dates.view">
                    <Suspense fallback={<PageLoader />}><ImportantDatesPage /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route path="calendar" element={<Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>} />
              <Route
                path="reports"
                element={
                  <ProtectedRoute requiredPermission="reports.view">
                    <Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="masters"
                element={
                  <ProtectedRoute requiredPermission="masters.manage">
                    <Suspense fallback={<PageLoader />}><MastersPage /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="user-company-rights"
                element={
                  <ProtectedRoute requiredPermission="masters.manage">
                    <Suspense fallback={<PageLoader />}><UserCompanyRightsPage /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit-logs"
                element={
                  <ProtectedRoute requiredPermission="audit.view">
                    <Suspense fallback={<PageLoader />}><AuditLogsPage /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute requiredPermission="settings.manage">
                    <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
