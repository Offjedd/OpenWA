import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader as Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { RoleProvider, useRole, type UserRole } from './hooks/useRole';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CustomerAuthProvider, useCustomerAuth } from './hooks/useCustomerAuth';
import { AgencyAuthProvider, useAgencyAuth } from './agency/hooks/useAgencyAuth';
import './App.css';

// ── AgencyOS pages ────────────────────────────────────────────────────────────
const AgencyLogin = lazy(() => import('./agency/pages/AgencyLogin').then(m => ({ default: m.AgencyLogin })));
const AgencyRegister = lazy(() => import('./agency/pages/AgencyRegister').then(m => ({ default: m.AgencyRegister })));
const AgencyLayout = lazy(() => import('./agency/components/AgencyLayout').then(m => ({ default: m.AgencyLayout })));
const AgencyDashboard = lazy(() => import('./agency/pages/AgencyDashboard').then(m => ({ default: m.AgencyDashboard })));
const SubAccountsPage = lazy(() => import('./agency/pages/SubAccounts').then(m => ({ default: m.SubAccounts })));
const AgencySettings = lazy(() => import('./agency/pages/AgencySettings').then(m => ({ default: m.AgencySettings })));
const SubAccountLayout = lazy(() => import('./agency/components/SubAccountLayout').then(m => ({ default: m.SubAccountLayout })));
const SubAccountDashboard = lazy(() => import('./agency/pages/SubAccountDashboard'));
const AgencyConversations = lazy(() => import('./agency/pages/Conversations'));
const AgencyContacts = lazy(() => import('./agency/pages/Contacts').then(m => ({ default: m.Contacts })));
const AgencyOpportunities = lazy(() => import('./agency/pages/Opportunities').then(m => ({ default: m.Opportunities })));
const AgencyCalendar = lazy(() => import('./agency/pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const AgencyAutomations = lazy(() => import('./agency/pages/Automations').then(m => ({ default: m.Automations })));
const AgencyMedia = lazy(() => import('./agency/pages/MediaPage').then(m => ({ default: m.MediaPage })));
const AgencyAiAgents = lazy(() => import('./agency/pages/AiAgents').then(m => ({ default: m.AiAgents })));
const AgencyQrCodes = lazy(() => import('./agency/pages/QrCodes').then(m => ({ default: m.QrCodes })));
const SubAccountSettings = lazy(() => import('./agency/pages/SubAccountSettings').then(m => ({ default: m.SubAccountSettings })));

// ── Admin dashboard pages (OpenWA gateway) ────────────────────────────────
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

// ── AgencyOS section ──────────────────────────────────────────────────────
function AgencyApp() {
  const { user, loading } = useAgencyAuth();

  if (loading) return loadingFallback;

  return (
    <Suspense fallback={loadingFallback}>
      <Routes>
        <Route
          path="login"
          element={user ? <Navigate to="/agency" replace /> : <AgencyLogin />}
        />
        <Route
          path="register"
          element={user ? <Navigate to="/agency" replace /> : <AgencyRegister />}
        />
        {user ? (
          <Route element={<AgencyLayout />}>
            <Route index element={<AgencyDashboard />} />
            <Route path="sub-accounts" element={<SubAccountsPage />} />
            <Route path="settings" element={<AgencySettings />} />
            <Route path="*" element={<Navigate to="/agency" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/agency/login" replace />} />
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
        <Route path="/agency/*" element={<AgencyApp />} />
        <Route
          path="/app/:subAccountId/*"
          element={
            <Suspense fallback={loadingFallback}>
              <SubAccountLayout />
            </Suspense>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Suspense fallback={loadingFallback}><SubAccountDashboard /></Suspense>} />
          <Route path="conversations" element={<Suspense fallback={loadingFallback}><AgencyConversations /></Suspense>} />
          <Route path="contacts" element={<Suspense fallback={loadingFallback}><AgencyContacts /></Suspense>} />
          <Route path="opportunities" element={<Suspense fallback={loadingFallback}><AgencyOpportunities /></Suspense>} />
          <Route path="calendar" element={<Suspense fallback={loadingFallback}><AgencyCalendar /></Suspense>} />
          <Route path="automations" element={<Suspense fallback={loadingFallback}><AgencyAutomations /></Suspense>} />
          <Route path="media" element={<Suspense fallback={loadingFallback}><AgencyMedia /></Suspense>} />
          <Route path="ai-agents" element={<Suspense fallback={loadingFallback}><AgencyAiAgents /></Suspense>} />
          <Route path="qr-codes" element={<Suspense fallback={loadingFallback}><AgencyQrCodes /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={loadingFallback}><SubAccountSettings /></Suspense>} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
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
        <AgencyAuthProvider>
          <CustomerAuthProvider>
            <AppRoutes />
          </CustomerAuthProvider>
        </AgencyAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
