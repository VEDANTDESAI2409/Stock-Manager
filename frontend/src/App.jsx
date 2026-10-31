import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import queryClient from './services/queryClient';

// Layout
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const WorkEntriesPage = lazy(() => import('./pages/WorkEntriesPage'));
const MaterialReturnsPage = lazy(() => import('./pages/MaterialReturnsPage'));
const KarigarsPage = lazy(() => import('./pages/KarigarsPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const PageSuspense = ({ children }) => (
  <Suspense
    fallback={
      <div className="space-y-4 animate-pulse" aria-label="Loading page">
        <div className="h-7 w-56 rounded bg-slate-200" />
        <div className="h-4 w-80 max-w-full rounded bg-slate-100" />
        <div className="h-40 rounded-xl bg-slate-100" />
      </div>
    }
  >
    {children}
  </Suspense>
);

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-content-secondary uppercase tracking-wider">
            Loading Stock Manager...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Guard (Redirects away from login if already signed in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
            {/* Public Login Route */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            {/* Protected Management Application Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<PageSuspense><DashboardPage /></PageSuspense>} />
              <Route path="products" element={<PageSuspense><ProductsPage /></PageSuspense>} />
              <Route path="work-entries" element={<PageSuspense><WorkEntriesPage /></PageSuspense>} />
              <Route path="material-returns" element={<PageSuspense><MaterialReturnsPage /></PageSuspense>} />
              <Route path="karigars" element={<PageSuspense><KarigarsPage /></PageSuspense>} />
              <Route path="attendance" element={<PageSuspense><AttendancePage /></PageSuspense>} />
              <Route path="reports" element={<PageSuspense><ReportsPage /></PageSuspense>} />
              <Route path="settings" element={<PageSuspense><SettingsPage /></PageSuspense>} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;

