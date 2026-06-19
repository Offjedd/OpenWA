import { useEffect, useState } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { useAgencyAuth } from '../hooks/useAgencyAuth';
import { supabase } from '../../lib/supabase';
import type { Agency } from '../types';

export function AgencyLayout() {
  const { user, signOut } = useAgencyAuth();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadAgency = async () => {
      try {
        const { data, error } = await supabase
          .from('agencies')
          .select('*')
          .eq('owner_id', user.id)
          .single();

        if (error) {
          console.error('Error loading agency:', error);
        } else if (data) {
          setAgency(data as Agency);
        }
      } catch (err) {
        console.error('Error loading agency:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAgency();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
  };

  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    textDecoration: 'none',
    color: isActive ? 'white' : '#e5e5e5',
    backgroundColor: isActive ? '#7c3aed' : 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: isActive ? '600' : '500',
    transition: 'all 0.2s ease',
  } as React.CSSProperties);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '240px',
          backgroundColor: '#0a0a0a',
          color: '#e5e5e5',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1f1f1f',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '24px 16px', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#7c3aed', marginBottom: '8px' }}>
            AgencyOS
          </div>
          {agency && (
            <div style={{ fontSize: '12px', color: '#a0a0a0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {agency.name}
            </div>
          )}
          {loading && <div style={{ fontSize: '12px', color: '#666' }}>Loading...</div>}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '8px' }}>
          <NavLink to="/agency/dashboard" style={navLinkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/agency/sub-accounts" style={navLinkStyle}>
            Sub-Accounts
          </NavLink>
          <NavLink to="/agency/settings" style={navLinkStyle}>
            Settings
          </NavLink>
        </nav>

        {/* User Info & Logout */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #1f1f1f',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#a0a0a0', wordBreak: 'break-all' }}>
            {user?.email}
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 12px',
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed';
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: '#f5f5f5',
          }}
        >
          <Outlet context={{ agencyId: agency?.id }} />
        </div>
      </div>
    </div>
  );
}

export function useAgencyOutlet() {
  return useOutletContext<{ agencyId: string }>();
}
