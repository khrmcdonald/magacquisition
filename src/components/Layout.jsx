import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const NAV = {
  bidder: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/auction', label: 'Auction Floor', icon: '🔨' },
    { to: '/wins', label: 'My Wins', icon: '🏆' },
    { to: '/transport', label: 'Transport & Title', icon: '🚚' },
    { to: '/history', label: 'History', icon: '📜' },
    { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  ],
  wholesale: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/acquisitions', label: 'Acquisitions', icon: '📋' },
    { to: '/manage', label: 'Manage Auction', icon: '⚙️' },
    { to: '/transport', label: 'Transport & Title', icon: '🚚' },
    { to: '/history', label: 'History & Audit', icon: '📜' },
    { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { to: '/export', label: 'Accounting Export', icon: '📊' },
  ],
  gm: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/overview', label: 'GM Overview', icon: '📊' },
    { to: '/auction', label: 'Auction Floor', icon: '🔨' },
    { to: '/transport', label: 'Transport & Title', icon: '🚚' },
    { to: '/history', label: 'History & Audit', icon: '📜' },
    { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { to: '/export', label: 'Accounting Export', icon: '📊' },
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/admin', label: 'Admin', icon: '🔧' },
    { to: '/overview', label: 'GM Overview', icon: '📊' },
    { to: '/auction', label: 'Auction Floor', icon: '🔨' },
    { to: '/history', label: 'History & Audit', icon: '📜' },
    { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { to: '/export', label: 'Accounting Export', icon: '📊' },
  ],
};

function AuctionStatusBar({ auction }) {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const getCountdown = () => {
    if (!auction.closeDate) return null;
    const diff = new Date(auction.closeDate) - now;
    if (diff <= 0) return 'Closing...';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s remaining`;
  };

  return (
    <div style={{
      background: auction.isOpen ? '#f1bb25' : '#e5e7eb',
      color: auction.isOpen ? '#1a3d76' : '#6b7280',
      padding: '6px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 12,
      fontWeight: 700,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: auction.isOpen ? '#1a3d76' : '#9ca3af',
          display: 'inline-block',
        }} />
        {auction.isOpen ? 'AUCTION OPEN' : 'AUCTION CLOSED'}
        {auction.label ? ` · ${auction.label}` : ''}
      </span>
      {auction.isOpen && auction.closeDate && (
        <span style={{ fontWeight: 600, opacity: 0.85 }}>{getCountdown()}</span>
      )}
      {!auction.isOpen && (
        <span style={{ fontWeight: 500 }}>Bidding is not active</span>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { data } = useData();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = NAV[user.role] || NAV.bidder;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeVehicles = data.vehicles.filter(v => v.status === 'active').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top bar */}
      <div style={{ background: '#1a3d76', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setMobileOpen(o => !o)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', padding: 4, lineHeight: 1 }}
          >
            ☰
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: '#f1bb25', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#1a3d76', fontWeight: 800, fontSize: 14 }}>M</span>
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '.02em' }}>
              MAG <span style={{ color: '#f1bb25' }}>Acquisition</span>
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {data.auction.isOpen && (
            <span style={{ background: 'rgba(241,187,37,0.2)', color: '#f1bb25', border: '1px solid rgba(241,187,37,0.4)', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
              {activeVehicles} cars live
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{user.id}</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{user.name}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.8)', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Auction status bar */}
      <AuctionStatusBar auction={data.auction} />

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Mobile overlay */}
        {mobileOpen && (
          <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150 }} />
        )}
        {/* Sidebar */}
        <aside style={{
          width: 220,
          background: '#1a3d76',
          minHeight: 'calc(100vh - 80px)',
          padding: '20px 0',
          flexShrink: 0,
          position: window.innerWidth < 768 ? 'fixed' : 'relative',
          top: window.innerWidth < 768 ? 56 : 'auto',
          left: 0,
          bottom: 0,
          zIndex: 160,
          transform: window.innerWidth < 768 ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          transition: 'transform 0.25s ease',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '0 12px', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {user.name}
            </span>
          </div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 16px',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '3px solid #f1bb25' : '3px solid transparent',
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                transition: 'all 0.15s',
                marginBottom: 2,
              })}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: 'clamp(16px, 3vw, 32px)', minWidth: 0, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
