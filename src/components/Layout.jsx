import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  LayoutGrid, Gavel, Car, Truck, LayoutDashboard, BarChart2,
  Trophy, Download, HelpCircle, Settings, SlidersHorizontal, FileText, Bell, Award, Wrench, ScrollText,
  LogOut, User,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(name) {
  const h = new Date().getHours();
  const salutation = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${salutation}, ${name}`;
}

// ─── Auction Status Bar ───────────────────────────────────────────────────────

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

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const { user, logout } = useAuth();
  const { data } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const [navExpanded, setNavExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [orgLogo, setOrgLogo] = useState(() => {
    try { return localStorage.getItem('org_logo') || null; } catch { return null; }
  });

  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync logo
  useEffect(() => {
    const onStorage = () => setOrgLogo(localStorage.getItem('org_logo') || null);
    window.addEventListener('storage', onStorage);
    onStorage();
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
    setNavExpanded(false);
  }, [location.pathname]);

  // ── Page title ──────────────────────────────────────────────────────────────
  const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/auction': 'Auction Floor',
    '/acquisitions': 'Acquisitions',
    '/manage': 'Manage Auction',
    '/repairs': 'Repairs',
    '/transport': 'Transport & Title',
    '/overview': 'GM Overview',
    '/wins': 'My Wins',
    '/admin': 'Admin',
    '/history': 'History',
    '/leaderboard': 'Leaderboard',
    '/export': 'Accounting Export',
    '/inventory': 'Inventory',
    '/help': 'Help',
  };
  const pageTitle = PAGE_TITLES[location.pathname] || 'Stockyard';
  const isHome = location.pathname === '/dashboard';

  // ── Nav definition ──────────────────────────────────────────────────────────
  const role = user.role;
  const activeListings = data.vehicles.filter(v => v.status === 'in_auction').length;
  const pendingAcq = data.vehicles.filter(v => ['intake', 'recon'].includes(v.status)).length;

  const ALL = ['bidder', 'wholesale', 'gm', 'admin'];
  const MGRS = ['wholesale', 'gm', 'admin'];

  const SECTIONS = [
    {
      label: 'Marketplace',
      items: [
        { to: '/dashboard', label: 'Dashboard',    Icon: LayoutDashboard, roles: ALL },
        { to: '/inventory', label: 'Inventory',    Icon: LayoutGrid,      roles: ALL, badge: activeListings || null },
        { to: '/auction',   label: 'Auction floor', Icon: Gavel,           roles: ALL },
      ],
    },
    {
      label: 'Operations',
      items: [
        { to: '/acquisitions', label: 'Acquisitions',  Icon: Car,      roles: MGRS, badge: pendingAcq || null },
        { to: '/repairs',      label: 'Repairs',        Icon: Wrench,   roles: MGRS },
        { to: '/transport',    label: 'Transport',      Icon: Truck,       roles: ALL },
        { to: '/titles',       label: 'Titles',         Icon: ScrollText,  roles: ALL },
        { to: '/manage',       label: 'Manage auction', Icon: SlidersHorizontal, roles: MGRS },
        { to: '/wins',         label: 'My wins',        Icon: Trophy,   roles: ['bidder'] },
      ],
    },
    {
      label: 'Reporting',
      items: [
        { to: '/overview',    label: 'GM overview',  Icon: BarChart2, roles: ['gm', 'admin', 'wholesale'] },
        { to: '/leaderboard', label: 'Leaderboard',  Icon: Award,     roles: ALL },
        { to: '/history',     label: 'History',      Icon: FileText,  roles: ALL },
        { to: '/export',      label: 'Export',       Icon: Download,  roles: MGRS },
      ],
    },
  ];

  const BOTTOM_ITEMS = [
    { to: '/help',  label: 'Help',  Icon: HelpCircle, roles: ALL },
    { to: '/admin', label: 'Admin', Icon: Settings,   roles: ['admin'] },
  ];

  const filterItems = items => items.filter(i => i.roles.includes(role));
  const navSections = SECTIONS
    .map(s => ({ ...s, items: filterItems(s.items) }))
    .filter(s => s.items.length > 0);
  const bottomItems = filterItems(BOTTOM_ITEMS);

  const showText = navExpanded || mobileOpen;
  const fullName = user.name || user.email || 'User';
  const firstName = fullName.split(' ')[0];
  const displayName = firstName;
  const avatarLetter = firstName[0].toUpperCase();

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleLogout = () => { logout(); navigate('/login'); };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* TOP BAR */}
      <header style={{
        height: 52,
        background: '#fff',
        borderBottom: '1px solid #e8eaed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
        zIndex: 300,
        position: 'relative',
      }}>
        {/* Left: hamburger + breadcrumb / greeting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(o => !o)}
            style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer', padding: '4px' }}
            aria-label="Menu"
          >
            ☰
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ color: '#9ca3af', fontWeight: 500 }}>Stockyard</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#0d2550', fontWeight: 700 }}>{pageTitle}</span>
          </div>
        </div>

        {/* Right: bell, help, divider, user avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

          {/* Notification bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setNotifOpen(o => !o); setUserMenuOpen(false); }}
              style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: notifOpen ? '#f0f2f5' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', position: 'relative' }}
            >
              <Bell size={18} />
              <span style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, background: '#ef4444', borderRadius: '50%', border: '2px solid #fff' }} />
            </button>
            {notifOpen && (
              <div style={{ position: 'absolute', top: 40, right: 0, width: 300, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 500, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 13, color: '#111827' }}>Notifications</div>
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                  <Bell size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>All caught up</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>No new notifications</div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/help')}
            style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}
            title="Help"
          >
            <HelpCircle size={18} />
          </button>

          <div style={{ width: 1, height: 20, background: '#e8eaed', margin: '0 4px' }} />

          {/* User avatar + dropdown */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <div
              onClick={() => { setUserMenuOpen(o => !o); setNotifOpen(false); }}
              style={{ width: 32, height: 32, borderRadius: '50%', background: '#e8b84b', color: '#0d2550', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, cursor: 'pointer', flexShrink: 0, border: userMenuOpen ? '2px solid #0d2550' : '2px solid transparent' }}
            >
              {avatarLetter}
            </div>
            {userMenuOpen && (
              <div style={{ position: 'absolute', top: 40, right: 0, width: 220, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 500, overflow: 'hidden' }}>
                {/* Profile header */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{displayName}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{user.email}</div>
                  <div style={{ display: 'inline-block', marginTop: 6, background: '#f0f4fb', color: '#0d2550', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {user.role}
                  </div>
                </div>
                {/* Menu items */}
                {['admin', 'wholesale', 'gm'].includes(role) && (
                  <button
                    onClick={() => { navigate('/admin'); setUserMenuOpen(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'none', border: 'none', fontSize: 13, color: '#374151', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Settings size={15} /> Settings
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'none', border: 'none', fontSize: 13, color: '#dc2626', cursor: 'pointer', textAlign: 'left', borderTop: '1px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* AUCTION STATUS BAR */}
      <AuctionStatusBar auction={data.auction} />

      {/* BODY */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={mobileOpen ? 'sidebar mobile-open' : 'sidebar'}
          onMouseEnter={() => setNavExpanded(true)}
          onMouseLeave={() => setNavExpanded(false)}
          style={{
            background: '#0d2550',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            zIndex: 250,
            overflow: 'hidden',
            width: showText ? 220 : 64,
            minWidth: showText ? 220 : 64,
            transition: 'width 200ms ease, min-width 200ms ease',
          }}
        >

          {/* Nav sections */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
            {navSections.map((section, si) => (
              <div key={section.label}>
                {si > 0 && (
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
                )}
                {showText && (
                  <div style={{ padding: '6px 14px 2px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '.08em', whiteSpace: 'nowrap' }}>
                    {section.label}
                  </div>
                )}
                {section.items.map(({ to, label, Icon, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className="nav-item"
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px',
                      margin: '1px 8px',
                      borderRadius: 8,
                      color: isActive ? '#e8b84b' : 'rgba(255,255,255,0.45)',
                      background: isActive ? 'rgba(232,184,75,0.12)' : 'transparent',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      transition: 'all 0.12s',
                      whiteSpace: 'nowrap',
                    })}
                  >
                    <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} />
                    </div>
                    {showText && <span style={{ flex: 1 }}>{label}</span>}
                    {showText && badge && (
                      <span style={{ background: 'rgba(232,184,75,0.2)', color: '#e8b84b', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
                        {badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom items */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 0 0' }}>
            {bottomItems.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className="nav-item"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px',
                  margin: '1px 8px',
                  borderRadius: 8,
                  color: isActive ? '#e8b84b' : 'rgba(255,255,255,0.45)',
                  background: isActive ? 'rgba(232,184,75,0.12)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                })}
              >
                <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} />
                </div>
                {showText && <span>{label}</span>}
              </NavLink>
            ))}
          </div>

          {/* User info footer */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e8b84b', color: '#0d2550', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                {avatarLetter}
              </div>
              {showText && (
                <div style={{ display: 'inline-block', background: 'rgba(232,184,75,0.15)', color: '#e8b84b', border: '1px solid rgba(232,184,75,0.3)', borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {user.role}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: '#f0f2f5', padding: '24px' }}>
          <Outlet />
        </main>
      </div>

      {/* CSS */}
      <style>{`
        .mobile-menu-btn { display: none !important; }

        .nav-item:hover {
          background: rgba(255,255,255,0.07) !important;
          color: rgba(255,255,255,0.85) !important;
        }

        @media (max-width: 767px) {
          .mobile-menu-btn { display: flex !important; }
          aside.sidebar {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 220px !important;
            min-width: 220px !important;
            transform: translateX(-100%);
            transition: transform 0.25s ease !important;
          }
          aside.sidebar.mobile-open {
            transform: translateX(0) !important;
          }
          main { padding: 16px !important; }
          .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .modal { margin: 8px !important; max-width: calc(100vw - 16px) !important; max-height: 90vh !important; }
          .modal-body { padding: 16px !important; }
        }

        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #e8eaed; }
        ::-webkit-scrollbar-thumb { background: #0d2550; border-radius: 4px; }
        *:focus-visible { outline: 2px solid #e8b84b; outline-offset: 2px; }
      `}</style>
    </div>
  );
}
