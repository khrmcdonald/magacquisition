import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { VehicleCard } from '../components/VehicleCard';
import VehicleDetailModal from '../components/VehicleDetailModal';

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

const TRANSPORT_LABEL = {
  awarded:       { label: 'Pending dispatch', color: '#92400e', bg: '#fef3c7', icon: '⏳' },
  dispatched:    { label: 'Dispatched',       color: '#1e40af', bg: '#dbeafe', icon: '📦' },
  inTransit:     { label: 'In transit',       color: '#0369a1', bg: '#e0f2fe', icon: '🚚' },
  arrived:       { label: 'Arrived',          color: '#065f46', bg: '#d1fae5', icon: '✅' },
  titleReceived: { label: 'Title received',   color: '#065f46', bg: '#d1fae5', icon: '📄' },
};

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
  const [detailModal, setDetailModal] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  // Wins: highest bid on awarded vehicle came from this location
  const myWins = data.vehicles.filter(v => {
    if (v.status !== 'awarded') return false;
    if (v.winnerId === user.id) return true;
    const highBid = data.bids
      .filter(b => b.vehicleId === v.id)
      .reduce((top, b) => (!top || b.amount > top.amount) ? b : top, null);
    return highBid?.locationId === user.locationId;
  });

  // Bids: deduplicated — one row per vehicle, highest bid from this location
  const bidHistory = Object.values(
    data.bids
      .filter(b => b.locationId === user.locationId)
      .reduce((acc, b) => {
        if (!acc[b.vehicleId] || b.amount > acc[b.vehicleId].amount) acc[b.vehicleId] = b;
        return acc;
      }, {})
  );

  const totalSpend = myWins.reduce((s, v) => s + (v.winningBid || 0), 0);
  const getTransport = (vehicleId) => data.transport.find(t => t.vehicleId === vehicleId);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>My Wins</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 0 }}>Vehicles awarded to {user.name}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Cars won',    value: myWins.length,                                                               color: '#0d2550' },
          { label: 'Total spend', value: `$${totalSpend.toLocaleString()}`,                                            color: '#0d2550' },
          { label: 'Bids placed', value: bidHistory.length,                                                            color: '#374151' },
          { label: 'Incoming',    value: myWins.filter(v => { const t = getTransport(v.id); return t && !['arrived','titleReceived'].includes(t.status); }).length, color: '#065f46', sub: 'in transit' },
        ].map(({ label, value, color, small, sub }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: '3px solid #0d2550', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {myWins.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🏆</div>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 8 }}>No wins yet</p>
          <span style={{ fontSize: 14, color: '#9ca3af' }}>Head to the Auction Floor and place your bids</span>
        </div>
      ) : (
        <>
          {/* View toggle */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <div style={{ display: 'flex', border: '1.5px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              {[['grid', '⊞'], ['list', '☰']].map(([mode, icon]) => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 14,
                  background: viewMode === mode ? '#0d2550' : '#fff',
                  color: viewMode === mode ? '#fff' : '#6b7280',
                  borderRight: mode === 'grid' ? '1px solid #e5e7eb' : 'none',
                }}>{icon}</button>
              ))}
            </div>
          </div>

          {/* Grid view */}
          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 16, marginBottom: 32 }}>
              {myWins.map(v => {
                const transport = getTransport(v.id);
                const ts = transport ? (TRANSPORT_LABEL[transport.status] || TRANSPORT_LABEL.awarded) : null;
                return (
                  <div key={v.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ borderRadius: '12px 12px 0 0', overflow: 'hidden', border: '1.5px solid #0d2550', borderBottom: 'none' }}>
                      <VehicleCard
                        vehicle={v}
                        mileage={v.mileage ?? null}
                        badge={<span style={{ background: '#0d2550', color: '#e8b84b', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>WON</span>}
                        pricePill={null}
                        showTitleStatus={true}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{data.bids.filter(b => b.vehicleId === v.id).length} bids total</div>
                          <button
                            onClick={() => setDetailModal(v)}
                            title="View details"
                            style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
                          >🔍</button>
                        </div>
                      </VehicleCard>
                    </div>
                    {/* Bottom strip */}
                    <div style={{ background: '#f8faff', border: '1.5px solid #0d2550', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>You paid</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#0d2550' }}>${v.winningBid?.toLocaleString()}</div>
                        </div>
                        {v.arbitration?.status === 'open' ? (
                          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⚠ Dispute</span>
                        ) : v.arbitration?.status !== 'resolved' && (
                          <button onClick={() => setArbitrationVehicle(v)} style={{ background: 'none', border: '1px solid #fca5a5', color: '#991b1b', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            Arbitration
                          </button>
                        )}
                      </div>
                      {ts && (
                        <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, background: ts.bg, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: ts.color }}>
                          {ts.icon} {ts.label}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List view */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {myWins.map(v => {
                const transport = getTransport(v.id);
                const ts = transport ? (TRANSPORT_LABEL[transport.status] || TRANSPORT_LABEL.awarded) : null;
                return (
                  <VehicleCard
                    key={v.id}
                    variant="list"
                    vehicle={v}
                    mileage={v.mileage ?? null}
                    badge={<span style={{ background: '#0d2550', color: '#e8b84b', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>WON</span>}
                    pricePill={null}
                    showTitleStatus={true}
                    actionButton={
                      <button onClick={() => setDetailModal(v)} title="View details" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>🔍</button>
                    }
                  >
                    <div style={{ padding: '10px 16px 12px', borderTop: '1px solid #f3f4f6', background: '#f8faff', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 1 }}>You paid</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0d2550' }}>${v.winningBid?.toLocaleString()}</div>
                      </div>
                      {ts && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: ts.bg, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: ts.color }}>
                          {ts.icon} {ts.label}
                        </div>
                      )}
                      {v.arbitration?.status === 'open' ? (
                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>⚠ Arbitration pending</span>
                      ) : v.arbitration?.status !== 'resolved' && (
                        <button onClick={() => setArbitrationVehicle(v)} style={{ background: 'none', border: '1px solid #fca5a5', color: '#991b1b', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          File arbitration
                        </button>
                      )}
                    </div>
                  </VehicleCard>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Bid history — one row per vehicle, highest bid only */}
      {bidHistory.length > 0 && (
        <div style={{ marginTop: 8 }}>
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
                  {bidHistory.map(b => {
                    const vehicle = data.vehicles.find(v => v.id === b.vehicleId);
                    if (!vehicle) return null;
                    const closed = ['awarded', 'no_sale'].includes(vehicle.status);
                    const won = closed && (() => {
                      const highBid = data.bids.filter(bid => bid.vehicleId === b.vehicleId).reduce((top, bid) => (!top || bid.amount > top.amount) ? bid : top, null);
                      return highBid?.locationId === user.locationId;
                    })();
                    return (
                      <tr key={b.vehicleId}>
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

      {detailModal && <VehicleDetailModal vehicle={detailModal} onClose={() => setDetailModal(null)} />}
      {arbitrationVehicle && (
        <ArbitrationModal
          vehicle={arbitrationVehicle}
          storeId={user.id}
          storeName={user.name}
          onClose={() => setArbitrationVehicle(null)}
        />
      )}
    </div>
  );
}
