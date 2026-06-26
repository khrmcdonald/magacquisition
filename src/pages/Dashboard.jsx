import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { USERS } from '../context/AuthContext';
import { StoreAvatar } from '../components/StoreAvatar';
import { getAgeFlag } from '../components/VehicleCard';

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

function StatCard({ label, value, sub, color, onClick }) {
  const accent = color || '#0d2550';
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', border: '1px solid #e5e7eb',
        borderTop: `3px solid ${accent}`,
        borderRadius: 10, padding: '12px 16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function AuctionBanner({ auction, navigate, role }) {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const getCountdown = () => {
    if (!auction.closeDate) return null;
    const diff = new Date(auction.closeDate) - now;
    if (diff <= 0) return 'Closing soon';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return `${d}d ${h}h ${m}m remaining`;
    if (h > 0) return `${h}h ${m}m ${s}s remaining`;
    return `${m}m ${s}s remaining`;
  };

  if (!auction.isOpen) return (
    <div style={{
      background: '#fff', border: '1px solid #e8eaed', borderRadius: 12,
      padding: '20px 24px', marginBottom: 24,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0f2f5', border: '1px solid #e8eaed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📅</div>
        <div>
          <div style={{ fontWeight: 700, color: '#0d2550', fontSize: 15 }}>No auction currently open</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>Tri-State will announce the next auction date</div>
        </div>
      </div>
      {['wholesale','gm','admin'].includes(role) && (
        <button onClick={() => navigate('/manage')} style={{ background: '#0d2550', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Open auction →
        </button>
      )}
    </div>
  );

  return (
    <div
      onClick={() => navigate('/auction')}
      style={{ background: '#0d2550', borderRadius: 12, padding: '20px 24px', marginBottom: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#f1bb25', boxShadow: '0 0 8px #f1bb25', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 800, color: '#fff', fontSize: 16 }}>🔨 Auction is OPEN — {auction.label}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{getCountdown()}</div>
        </div>
      </div>
      <div style={{ background: '#e8b84b', color: '#0d2550', padding: '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
        Go to auction floor →
      </div>
    </div>
  );
}

// ── BIDDER DASHBOARD ──
function BidderDashboard({ user, data, navigate, role }) {
  const myWins = data.vehicles.filter(v => v.status === 'awarded' && v.winnerId === user.id);
  const myBids = data.bids.filter(b => b.storeId === user.id);
  const activeVehicles = data.vehicles.filter(v => v.status === 'in_auction');
  const myActiveBids = myBids.filter(b => data.vehicles.find(v => v.id === b.vehicleId && v.status === 'in_auction'));
  const winning = myActiveBids.filter(b => {
    const v = data.vehicles.find(vv => vv.id === b.vehicleId);
    const allBids = data.bids.filter(bb => bb.vehicleId === b.vehicleId);
    const high = Math.max(...allBids.map(bb => bb.amount));
    return b.amount >= high;
  });
  const myTransport = data.transport.filter(t => t.storeId === user.id);
  const incoming = myTransport.filter(t => !['arrived','titleReceived'].includes(t.status));
  const openArbitrations = myWins.filter(v => v.arbitration?.status === 'open');
  const totalSpend = myWins.reduce((s, v) => s + (v.winningBid || 0), 0);

  return (
    <>
      <AuctionBanner auction={data.auction} navigate={navigate} role={role} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Cars won" value={myWins.length} sub="all time" onClick={() => navigate('/wins')} />
        <StatCard label="Total spend" value={`$${(totalSpend/1000).toFixed(0)}k`} sub="winning bids" color="#0d2550" />
        <StatCard label="Active bids" value={myActiveBids.length} sub={`${winning.length} winning`} color={winning.length > 0 ? '#065f46' : '#0d2550'} onClick={() => navigate('/auction')} />
        <StatCard label="Incoming" value={incoming.length} sub="in transit" color={incoming.length > 0 ? '#0369a1' : '#9ca3af'} onClick={() => navigate('/transport')} />
        {openArbitrations.length > 0 && (
          <StatCard label="Arbitrations" value={openArbitrations.length} sub="pending review" color="#991b1b" onClick={() => navigate('/wins')} />
        )}
      </div>

      {/* Active bids on live vehicles */}
      {data.auction.isOpen && activeVehicles.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 12 }}>Live auction — {activeVehicles.length} cars</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {activeVehicles.slice(0, 6).map(v => {
              const myBid = data.bids.find(b => b.vehicleId === v.id && b.storeId === user.id);
              const allBids = data.bids.filter(b => b.vehicleId === v.id);
              const highBid = allBids.length ? Math.max(...allBids.map(b => b.amount)) : null;
              const isWinning = myBid && highBid && myBid.amount >= highBid;
              return (
                <div key={v.id} onClick={() => navigate('/auction')} style={{ background: '#fff', border: `1px solid ${isWinning ? '#0d2550' : myBid ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 56, height: 42, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {v.photos?.[0] ? <img src={v.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>🚗</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.year} {v.make} {v.model}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{parseInt(v.mileage||0).toLocaleString()} mi</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>High bid</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0d2550' }}>{highBid ? `$${highBid.toLocaleString()}` : 'No bids'}</div>
                    {myBid && <div style={{ fontSize: 11, fontWeight: 700, color: isWinning ? '#065f46' : '#991b1b' }}>{isWinning ? '✓ Winning' : '✗ Outbid'}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Incoming vehicles */}
      {myTransport.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 12 }}>Your vehicles</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myTransport.slice(0, 4).map(t => {
              const v = data.vehicles.find(vv => vv.id === t.vehicleId);
              const statusLabel = { awarded: '⏳ Pending dispatch', dispatched: '📦 Dispatched', inTransit: '🚚 In transit', arrived: '✅ Arrived', titleReceived: '📄 Complete' };
              return (
                <div key={t.id} onClick={() => navigate('/transport')} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {v?.photos?.[0] ? <img src={v.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16 }}>🚗</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.vehicleName}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{statusLabel[t.status] || '⏳ Pending'}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2550' }}>${t.winningBid?.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ── TODAY'S WORK ──
function TodaysTasks({ data, navigate }) {
  const ros = data.repairOrders || [];
  const transport = data.transport || [];
  const vehicles = data.vehicles || [];

  const openRepairs = ros.filter(r => ['draft','pending','pending_approval','in_progress'].includes(r.status));
  const openTransport = transport.filter(t => !['arrived','titleReceived'].includes(t.status));
  const titleNeeded = vehicles.filter(v => {
    const ts = v.title_tracker?.status;
    // show if tracker is in an early stage OR titleStatus needs attention
    return ['pending','awaiting_pickup','in_hand'].includes(ts)
      || (!ts && ['pending','lien','missing','in_transit'].includes(v.titleStatus));
  });

  const tasks = [
    openRepairs.length > 0 && {
      count: openRepairs.length,
      label: 'open repair order' + (openRepairs.length !== 1 ? 's' : ''),
      detail: openRepairs.map(r => {
        const v = vehicles.find(vv => vv.id === r.vehicleId);
        return v ? `${v.year} ${v.make} ${v.model}` : null;
      }).filter(Boolean).slice(0, 3).join(', '),
      accent: '#3b82f6',
      onClick: () => navigate('/repairs'),
    },
    openTransport.length > 0 && {
      count: openTransport.length,
      label: 'open transport' + (openTransport.length !== 1 ? 's' : ''),
      detail: openTransport.map(t => t.vehicleName || '—').slice(0, 3).join(', '),
      accent: '#e8b84b',
      onClick: () => navigate('/transport'),
    },
    titleNeeded.length > 0 && {
      count: titleNeeded.length,
      label: 'title' + (titleNeeded.length !== 1 ? 's' : '') + ' in progress',
      detail: titleNeeded.map(v => `${v.year} ${v.make} ${v.model}`).slice(0, 3).join(', '),
      accent: '#8b5cf6',
      onClick: () => navigate('/acquisitions'),
    },
  ].filter(Boolean);

  if (tasks.length === 0) return (
    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 16 }}>✓</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>All caught up — nothing needs attention right now.</span>
    </div>
  );

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Needs Attention</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map((task, i) => (
          <div key={i} onClick={task.onClick} style={{
            background: '#fff', border: '1px solid #e5e7eb',
            borderLeft: `4px solid ${task.accent}`,
            borderRadius: 10, padding: '12px 16px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
            transition: 'box-shadow 0.12s',
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, background: task.accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: task.accent, lineHeight: 1 }}>{task.count}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{task.count} {task.label}</div>
              {task.detail && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.detail}</div>}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>Go →</div>
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
  const pendingTitles = data.vehicles.filter(v => ['pending','in_transit','lien','missing'].includes(v.titleStatus));
  const totalVolume = data.vehicles.filter(v => v.status === 'awarded').reduce((s, v) => s + (v.winningBid || 0), 0);
  const recentVehicles = [...data.vehicles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <>
      <AuctionBanner auction={data.auction} navigate={navigate} role={role} />
      <AgedInventorySummary vehicles={data.vehicles} navigate={navigate} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Total inventory" value={total} sub="all vehicles" onClick={() => navigate('/acquisitions')} />
        <StatCard label="Ready to list" value={ready} sub="auction ready" color={ready > 0 ? '#065f46' : '#9ca3af'} onClick={() => navigate('/acquisitions')} />
        <StatCard label="Live now" value={live} sub="in auction" color={live > 0 ? '#1e40af' : '#9ca3af'} onClick={() => navigate('/manage')} />
        <StatCard label="Awarded" value={awarded} sub={`$${(totalVolume/1000).toFixed(0)}k volume`} color="#0d2550" onClick={() => navigate('/acquisitions')} />
        <StatCard label="In recon" value={inRecon} sub="being prepped" color="#92400e" onClick={() => navigate('/acquisitions')} />
        {openArbitrations.length > 0 && <StatCard label="Arbitrations" value={openArbitrations.length} sub="need review" color="#991b1b" onClick={() => navigate('/acquisitions')} />}
        {pendingTitles.length > 0 && <StatCard label="Title issues" value={pendingTitles.length} sub="need attention" color="#92400e" onClick={() => navigate('/acquisitions')} />}
      </div>

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
      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 12 }}>Recent inventory</div>
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

// ── GM DASHBOARD ──
function GMDashboard({ data, navigate, role }) {
  const STORES = USERS.filter(u => u.role === 'bidder');
  const awarded = data.vehicles.filter(v => v.status === 'awarded');
  const totalVolume = awarded.reduce((s, v) => s + (v.winningBid || 0), 0);
  const totalCost = awarded.reduce((s, v) => s + (parseFloat(v.totalCost) || 0), 0);
  const totalMargin = totalVolume - totalCost;
  const openArbitrations = data.vehicles.filter(v => v.arbitration?.status === 'open').length;

  const storeSummary = STORES.map(store => {
    const wins = awarded.filter(v => v.winnerId === store.id);
    const spend = wins.reduce((s, v) => s + (v.winningBid || 0), 0);
    const bids = data.bids.filter(b => b.storeId === store.id).length;
    return { ...store, wins: wins.length, spend, bids };
  }).sort((a, b) => b.spend - a.spend);

  return (
    <>
      <AuctionBanner auction={data.auction} navigate={navigate} role={role} />
      <AgedInventorySummary vehicles={data.vehicles} navigate={navigate} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Total inventory" value={data.vehicles.length} sub="all vehicles" onClick={() => navigate('/acquisitions')} />
        <StatCard label="Awarded" value={awarded.length} sub="cars sold" color="#0d2550" onClick={() => navigate('/acquisitions')} />
        <StatCard label="Bid volume" value={`$${(totalVolume/1000).toFixed(0)}k`} sub="total awarded" color="#0d2550" />
        <StatCard label="Group margin" value={`$${(totalMargin/1000).toFixed(0)}k`} sub="vs cost basis" color={totalMargin >= 0 ? '#065f46' : '#991b1b'} />
        <StatCard label="Total bids" value={data.bids.length} sub="all stores" onClick={() => navigate('/auction')} />
        {openArbitrations > 0 && <StatCard label="Arbitrations" value={openArbitrations} sub="open" color="#991b1b" onClick={() => navigate('/acquisitions')} />}
      </div>

      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 12 }}>Store performance</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {storeSummary.map(store => (
          <div key={store.id} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
            overflow: 'hidden', cursor: 'pointer',
            display: 'flex',
            transition: 'box-shadow 0.15s',
          }}
            onClick={() => navigate('/acquisitions')}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.07)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            {/* Left accent bar */}
            <div style={{ width: 4, background: store.color || '#0d2550', flexShrink: 0 }} />
            <div style={{ padding: '16px 20px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <StoreAvatar storeId={store.id} size={36} />
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{store.name}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[['Cars won', store.wins, '#0d2550'], ['Spend', `$${(store.spend/1000).toFixed(0)}k`, '#065f46'], ['Bids', store.bids, '#1e40af']].map(([l, v, c]) => (
                  <div key={l} style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: `2px solid ${c}`, borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: c }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
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

      {user.role === 'bidder' && <BidderDashboard user={user} data={data} navigate={navigate} role={user.role} />}
      {user.role === 'wholesale' && <TriStateDashboard data={data} navigate={navigate} role={user.role} />}
      {(user.role === 'gm' || user.role === 'admin') && <GMDashboard data={data} navigate={navigate} role={user.role} />}
    </div>
  );
}
