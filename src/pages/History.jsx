import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { USERS } from '../context/AuthContext';

const STORES = USERS.filter(u => u.role === 'bidder');

function fmt(val) { return val ? `$${parseFloat(val).toLocaleString()}` : '—'; }
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function History() {
  const { user } = useAuth();
  const { data } = useData();

  const isWholesale = user.role === 'wholesale';
  const isGM = user.role === 'gm' || user.role === 'admin';
  const isBidder = user.role === 'bidder';

  const [storeFilter, setStoreFilter] = useState(isBidder ? user.id : 'all');
  const [tab, setTab] = useState('vehicles');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // All bids
  const allBids = data.bids;

  // Filter bids by store
  const filteredBids = allBids.filter(b => {
    if (storeFilter !== 'all' && b.storeId !== storeFilter) return false;
    if (search && !`${b.storeName}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Filter vehicles
  const filteredVehicles = data.vehicles.filter(v => {
    const name = `${v.year} ${v.make} ${v.model} ${v.vin}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (storeFilter !== 'all' && v.winnerId !== storeFilter && tab !== 'vehicles') return false;
    if (dateFrom && v.createdAt && new Date(v.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && v.createdAt && new Date(v.createdAt) > new Date(dateTo)) return false;
    return true;
  });

  // Store summary stats
  const storeSummary = STORES.map(store => {
    const won = data.vehicles.filter(v => v.winnerId === store.id && v.status === 'awarded');
    const bids = data.bids.filter(b => b.storeId === store.id);
    const lost = bids.filter(b => {
      const v = data.vehicles.find(vv => vv.id === b.vehicleId);
      return v && v.status === 'awarded' && v.winnerId !== store.id;
    });
    const transport = data.transport.filter(t => t.storeId === store.id);
    const delivered = transport.filter(t => ['arrived', 'titleReceived'].includes(t.status));
    const totalSpend = won.reduce((s, v) => s + (v.winningBid || 0), 0);
    return { ...store, won: won.length, bids: bids.length, lost: lost.length, delivered: delivered.length, totalSpend, wonVehicles: won };
  });

  const myStore = isBidder ? storeSummary.find(s => s.id === user.id) : null;

  // Transport history
  const filteredTransport = data.transport.filter(t => {
    if (storeFilter !== 'all' && t.storeId !== storeFilter) return false;
    if (search) {
      const name = `${t.vehicleName} ${t.storeName}`.toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const tabs = isBidder
    ? [['vehicles', 'Cars I Won'], ['bids', 'My Bid History'], ['transport', 'Transport & Title']]
    : [['vehicles', 'All Vehicles'], ['bids', 'All Bids'], ['transport', 'Transport & Title'], ['stores', 'By Store']];

  return (
    <div>
      <div className="page-header">
        <h1>History & Audit Log</h1>
        <p>{isBidder ? `Complete record for ${user.name}` : 'Full group history — every vehicle, bid, and delivery'}</p>
      </div>

      {/* My store summary for bidders */}
      {isBidder && myStore && (
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Cars won</div>
            <div className="stat-value" style={{ color: '#1a3d76' }}>{myStore.won}</div>
            <div className="stat-sub">all time</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total spend</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{fmt(myStore.totalSpend)}</div>
            <div className="stat-sub">winning bids</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Bids placed</div>
            <div className="stat-value">{myStore.bids}</div>
            <div className="stat-sub">across all auctions</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Delivered</div>
            <div className="stat-value" style={{ color: '#065f46' }}>{myStore.delivered}</div>
            <div className="stat-sub">arrived at store</div>
          </div>
        </div>
      )}

      {/* GM/Wholesale summary */}
      {!isBidder && (
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Total vehicles</div>
            <div className="stat-value">{data.vehicles.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Awarded</div>
            <div className="stat-value" style={{ color: '#065f46' }}>{data.vehicles.filter(v => v.status === 'awarded').length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">No sale</div>
            <div className="stat-value" style={{ color: '#991b1b' }}>{data.vehicles.filter(v => v.status === 'no_sale').length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total bids placed</div>
            <div className="stat-value">{data.bids.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Vehicles in transit</div>
            <div className="stat-value">{data.transport.filter(t => !['arrived','titleReceived'].includes(t.status)).length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Fully delivered</div>
            <div className="stat-value" style={{ color: '#065f46' }}>{data.transport.filter(t => t.status === 'titleReceived').length}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={{ marginBottom: 5 }}>Search</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="VIN, make, model, store..." />
        </div>
        {!isBidder && (
          <div style={{ minWidth: 160 }}>
            <label style={{ marginBottom: 5 }}>Store</label>
            <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)}>
              <option value="all">All stores</option>
              {STORES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div style={{ minWidth: 150 }}>
          <label style={{ marginBottom: 5 }}>From date</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div style={{ minWidth: 150 }}>
          <label style={{ marginBottom: 5 }}>To date</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {(search || storeFilter !== 'all' || dateFrom || dateTo) && (
          <button className="btn-secondary" onClick={() => { setSearch(''); setStoreFilter(isBidder ? user.id : 'all'); setDateFrom(''); setDateTo(''); }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 20 }}>
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '10px 20px', border: 'none', background: 'none', fontSize: 14, fontWeight: 600,
            color: tab === key ? '#1a3d76' : '#6b7280',
            borderBottom: `2px solid ${tab === key ? '#1a3d76' : 'transparent'}`,
            marginBottom: -2, cursor: 'pointer',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* VEHICLES TAB */}
      {tab === 'vehicles' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280' }}>
            {filteredVehicles.length} vehicles
          </div>
          {filteredVehicles.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: 32, marginBottom: 8 }}>📋</div><p>No vehicles found</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>VIN</th>
                    <th>Added</th>
                    <th>Source</th>
                    <th>Miles</th>
                    {(isGM || isWholesale) && <th>Cost Basis</th>}
                    <th>Floor</th>
                    <th>Winning Bid</th>
                    <th>Winner</th>
                    <th>Title</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map(v => {
                    const titleMap = { pending: 'Pending', in_transit: 'In Transit', on_hand: 'On Hand', lien: 'Lien', missing: 'Missing', transferred: 'Transferred' };
                    const statusMap = {
                      intake: { label: 'Intake', bg: '#f3f4f6', color: '#6b7280' },
                      recon: { label: 'In Recon', bg: '#fef3c7', color: '#92400e' },
                      ready: { label: 'Ready', bg: '#d1fae5', color: '#065f46' },
                      active: { label: 'Live', bg: '#dbeafe', color: '#1e40af' },
                      awarded: { label: 'Awarded', bg: '#d1fae5', color: '#065f46' },
                      no_sale: { label: 'No Sale', bg: '#fee2e2', color: '#991b1b' },
                      at_outside_auction: { label: 'At Outside Auction', bg: '#ede9fe', color: '#5b21b6' },
                      sold_outside: { label: 'Sold (Outside)', bg: '#d1fae5', color: '#065f46' },
                    };
                    const st = statusMap[v.status] || statusMap.intake;
                    return (
                      <tr key={v.id}>
                        <td><div style={{ fontWeight: 600 }}>{v.year} {v.make} {v.model}</div><div style={{ fontSize: 11, color: '#6b7280' }}>{v.color} · {v.condition}</div></td>
                        <td><span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{v.vin || '—'}</span></td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(v.createdAt)}</td>
                        <td style={{ fontSize: 12 }}>{v.source || '—'}</td>
                        <td style={{ fontSize: 12 }}>{v.mileage ? parseInt(v.mileage).toLocaleString() : '—'}</td>
                        {(isGM || isWholesale) && <td style={{ fontWeight: 600, color: '#1a3d76' }}>{v.totalCost ? fmt(v.totalCost) : '—'}</td>}
                        <td>{v.floorPrice ? fmt(v.floorPrice) : '—'}</td>
                        <td style={{ fontWeight: 700, color: '#1a3d76' }}>{v.winningBid ? fmt(v.winningBid) : '—'}</td>
                        <td>{v.winnerName ? <span style={{ background: '#e8eef5', color: '#1a3d76', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{v.winnerName}</span> : '—'}</td>
                        <td style={{ fontSize: 12 }}>{titleMap[v.titleStatus] || '—'}</td>
                        <td><span style={{ background: st.bg, color: st.color, padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{st.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* BIDS TAB */}
      {tab === 'bids' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280' }}>
            {filteredBids.length} bids
          </div>
          {filteredBids.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: 32, marginBottom: 8 }}>🔨</div><p>No bids found</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Vehicle</th>
                    <th>Bid amount</th>
                    <th>Bid placed</th>
                    <th>Last updated</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBids.map(b => {
                    const vehicle = data.vehicles.find(v => v.id === b.vehicleId);
                    const won = vehicle && vehicle.winnerId === b.storeId && vehicle.status === 'awarded';
                    const closed = vehicle && ['awarded', 'no_sale'].includes(vehicle.status);
                    return (
                      <tr key={b.id}>
                        <td><span style={{ background: '#e8eef5', color: '#1a3d76', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{b.storeName}</span></td>
                        <td>
                          {vehicle ? (
                            <div><div style={{ fontWeight: 600, fontSize: 13 }}>{vehicle.year} {vehicle.make} {vehicle.model}</div><div style={{ fontSize: 11, color: '#6b7280' }}>{vehicle.vin}</div></div>
                          ) : <span style={{ color: '#9ca3af' }}>Vehicle removed</span>}
                        </td>
                        <td style={{ fontWeight: 700, fontSize: 15, color: '#1a3d76' }}>{fmt(b.amount)}</td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>{fmtDateTime(b.placedAt)}</td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>{fmtDateTime(b.updatedAt)}</td>
                        <td>
                          {!closed ? <span className="badge badge-blue">Active</span>
                            : won ? <span className="badge badge-green">Won ✓</span>
                            : <span className="badge badge-gray">Outbid</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TRANSPORT TAB */}
      {tab === 'transport' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280' }}>
            {filteredTransport.length} vehicles
          </div>
          {filteredTransport.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: 32, marginBottom: 8 }}>🚚</div><p>No transport records</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Store</th>
                    <th>Winning bid</th>
                    <th>Awarded</th>
                    <th>Dispatched</th>
                    <th>In Transit</th>
                    <th>Arrived</th>
                    <th>Title Rcvd</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransport.map(t => {
                    const statusLabel = {
                      awarded: { label: 'Pending', bg: '#fef3c7', color: '#92400e' },
                      dispatched: { label: 'Dispatched', bg: '#dbeafe', color: '#1e40af' },
                      inTransit: { label: 'In Transit', bg: '#e0f2fe', color: '#0369a1' },
                      arrived: { label: 'Arrived', bg: '#d1fae5', color: '#065f46' },
                      titleReceived: { label: 'Complete ✓', bg: '#d1fae5', color: '#065f46' },
                    };
                    const st = statusLabel[t.status] || statusLabel.awarded;
                    return (
                      <tr key={t.id}>
                        <td><div style={{ fontWeight: 600, fontSize: 13 }}>{t.vehicleName}</div></td>
                        <td><span style={{ background: '#e8eef5', color: '#1a3d76', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{t.storeName}</span></td>
                        <td style={{ fontWeight: 700, color: '#1a3d76' }}>{fmt(t.winningBid)}</td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(t.steps?.awarded)}</td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(t.steps?.dispatched)}</td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(t.steps?.inTransit)}</td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(t.steps?.arrived)}</td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(t.steps?.titleReceived)}</td>
                        <td><span style={{ background: st.bg, color: st.color, padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{st.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STORES TAB */}
      {tab === 'stores' && !isBidder && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
            {storeSummary.map(store => (
              <div key={store.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1a3d76', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f1bb25', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                    {store.id}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{store.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Retail store</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    ['Cars won', store.won, '#1a3d76'],
                    ['Total spend', fmt(store.totalSpend), '#111827'],
                    ['Bids placed', store.bids, '#374151'],
                    ['Delivered', store.delivered, '#065f46'],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ background: '#f5f6f8', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
                    </div>
                  ))}
                </div>
                {store.wonVehicles.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Vehicles won</div>
                    {store.wonVehicles.map(v => (
                      <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                        <span style={{ color: '#374151' }}>{v.year} {v.make} {v.model}</span>
                        <span style={{ fontWeight: 700, color: '#1a3d76' }}>{fmt(v.winningBid)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {store.wonVehicles.length === 0 && (
                  <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>No wins yet</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
