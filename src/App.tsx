import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AppLayout } from '@/layouts/AppLayout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { RemittanceList } from '@/pages/remittances/RemittanceList';
import { RemittanceCreate } from '@/pages/remittances/RemittanceCreate';
import { RemittanceDetail } from '@/pages/remittances/RemittanceDetail';
import { VehicleList } from '@/pages/vehicles/VehicleList';
import { VehicleApply } from '@/pages/vehicles/VehicleApply';
import { VehicleCreate } from '@/pages/vehicles/VehicleCreate';
import { VehicleDetail } from '@/pages/vehicles/VehicleDetail';
import { VehicleManage } from '@/pages/vehicles/VehicleManage';
import { VehicleSchedule } from '@/pages/vehicles/VehicleSchedule';
import { Notifications } from '@/pages/Notifications';
import { Profile } from '@/pages/Profile';
import { Admin } from '@/pages/Admin';
import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';

// Protected Route Component
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  // 等待持久化恢复完成再判断登录态，避免刷新时因尚未 rehydrate 误判为未登录
  const [hasHydrated, setHasHydrated] = useState(() =>
    typeof useAuthStore.persist?.hasHydrated === 'function'
      ? useAuthStore.persist.hasHydrated()
      : true,
  );

  useEffect(() => {
    if (hasHydrated) return;
    const unsub = useAuthStore.persist?.onFinishHydration?.(() => setHasHydrated(true));
    if (useAuthStore.persist?.hasHydrated?.()) setHasHydrated(true);
    return () => (typeof unsub === 'function' ? unsub() : undefined);
  }, [hasHydrated]);

  useEffect(() => {
    if (hasHydrated) checkAuth();
  }, [hasHydrated, checkAuth]);

  if (!hasHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// 部署到子路径（如 GitHub Pages）时需设置 VITE_BASE_PATH，例如 /remittance-vehicle-app
const basename = (import.meta.env.VITE_BASE_PATH ?? '').replace(/\/$/, '');

function App() {
  return (
    <BrowserRouter basename={basename || undefined}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Remittance Routes */}
        <Route
          path="/remittances"
          element={
            <ProtectedRoute>
              <AppLayout>
                <RemittanceList />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/remittances/create"
          element={
            <ProtectedRoute>
              <AppLayout>
                <RemittanceCreate />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/remittances/:id"
          element={
            <ProtectedRoute>
              <AppLayout>
                <RemittanceDetail />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Vehicle Routes */}
        <Route
          path="/vehicles"
          element={
            <ProtectedRoute>
              <AppLayout>
                <VehicleList />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles/apply"
          element={
            <ProtectedRoute>
              <AppLayout>
                <VehicleApply />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles/create"
          element={
            <ProtectedRoute>
              <AppLayout>
                <VehicleCreate />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles/manage"
          element={
            <ProtectedRoute>
              <AppLayout>
                <VehicleManage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles/schedule"
          element={
            <ProtectedRoute>
              <AppLayout>
                <VehicleSchedule />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles/:id"
          element={
            <ProtectedRoute>
              <AppLayout>
                <VehicleDetail />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Notification Routes */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Notifications />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Profile Route */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Profile />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin Route - ADMIN only */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AppLayout>
                <Admin />
              </AppLayout>
            </AdminRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster position="top-center" />
    </BrowserRouter>
  );
}

export default App;
