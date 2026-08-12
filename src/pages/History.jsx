import React, { useState } from 'react';
import { useData } from '../context/DataContext';

function fmt(val) { return val ? `$${parseFloat(val).toLocaleString()}` : '—'; }
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const TRANSPORT_STEPS = [
  { key: 'awarded', label: 'Awarded' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'inTransit', label: 'In Transit' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'titleReceived', label: 'Title Received' },
];

export default function History() {
  const { data } = useData();

  const [tab, setTab] = useState('vehicles');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filter vehicles
  const filteredVehicles = data.vehicles.filter(v => {
    const name = `${v.year} ${v.make} ${v.model} ${v.vin}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (dateFrom && v.createdAt && new Date(v.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && v.createdAt && new Date(v.createdAt) > new Date(dateTo)) return false;
    return true;
  });

  const filteredTransport = data.transport.filter(t => {
    if (search) {
      const name = `${t.vehicleName} ${t.storeName}`.toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const tabs = [['vehicles', 'All Vehicles'], ['transport', 'Transport & Title']];

  return (
    <div>
      <div className="page-header">
        <h1>History & Audit Log</h1>
        <p>Full group history — every vehicle and delivery</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total vehicles</div>
          <div className="stat-value">{data.vehicles.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Sold</div>
          <div className="stat-value" style={{ color: '#065f46' }}>{data.vehicles.filter(v => v.status === 'sold').length}</div>
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

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={{ marginBottom: 5 }}>Search</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="VIN, make, model, store..." />
        </div>
        <div style={{ minWidth: 150 }}>
          <label style={{ marginBottom: 5 }}>From date</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div style={{ minWidth: 150 }}>
          <label style={{ marginBottom: 5 }}>To date</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {(search || dateFrom || dateTo) && (
          <button className="btn-secondary" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }} >
            Clear filters
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700,
            background: tab === key ? '#0d2550' : '#f3f4f6',
            color: tab === key ? '#fff' : '#6b7280',
            transition: 'all 0.15s',
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
                    <th>Cost Basis</th>
                    <th>Sold Price</th>
                    <th>Buyer</th>
                    <th>Title</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map(v => {
                    const titleMap = { in: 'Title IN', out: 'Title OUT', clear: 'Title IN', pending: 'Title OUT', received: 'Title OUT', issue: 'Title OUT' };
                    const statusMap = {
                      intake: { label: 'Intake', bg: '#f3f4f6', color: '#6b7280' },
                      recon: { label: 'In Recon', bg: '#fef3c7', color: '#92400e' },
                      ready: { label: 'Ready', bg: '#d1fae5', color: '#065f46' },
                      active: { label: 'Live', bg: '#dbeafe', color: '#1e40af' },
                      awarded: { label: 'Awarded', bg: '#d1fae5', color: '#065f46' },
                      no_sale: { label: 'No Sale', bg: '#fee2e2', color: '#991b1b' },
                    };
                    const st = statusMap[v.status] || statusMap.intake;
                    return (
                      <tr key={v.id}>
                        <td><div style={{ fontWeight: 600 }}>{v.year} {v.make} {v.model}</div><div style={{ fontSize: 11, color: '#6b7280' }}>{v.color} · {v.condition}</div></td>
                        <td><span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{v.vin || '—'}</span></td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(v.createdAt)}</td>
                        <td style={{ fontSize: 12 }}>{v.source || '—'}</td>
                        <td style={{ fontSize: 12 }}>{v.mileage ? parseInt(v.mileage).toLocaleString() : '—'}</td>
                        <td style={{ fontWeight: 600, color: '#1a3d76' }}>{v.totalCost ? fmt(v.totalCost) : '—'}</td>
                        <td style={{ fontWeight: 700, color: '#1a3d76' }}>{v.soldPrice ? fmt(v.soldPrice) : '—'}</td>
                        <td>{v.soldTo ? <span style={{ background: '#e8eef5', color: '#1a3d76', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{v.soldTo}</span> : '—'}</td>
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

    </div>
  );
}
