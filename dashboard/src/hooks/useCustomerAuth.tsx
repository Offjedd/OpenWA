import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { CustomerProfile } from '../services/customerApi';

interface CustomerAuthState {
  token: string | null;
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  login: (token: string, customer: CustomerProfile) => void;
  logout: () => void;
  updateCustomer: (customer: CustomerProfile) => void;
}

const CustomerAuthContext = createContext<CustomerAuthState | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('customer_token'));
  const [customer, setCustomer] = useState<CustomerProfile | null>(() => {
    const raw = localStorage.getItem('customer_profile');
    return raw ? (JSON.parse(raw) as CustomerProfile) : null;
  });

  const login = (newToken: string, profile: CustomerProfile) => {
    localStorage.setItem('customer_token', newToken);
    localStorage.setItem('customer_profile', JSON.stringify(profile));
    setToken(newToken);
    setCustomer(profile);
  };

  const logout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_profile');
    setToken(null);
    setCustomer(null);
  };

  const updateCustomer = (profile: CustomerProfile) => {
    localStorage.setItem('customer_profile', JSON.stringify(profile));
    setCustomer(profile);
  };

  // Validate token on mount
  useEffect(() => {
    if (!token) return;
    import('../services/customerApi').then(({ customerAuthApi }) => {
      customerAuthApi.getProfile().then(updateCustomer).catch(logout);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CustomerAuthContext.Provider
      value={{ token, customer, isAuthenticated: !!token && !!customer, login, logout, updateCustomer }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used inside CustomerAuthProvider');
  return ctx;
}
