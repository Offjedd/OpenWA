import React, { useEffect, useState } from 'react';
import { Outlet, useParams, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  TrendingUp,
  Calendar,
  Zap,
  Image,
  Bot,
  QrCode,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { useAgencyAuth } from '../hooks/useAgencyAuth';
import { supabase } from '../../lib/supabase';

interface SubAccount {
  id: string;
  name: string;
  agency_id: string;
  logo?: string;
}

interface Agency {
  id: string;
  name: string;
}

const SubAccountLayout: React.FC = () => {
  const { subAccountId } = useParams<{ subAccountId: string }>();
  const { user, signOut } = useAgencyAuth();
  const navigate = useNavigate();

  const [subAccount, setSubAccount] = useState<SubAccount | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!subAccountId) {
        setLoading(false);
        return;
      }

      try {
        // Load sub-account
        const { data: subAccountData, error: subAccountError } = await supabase
          .from('sub_accounts')
          .select('*')
          .eq('id', subAccountId)
          .single();

        if (subAccountError) throw subAccountError;

        setSubAccount(subAccountData);

        // Load agency
        if (subAccountData.agency_id) {
          const { data: agencyData, error: agencyError } = await supabase
            .from('agencies')
            .select('*')
            .eq('id', subAccountData.agency_id)
            .single();

          if (agencyError) throw agencyError;
          setAgency(agencyData);
        }
      } catch (error) {
        console.error('Error loading sub-account data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [subAccountId]);

  const handleLogout = async () => {
    await signOut();
    navigate('/agency/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: 'dashboard' },
    { label: 'Conversations', icon: MessageSquare, path: 'conversations' },
    { label: 'Contacts', icon: Users, path: 'contacts' },
    { label: 'Opportunities', icon: TrendingUp, path: 'opportunities' },
    { label: 'Calendar', icon: Calendar, path: 'calendar' },
    { label: 'Automations', icon: Zap, path: 'automations' },
    { label: 'Media', icon: Image, path: 'media' },
    { label: 'AI Agents', icon: Bot, path: 'ai-agents' },
    { label: 'QR Codes', icon: QrCode, path: 'qr-codes' },
    { label: 'Settings', icon: Settings, path: 'settings' },
  ];

  const getInitial = (name: string): string => {
    return name?.charAt(0).toUpperCase() || 'S';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f5f5f5' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Mobile Hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 40,
          backgroundColor: '#7c3aed',
          border: 'none',
          borderRadius: '6px',
          padding: '8px',
          cursor: 'pointer',
          color: 'white',
        }}
        className="mobile-menu-button"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div
        style={{
          width: '240px',
          backgroundColor: '#0a0a0a',
          color: '#e5e5e5',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          transition: 'margin-left 0.3s ease',
          marginLeft: sidebarOpen ? '0' : '-240px',
          position: 'fixed',
          height: '100vh',
          zIndex: 30,
        }}
        className="sidebar"
      >
        {/* Sidebar Top - Logo and Name */}
        <div style={{ padding: '20px', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: '600',
                color: 'white',
                flexShrink: 0,
              }}
            >
              {getInitial(subAccount?.name || '')}
            </div>
            <div style={{ minWidth: '0' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#e5e5e5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {subAccount?.name || 'Sub-Account'}
              </div>
              {agency && (
                <div style={{ fontSize: '12px', color: '#a3a3a3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {agency.name}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '16px 8px', overflow: 'auto' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const to = `/app/${subAccountId}/${item.path}`;

            return (
              <NavLink
                key={item.path}
                to={to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 12px',
                  borderRadius: '6px',
                  color: isActive ? 'white' : '#e5e5e5',
                  backgroundColor: isActive ? '#7c3aed' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? '600' : '500',
                  marginBottom: '4px',
                  transition: 'background-color 0.2s ease, color 0.2s ease',
                  cursor: 'pointer',
                  border: 'none',
                  ':hover': {
                    backgroundColor: isActive ? '#7c3aed' : '#1a1a1a',
                  },
                })}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Bottom - User Info and Actions */}
        <div style={{ padding: '16px', borderTop: '1px solid #1a1a1a' }}>
          {user && (
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: '12px', color: '#a3a3a3', marginBottom: '4px' }}>Logged in as</div>
              <div style={{ fontSize: '13px', color: '#e5e5e5', wordBreak: 'break-word' }}>
                {user.email}
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#e5e5e5',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'background-color 0.2s ease, border-color 0.2s ease',
              marginBottom: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1a1a1a';
              e.currentTarget.style.borderColor = '#444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#333';
            }}
          >
            <LogOut size={16} />
            Logout
          </button>

          <NavLink
            to="/agency"
            style={() => ({
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#e5e5e5',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'background-color 0.2s ease, border-color 0.2s ease',
              cursor: 'pointer',
              width: '100%',
              boxSizing: 'border-box',
            })}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1a1a1a';
              e.currentTarget.style.borderColor = '#444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#333';
            }}
          >
            <ChevronLeft size={16} />
            Back to Agency
          </NavLink>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f5f5f5',
          marginLeft: sidebarOpen ? '240px' : '0',
        }}
        className="main-content"
      >
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          <Outlet context={{ subAccountId, agency }} />
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'block',
            position: 'fixed',
            inset: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 20,
          }}
          className="mobile-overlay"
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            position: fixed !important;
            margin-left: ${sidebarOpen ? '0' : '-240px'} !important;
          }
          .main-content {
            margin-left: 0 !important;
          }
          .mobile-menu-button {
            display: flex !important;
          }
          .mobile-overlay {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export { SubAccountLayout };
export default SubAccountLayout;
