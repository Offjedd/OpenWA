import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Smartphone,
  Settings,
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import './CustomerLayout.css';

export function CustomerLayout() {
  const { customer, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/customer/login');
  };

  const navItems = [
    { to: '/customer', icon: <LayoutDashboard size={20} />, label: 'Dashboard', end: true },
    { to: '/customer/connect', icon: <Smartphone size={20} />, label: 'Connect WhatsApp' },
    { to: '/customer/conversations', icon: <MessageSquare size={20} />, label: 'Conversations' },
    { to: '/customer/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const initials = customer?.fullName
    ? customer.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="c-layout">
      {/* Mobile overlay */}
      {mobileOpen && <div className="c-layout__overlay" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`c-sidebar ${mobileOpen ? 'c-sidebar--open' : ''}`}>
        <div className="c-sidebar__header">
          <div className="c-sidebar__logo">
            <div className="c-sidebar__logo-icon">
              <MessageSquare size={22} />
            </div>
            <span>OpenWA</span>
          </div>
          <button className="c-sidebar__close" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="c-sidebar__nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `c-sidebar__link ${isActive ? 'c-sidebar__link--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="c-sidebar__footer">
          <div className="c-sidebar__user">
            <div className="c-sidebar__avatar">{initials}</div>
            <div className="c-sidebar__user-info">
              <span className="c-sidebar__user-name">{customer?.fullName}</span>
              <span className="c-sidebar__user-plan">
                {customer?.plan === 'premium' ? (
                  <><Wifi size={12} /> Premium</>
                ) : (
                  <><WifiOff size={12} /> Free plan</>
                )}
              </span>
            </div>
          </div>
          <button className="c-sidebar__logout" onClick={handleLogout} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="c-main">
        <header className="c-topbar">
          <button className="c-topbar__menu" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="c-topbar__logo">
            <div className="c-sidebar__logo-icon c-sidebar__logo-icon--sm">
              <MessageSquare size={18} />
            </div>
            <span>OpenWA</span>
          </div>
        </header>

        <main className="c-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
