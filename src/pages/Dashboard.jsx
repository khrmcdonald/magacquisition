import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { getAgeFlag } from '../components/VehicleCard';
import MonthPaceChart, { computeMonthPace } from '../components/MonthPaceChart';

function AgedInventorySummary({ vehicles, navigate }) {
  const aging    = vehicles.filter(v => getAgeFlag(v)?.label === 'Aging').length;
  const atRisk   = vehicles.filter(v => getAgeFlag(v)?.label === 'At Risk').length;
  const liquidate = vehicles.filter(v => getAgeFlag(v)?.label === 'Liquidate').length;

  if (!aging && !atRisk && !liquidate) return null;

  const items = [
    { label: 'Aging',     count: aging,    color: '#78350f', bg: '#fef9c3', border: '#fde68a' },
    { label: 'At Risk',   count: atRisk,   color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
    { label: 'Liquidate', count: liquidate, color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
  ].filter(i => i.count > 0);

  return (
    <div
      onClick={() => navigate('/acquisitions')}
      style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
        padding: '14px 20px', marginBottom: 20, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', flexShrink: 0 }}>
        ⏱ Aged inventory
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {items.map(i => (
          <span key={i.label} style={{
            background: i.bg, color: i.color, border: `1px solid ${i.border}`,
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          }}>
            {i.count} {i.label}
          </span>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>
        View in Acquisitions →
      </div>
    </div>
  );
}

function DeskPaceSummary({ vehicles, orgSettings, navigate }) {
  const monthlyOverhead = orgSettings?.monthlyOverhead ?? 60000;
  const verified = vehicles.filter(v => v.status === 'sold' && v.soldPrice != null);
  const { ahead, actualToday, unitsMTD } = computeMonthPace(verified, monthlyOverhead);

  return (
    <div
      onClick={() => navigate('/performance')}
      style={{
        background: '#fff', border: `1px solid ${ahead ? '#bbf7d0' : '#fecaca'}`, borderRadius: 12,
        padding: '14px 20px', marginBottom: 20, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ahead ? '#065f46' : '#991b1b', marginBottom: 2 }}>
          {ahead ? 'Ahead of pace' : 'Behind pace'} to cover overhead this month
        </div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          ${Math.round(actualToday).toLocaleString()} made so far · {unitsMTD} sold this month
        </div>
      </div>
      <div style={{ width: 160, flexShrink: 0 }}>
        <MonthPaceChart vehicles={verified} monthlyOverhead={monthlyOverhead} height={44} compact />
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>
        Full desk performance →
      </div>
    </div>
  );
}

const TRANSPORT_STATUS_LABEL = {
  awarded:    { label: 'Pending dispatch', color: '#92400e', bg: '#fef3c7' },
  dispatched: { label: 'Dispatched',       color: '#1e40af', bg: '#dbeafe' },
  inTransit:  { label: 'In Transit',       color: '#0369a1', bg: '#e0f2fe' },
};
const TITLE_OUT_BADGE = { label: 'Title OUT', color: '#991b1b', bg: '#fee2e2' };

// ── NEEDS ATTENTION ──
function TodaysTasks({ data, navigate }) {
  const ros = data.repairOrders || [];
  const transport = data.transport || [];
  const vehicles = data.vehicles || [];

  const repairItems = ros
    .filter(r => ['draft','pending','pending_approval','in_progress'].includes(r.status))
    .map(r => {
      const v = vehicles.find(vv => vv.id === r.vehicleId);
      const badge = { draft: 'Pending', pending: 'Pending', pending_approval: 'Approval', in_progress: 'In Progress' }[r.status];
      const badgeColor = r.status === 'pending_approval' ? { color: '#1e40af', bg: '#dbeafe' } : r.status === 'in_progress' ? { color: '#065f46', bg: '#d1fae5' } : { color: '#92400e', bg: '#fef3c7' };
      return { id: r.id, primary: v ? `${v.year} ${v.make} ${v.model}` : 'Unknown', secondary: r.lines?.[0]?.description || null, badge, badgeColor, route: '/repairs' };
    });

  const transportItems = transport
    .filter(t => !['arrived','titleReceived'].includes(t.status) && t.storeName !== 'Intake')
    .map(t => {
      const st = TRANSPORT_STATUS_LABEL[t.status] || { label: 'Pending', color: '#92400e', bg: '#fef3c7' };
      return { id: t.id, primary: t.vehicleName || 'Unknown', secondary: t.storeName ? `→ ${t.storeName}` : null, badge: st.label, badgeColor: st, route: '/transport' };
    });

  const intakeItems = transport
    .filter(t => t.storeName === 'Intake' && !['arrived','titleReceived'].includes(t.status))
    .map(t => ({ id: t.id, primary: t.vehicleName || 'Unknown', secondary: t.notes || 'Pickup pending', badge: 'Intake pickup', badgeColor: { color: '#92400e', bg: '#fef3c7' }, route: '/transport' }));

  const titleItems = vehicles
    .filter(v => v.titleStatus !== 'in' && v.titleStatus !== 'clear' && v.status !== 'sold')
    .sort((a, b) => {
      const da = a.datePurchased ? new Date(a.datePurchased + 'T12:00:00') : new Date(a.createdAt);
      const db = b.datePurchased ? new Date(b.datePurchased + 'T12:00:00') : new Date(b.createdAt);
      return da - db;
    })
    .map(v => {
      const days = v.datePurchased ? Math.floor((Date.now() - new Date(v.datePurchased + 'T12:00:00')) / 86400000) : null;
      const dest = v.status === 'awarded' ? `→ ${v.winnerName}` : null;
      return { id: v.id, primary: `${v.year} ${v.make} ${v.model}`, secondary: dest || (days !== null ? `${days}d waiting` : null), badge: 'Title OUT', badgeColor: TITLE_OUT_BADGE, route: '/titles' };
    });

  const inspectionItems = vehicles
    .filter(v => v.status === 'inspection' && v.inspection?.status !== 'complete')
    .map(v => ({ id: v.id, primary: `${v.year} ${v.make} ${v.model}`, secondary: null, badge: 'Pending', badgeColor: { color: '#92400e', bg: '#fef3c7' }, route: '/acquisitions' }));

  const CARDS = [
    { key: 'titles',     label: 'Titles',          accent: '#8b5cf6', emoji: '📄', items: titleItems,      route: '/titles' },
    { key: 'transport',  label: 'Deliveries',       accent: '#e8b84b', emoji: '🚚', items: transportItems,  route: '/transport' },
    { key: 'intake',     label: 'Intake pickups',   accent: '#f59e0b', emoji: '📦', items: intakeItems,     route: '/transport' },
    { key: 'repairs',    label: 'Repairs',          accent: '#3b82f6', emoji: '🔧', items: repairItems,     route: '/repairs' },
    { key: 'inspection', label: 'Inspection',       accent: '#10b981', emoji: '🔍', items: inspectionItems, route: '/acquisitions' },
  ].filter(c => c.items.length > 0);

  if (!CARDS.length) return (
    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 16 }}>✓</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>All caught up — nothing needs attention right now.</span>
    </div>
  );

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 14 }}>Needs Attention</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {CARDS.map(card => (
          <div key={card.key} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: card.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{card.label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: card.accent, background: card.accent + '18', borderRadius: 10, padding: '1px 8px', minWidth: 18, textAlign: 'center' }}>
                  {card.items.length}
                </span>
              </div>
              <button onClick={() => navigate(card.route)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#9ca3af', cursor: 'pointer', fontWeight: 600, padding: 0, whiteSpace: 'nowrap' }}>
                View all →
              </button>
            </div>
            {/* Top 4 items */}
            <div style={{ flex: 1 }}>
              {card.items.slice(0, 4).map((item, i) => (
                <div key={item.id || i} onClick={() => navigate(card.route)}
                  style={{ padding: '10px 16px', borderTop: i > 0 ? '1px solid #f9fafb' : 'none', cursor: 'pointer', transition: 'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 3 }}>{item.primary}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: item.badgeColor.color, background: item.badgeColor.bg, padding: '2px 8px', borderRadius: 20 }}>
                      {item.badge}
                    </span>
                    {item.secondary && <span style={{ fontSize: 11, color: '#9ca3af' }}>{item.secondary}</span>}
                  </div>
                </div>
              ))}
              {card.items.length > 4 && (
                <div onClick={() => navigate(card.route)} style={{ padding: '8px 16px', fontSize: 12, color: '#9ca3af', fontWeight: 600, cursor: 'pointer', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
                  +{card.items.length - 4} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TRISTATE DASHBOARD ──
function TriStateDashboard({ data, navigate, role }) {
  const total = data.vehicles.length;
  const inRecon = data.vehicles.filter(v => v.status === 'recon').length;
  const ready = data.vehicles.filter(v => v.status === 'ready').length;
  const live = data.vehicles.filter(v => v.status === 'in_auction').length;
  const awarded = data.vehicles.filter(v => v.status === 'awarded').length;
  const openArbitrations = data.vehicles.filter(v => v.arbitration?.status === 'open');
  const pendingTitles = data.vehicles.filter(v => v.titleStatus !== 'in' && v.titleStatus !== 'clear' && v.status !== 'sold');
  const totalVolume = data.vehicles.filter(v => v.status === 'awarded').reduce((s, v) => s + (v.winningBid || 0), 0);
  const recentVehicles = [...data.vehicles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <>
      <DeskPaceSummary vehicles={data.vehicles} orgSettings={data.orgSettings} navigate={navigate} />
      <AgedInventorySummary vehicles={data.vehicles} navigate={navigate} />

      {/* Open arbitrations alert */}
      {openArbitrations.length > 0 && (
        <div style={{ background: '#fee2e2', border: '2px solid #fca5a5', borderRadius: 12, padding: '16px 20px', marginBottom: 20, cursor: 'pointer' }} onClick={() => navigate('/acquisitions')}>
          <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>⚠ {openArbitrations.length} open arbitration{openArbitrations.length > 1 ? 's' : ''} — review required</div>
          {openArbitrations.map(v => (
            <div key={v.id} style={{ fontSize: 13, color: '#7f1d1d', marginBottom: 4 }}>
              {v.year} {v.make} {v.model} — {v.arbitration.storeName}: {v.arbitration.issueType}
            </div>
          ))}
        </div>
      )}

      {/* Recent inventory */}
      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 12 }}>Recent inventory</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recentVehicles.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 14, padding: '20px 0' }}>No vehicles yet — <span style={{ color: '#0d2550', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/acquisitions')}>add your first vehicle</span></div>
        ) : recentVehicles.map(v => {
          const stMap = { intake: { label: 'Intake', color: '#6b7280', bg: '#f3f4f6' }, recon: { label: 'In Recon', color: '#92400e', bg: '#fef3c7' }, ready: { label: 'Ready', color: '#065f46', bg: '#d1fae5' }, in_auction: { label: 'Live', color: '#1e40af', bg: '#dbeafe' }, awarded: { label: 'Awarded', color: '#065f46', bg: '#d1fae5' }, no_sale: { label: 'No Sale', color: '#991b1b', bg: '#fee2e2' } };
          const st = stMap[v.status] || stMap.intake;
          return (
            <div key={v.id} onClick={() => navigate('/acquisitions')} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 42, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {v.photos?.[0] ? <img src={v.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>🚗</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{v.year} {v.make} {v.model}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{v.color} · {parseInt(v.mileage||0).toLocaleString()} mi · {v.source}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {v.totalCost && <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2550' }}>${parseFloat(v.totalCost).toLocaleString()}</div>}
                <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{st.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── MAIN EXPORT ──
export default function Dashboard() {
  const { user } = useAuth();
  const { data } = useData();
  const navigate = useNavigate();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#e8b84b', color: '#0d2550', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>
          {(user.name || user.email || '?')[0].toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{greeting()}, {(user.name || '').split(' ')[0] || user.email} 👋</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      <TodaysTasks data={data} navigate={navigate} />

      <TriStateDashboard data={data} navigate={navigate} role={user.role} />
    </div>
  );
}
