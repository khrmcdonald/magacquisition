import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { StoreAvatar } from './StoreAvatar';

const NAV = {
  bidder: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/auction', label: 'Auction Floor', icon: '🔨' },
    { to: '/wins', label: 'My Wins', icon: '🏆' },
    { to: '/transport', label: 'Transport & Title', icon: '🚚' },
    { to: '/leaderboard', label: 'Leaderboard', icon: '🏅' },
    { to: '/history', label: 'History', icon: '📜' },
  ],
  wholesale: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/acquisitions', label: 'Acquisitions', icon: '📋' },
    { to: '/manage', label: 'Manage Auction', icon: '⚙️' },
    { to: '/transport', label: 'Transport & Title', icon: '🚚' },
    { to: '/leaderboard', label: 'Leaderboard', icon: '🏅' },
    { to: '/history', label: 'History & Audit', icon: '📜' },
    { to: '/export', label: 'Accounting Export', icon: '📊' },
  ],
  gm: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/overview', label: 'GM Overview', icon: '📊' },
    { to: '/auction', label: 'Auction Floor', icon: '🔨' },
    { to: '/transport', label: 'Transport & Title', icon: '🚚' },
    { to: '/leaderboard', label: 'Leaderboard', icon: '🏅' },
    { to: '/history', label: 'History & Audit', icon: '📜' },
    { to: '/export', label: 'Accounting Export', icon: '📊' },
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/admin', label: 'Admin', icon: '🔧' },
    { to: '/overview', label: 'GM Overview', icon: '📊' },
    { to: '/auction', label: 'Auction Floor', icon: '🔨' },
    { to: '/leaderboard', label: 'Leaderboard', icon: '🏅' },
    { to: '/history', label: 'History & Audit', icon: '📜' },
    { to: '/export', label: 'Accounting Export', icon: '📊' },
  ],
};

function AuctionStatusBar({ auction }) {
  const [now, setNow] = React.useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const getCountdown = () => {
    if (!auction.closeDate) return null;
    const diff = new Date(auction.closeDate) - now;
    if (diff <= 0) return 'Closing...';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return `${d}d ${h}h remaining`;
    if (h > 0) return `${h}h ${m}m remaining`;
    return `${m}m ${s}s remaining`;
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
      flexShrink: 0,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: auction.isOpen ? '#1a3d76' : '#9ca3af', display: 'inline-block' }} />
        {auction.isOpen ? 'AUCTION OPEN' : 'AUCTION CLOSED'}
        {auction.label ? ` · ${auction.label}` : ''}
      </span>
      {auction.isOpen && auction.closeDate && (
        <span style={{ fontWeight: 600, opacity: 0.85 }}>{getCountdown()}</span>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { data } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const navItems = NAV[user.role] || NAV.bidder;
  const activeVehicles = data.vehicles.filter(v => v.status === 'active').length;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: '100vw', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{
        background: '#1a3d76',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 52,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 300,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setMobileOpen(o => !o)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: '4px 6px', lineHeight: 1, flexShrink: 0 }}
            aria-label="Menu"
          >☰</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: '#f1bb25', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#1a3d76', fontWeight: 800, fontSize: 13 }}>M</span>
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>
              MAG <span style={{ color: '#f1bb25' }}>Acquisition</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {data.auction.isOpen && (
            <span style={{ background: 'rgba(241,187,37,0.2)', color: '#f1bb25', border: '1px solid rgba(241,187,37,0.4)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {activeVehicles} live
            </span>
          )}
          <StoreAvatar storeId={user.id} size={28} />
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.8)', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >Out</button>
        </div>
      </div>

      {/* Auction status bar */}
      <AuctionStatusBar auction={data.auction} />

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, top: 52 }}
          />
        )}

        {/* Sidebar */}
        <aside style={{
          width: 220,
          background: '#1a3d76',
          flexShrink: 0,
          padding: '16px 0',
          overflowY: 'auto',
          // On mobile: fixed slide-in panel
          position: 'fixed',
          top: 52,
          bottom: 0,
          left: 0,
          zIndex: 250,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          // On desktop: always visible (override via CSS)
        }}>
          <div style={{ padding: '0 12px 8px', opacity: 0.5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {user.name}
            </span>
          </div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '3px solid #f1bb25' : '3px solid transparent',
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              })}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </aside>

        {/* Main content */}
        <main style={{
          flex: 1,
          padding: '20px 16px',
          overflowY: 'auto',
          overflowX: 'hidden',
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <Outlet />
        </main>
      </div>

      {/* Desktop sidebar CSS override */}
      <style>{`
        @media (min-width: 768px) {
          aside {
            position: relative !important;
            top: auto !important;
            transform: none !important;
            flex-shrink: 0 !important;
          }
          main {
            padding: 28px 32px !important;
          }
        }
        @media (max-width: 767px) {
          .stat-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .modal {
            margin: 8px !important;
            max-width: calc(100vw - 16px) !important;
            max-height: 90vh !important;
          }
          .modal-body {
            padding: 16px !important;
          }
          h1 { font-size: 18px !important; }
          .page-header h1 { font-size: 18px !important; }
          table { font-size: 12px; }
          thead th { padding: 8px 6px !important; font-size: 10px !important; }
          tbody td { padding: 8px 6px !important; }
        }
      `}</style>
    </div>
  );
}
