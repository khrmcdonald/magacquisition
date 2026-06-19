import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { StatusBadge } from '../components/StatusBadge';
import { VehicleDetailModal } from '../components/VehicleDetailModal';
import { SellSheetButton } from '../components/SellSheetButton';

const ARBITRATION_ISSUES = [
  'Undisclosed mechanical issue',
  'Undisclosed accident / frame damage',
  'Mileage discrepancy',
  'Title issue',
  'Condition misrepresented',
  'Missing equipment / parts',
  'Flood / water damage',
  'Other',
];

function ArbitrationModal({ vehicle, onClose, storeId, storeName }) {
  const { fileArbitration } = useData();
  const [issueType, setIssueType] = useState('');
  const [details, setDetails] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!issueType) return;
    fileArbitration(vehicle.id, storeId, storeName, issueType, details);
    setDone(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header" style={{ background: '#991b1b', borderRadius: '12px 12px 0 0' }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: 17 }}>File Arbitration</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>{vehicle.year} {vehicle.make} {vehicle.model}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
        <div className="modal-body">
          {done ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#991b1b' }}>Arbitration filed</p>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>TRI-STATE has been notified and will review your claim.</p>
              <button className="btn-navy" style={{ marginTop: 20 }} onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              <div className="alert alert-warning" style={{ marginBottom: 20 }}>
                Arbitration is for legitimate vehicle condition disputes per standard dealer auction policy. Filing initiates a formal review by TRI-STATE.
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Issue type *</label>
                  <select value={issueType} onChange={e => setIssueType(e.target.value)} required>
                    <option value="">Select issue...</option>
                    {ARBITRATION_ISSUES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Details</label>
                  <textarea value={details} onChange={e => setDetails(e.target.value)} rows={4} placeholder="Describe the issue in detail — when discovered, what was found, any repair estimates..." />
                </div>
                <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: 'none' }}>
                  <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                  <button type="submit" style={{ background: '#991b1b', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }} disabled={!issueType}>
                    File arbitration
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyWins() {
  const { user } = useAuth();
  const { data } = useData();
  const [arbitrationVehicle, setArbitrationVehicle] = useState(null);
  const [detailVehicleId, setDetailVehicleId] = useState(null);

  const myWins = data.vehicles.filter(v => v.status === 'awarded' && v.winnerId === user.id);
  const myBids = data.bids.filter(b => b.storeId === user.id);
  const totalSpend = myWins.reduce((s, v) => s + (v.winningBid || 0), 0);

  const getTransport = (vehicleId) => data.transport.find(t => t.vehicleId === vehicleId);

  return (
    <>
      <div className="page-header">
        <h1>My Wins</h1>
        <p>Vehicles awarded to {user.name}</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Cars won</div>
          <div className="stat-value">{myWins.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total spend</div>
          <div className="stat-value" style={{ fontSize: 18 }}>${totalSpend.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bids placed</div>
          <div className="stat-value">{myBids.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Incoming</div>
          <div className="stat-value" style={{ color: '#065f46' }}>
            {myWins.filter(v => { const t = getTransport(v.id); return t && !['arrived','titleReceived'].includes(t.status); }).length}
          </div>
          <div className="stat-sub">in transit</div>
        </div>
      </div>

      {myWins.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
          <p>No wins yet</p>
          <span>Head to the Auction Floor and place your bids</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myWins.map(v => {
            const transport = getTransport(v.id);
            return (
              <div
                key={v.id}
                className="card"
                onClick={() => setDetailVehicleId(v.id)}
                title="Click to view full details"
                style={{ display: 'flex', gap: 16, alignItems: 'flex-start', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,61,118,0.14)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
              >
                {v.photos && v.photos[0] ? (
                  <img src={v.photos[0]} alt="" style={{ width: 100, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 100, height: 72, background: '#f0f4f8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🚗</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{v.year} {v.make} {v.model}</h3>
                      <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>{v.trim} · {parseInt(v.mileage||0).toLocaleString()} mi · {v.color}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>You paid</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#1a3d76' }}>${v.winningBid?.toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                    <StatusBadge vehicle={v} transport={transport} />
                    {/* Arbitration status or button */}
                    {v.arbitration?.status === 'open' ? null
                    : v.arbitration?.status === 'resolved' ? (
                      <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>✓ Arbitration resolved</span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setArbitrationVehicle(v); }}
                        style={{ background: 'none', border: '1px solid #fca5a5', color: '#991b1b', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        File arbitration
                      </button>
                    )}
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <SellSheetButton vehicle={v} transport={transport} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1a3d76', whiteSpace: 'nowrap' }}>
                        View details →
                      </span>
                    </span>
                  </div>
                  {v.notes && (
                    <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8, background: '#f9fafb', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid #e5e7eb' }}>
                      {v.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lost bids */}
      {data.bids.filter(b => b.storeId === user.id).length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Bid history</h2>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Your bid</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bids.filter(b => b.storeId === user.id).map(b => {
                    const vehicle = data.vehicles.find(v => v.id === b.vehicleId);
                    if (!vehicle) return null;
                    const won = vehicle.winnerId === user.id;
                    const closed = ['awarded','no_sale'].includes(vehicle.status);
                    return (
                      <tr key={b.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{vehicle.trim}</div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#1a3d76' }}>${b.amount.toLocaleString()}</td>
                        <td>
                          {!closed ? (
                            <span className="badge badge-blue">Active</span>
                          ) : won ? (
                            <span className="badge badge-green">Won ✓</span>
                          ) : (
                            <span className="badge badge-gray">Outbid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    {arbitrationVehicle && (
      <ArbitrationModal
        vehicle={arbitrationVehicle}
        storeId={user.id}
        storeName={user.name}
        onClose={() => setArbitrationVehicle(null)}
      />
    )}

    {detailVehicleId && (
      <VehicleDetailModal
        vehicleId={detailVehicleId}
        onClose={() => setDetailVehicleId(null)}
      />
    )}
    </>
  );
}
