import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader as Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { RoleProvider, useRole, type UserRole } from './hooks/useRole';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CustomerAuthProvider, useCustomerAuth } from './hooks/useCustomerAuth';
import './App.css';

// ── Admin dashboard pages ──────────────────────────────────────────────────
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Sessions = lazy(() => import('./pages/Sessions').then(m => ({ default: m.Sessions })));
const Webhooks = lazy(() => import('./pages/Webhooks').then(m => ({ default: m.Webhooks })));
const Logs = lazy(() => import('./pages/Logs').then(m => ({ default: m.Logs })));
const ApiKeys = lazy(() => import('./pages/ApiKeys').then(m => ({ default: m.ApiKeys })));
const MessageTester = lazy(() => import('./pages/MessageTester').then(m => ({ default: m.MessageTester })));
const Infrastructure = lazy(() => import('./pages/Infrastructure').then(m => ({ default: m.Infrastructure })));
const Plugins = lazy(() => import('./pages/Plugins'));

// ── Customer SaaS pages ───────────────────────────────────────────────────
const CustomerLogin = lazy(() => import('./pages/customer/CustomerLogin').then(m => ({ default: m.CustomerLogin })));
const CustomerRegister = lazy(() => import('./pages/customer/CustomerRegister').then(m => ({ default: m.CustomerRegister })));
const CustomerLayout = lazy(() => import('./pages/customer/CustomerLayout').then(m => ({ default: m.CustomerLayout })));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const ConnectWhatsApp = lazy(() => import('./pages/customer/ConnectWhatsApp').then(m => ({ default: m.ConnectWhatsApp })));
const Conversations = lazy(() => import('./pages/customer/Conversations').then(m => ({ default: m.Conversations })));
const CustomerSettings = lazy(() => import('./pages/customer/CustomerSettings').then(m => ({ default: m.CustomerSettings })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

const loadingFallback = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
    <Loader2 className="animate-spin" size={32} />
  </div>
);

// ── Admin app section ──────────────────────────────────────────────────────
function AdminApp() {
  const savedKey = sessionStorage.getItem('openwa_api_key');
  const [isAuthenticated, setIsAuthenticated] = useState(!!savedKey);
  const [, setApiKey] = useState(savedKey || '');
  const { setRole, role } = useRole();

  const handleLogin = async (key: string) => {
    setApiKey(key);
    sessionStorage.setItem('openwa_api_key', key);
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'X-API-Key': key },
      });
      if (response.ok) {
        const data = await response.json();
        setRole(data.role as UserRole);
      }
    } catch {
      setRole('viewer');
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setApiKey('');
    setIsAuthenticated(false);
    setRole(null);
    sessionStorage.removeItem('openwa_api_key');
  };

  useEffect(() => {
    if (!savedKey) return;
    fetch('/api/auth/validate', {
      method: 'POST',
      headers: { 'X-API-Key': savedKey },
    })
      .then(res => res.json())
      .then(data => {
        if (data.valid && data.role) setRole(data.role as UserRole);
      })
      .catch(() => {});
  }, [savedKey, setRole]);

  if (!isAuthenticated) {
    return <Suspense fallback={loadingFallback}><Login onLogin={handleLogin} /></Suspense>;
  }

  return (
    <ToastProvider>
      <Suspense fallback={loadingFallback}>
        <Routes>
          <Route path="/" element={<Layout onLogout={handleLogout} userRole={role} />}>
            <Route index element={<Dashboard />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="webhooks" element={<Webhooks />} />
            {role === 'admin' && <Route path="api-keys" element={<ApiKeys />} />}
            <Route path="logs" element={<Logs />} />
            <Route path="message-tester" element={<MessageTester />} />
            <Route path="infrastructure" element={<Infrastructure />} />
            {role === 'admin' && <Route path="plugins" element={<Plugins />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}

// ── Customer app section ───────────────────────────────────────────────────
function CustomerApp() {
  const { isAuthenticated } = useCustomerAuth();

  return (
    <Suspense fallback={loadingFallback}>
      <Routes>
        <Route
          path="login"
          element={isAuthenticated ? <Navigate to="/customer" replace /> : <CustomerLogin />}
        />
        <Route
          path="register"
          element={isAuthenticated ? <Navigate to="/customer" replace /> : <CustomerRegister />}
        />
        {isAuthenticated ? (
          <Route element={<CustomerLayout />}>
            <Route index element={<CustomerDashboard />} />
            <Route path="connect" element={<ConnectWhatsApp />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="settings" element={<CustomerSettings />} />
            <Route path="*" element={<Navigate to="/customer" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/customer/login" replace />} />
        )}
      </Routes>
    </Suspense>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/customer/*" element={<CustomerApp />} />
        <Route
          path="/*"
          element={
            <RoleProvider>
              <AdminApp />
            </RoleProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CustomerAuthProvider>
          <AppRoutes />
        </CustomerAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
