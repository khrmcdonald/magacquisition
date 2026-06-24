import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { StoreAvatar } from '../components/StoreAvatar';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { USERS } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function AuctionManage() {
  const { user } = useAuth();
  const { data, openAuction, closeAuction, unlistVehicle, getAllBidsForVehicle } = useData();
  const { showToast } = useToast();
  const [closeDate, setCloseDate] = useState('');
  const [label, setLabel] = useState(`Weekly Auction ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}`);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState(null);
  const [expandedBids, setExpandedBids] = useState(null);

  if (user.role !== 'wholesale' && user.role !== 'admin') return <Navigate to="/auction" replace />;

  const activeVehicles = data.vehicles.filter(v => v.status === 'in_auction');
  const readyVehicles = data.vehicles.filter(v => v.status === 'ready');

  const handleOpen = async (e) => {
    e.preventDefault();
    if (!closeDate) return;
    try {
      await openAuction(new Date(closeDate).toISOString(), label || undefined);
    } catch (err) {
      showToast('Failed to open auction: ' + err.message, 'error');
    }
  };

  const handleClose = async () => {
    setClosing(true);
    setCloseError(null);
    try {
      await closeAuction();
      setConfirmClose(false);
    } catch (err) {
      setCloseError(err.message || 'Failed to close auction. Check console for details.');
    }
    setClosing(false);
  };

  const storeColors = {};
  USERS.filter(u => u.role === 'bidder').forEach((u, i) => {
    const colors = ['#1a3d76', '#065f46', '#92400e', '#991b1b', '#1e40af'];
    storeColors[u.id] = colors[i % colors.length];
  });

  return (
    <div>
      <div className="page-header">
        <h1>Manage Auction</h1>
        <p>Control the auction window and monitor all live bids</p>
      </div>

      {/* Auction control */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Auction window</h2>

        {!data.auction.isOpen ? (
          <form onSubmit={handleOpen}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Auction name</label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Close date & time</label>
                <input
                  type="datetime-local"
                  value={closeDate}
                  onChange={e => setCloseDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              {readyVehicles.length} vehicle{readyVehicles.length !== 1 ? 's' : ''} are ready to list. You can list them from the Acquisitions page after opening the auction.
            </div>
            <button type="submit" className="btn-navy" disabled={!closeDate} style={{ opacity: !closeDate ? 0.5 : 1 }}>
              Open auction
            </button>
            {!closeDate && <p style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>Select a close date & time to open the auction.</p>}
          </form>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Current auction</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{data.auction.label}</div>
                {data.auction.closeDate && (
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                    Closes {new Date(data.auction.closeDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                )}
              </div>
              <button
                className="btn-danger"
                onClick={() => setConfirmClose(true)}
                style={{ padding: '10px 20px', fontSize: 14, fontWeight: 700 }}
              >
                Close auction & award winners
              </button>
            </div>
            <div className="stat-grid" style={{ marginBottom: 0 }}>
              <div className="stat-card">
                <div className="stat-label">Live vehicles</div>
                <div className="stat-value">{activeVehicles.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total bids</div>
                <div className="stat-value">{data.bids.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Cars with bids</div>
                <div className="stat-value">{activeVehicles.filter(v => data.bids.some(b => b.vehicleId === v.id)).length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">No bids yet</div>
                <div className="stat-value" style={{ color: '#991b1b' }}>
                  {activeVehicles.filter(v => !data.bids.some(b => b.vehicleId === v.id)).length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live bid monitor */}
      {data.auction.isOpen && activeVehicles.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Live bid monitor</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>All bids across all stores — visible only to you</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Floor price</th>
                  <th>High bid</th>
                  <th>Leading store</th>
                  <th>Total bids</th>
                  <th>Floor met?</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeVehicles.map(v => {
                  const bids = getAllBidsForVehicle(v.id);
                  const highBid = bids[0];
                  const floorMet = highBid && (!v.floorPrice || highBid.amount >= parseFloat(v.floorPrice));
                  return (
                    <React.Fragment key={v.id}>
                      <tr>
                        <td>
                          <div style={{ fontWeight: 600 }}>{v.year} {v.make} {v.model}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{v.trim} · {v.color}</div>
                        </td>
                        <td>{v.floorPrice ? `$${parseFloat(v.floorPrice).toLocaleString()}` : '—'}</td>
                        <td>
                          <span style={{ fontSize: 15, fontWeight: 700, color: highBid ? '#1a3d76' : '#9ca3af' }}>
                            {highBid ? `$${highBid.amount.toLocaleString()}` : 'No bids'}
                          </span>
                        </td>
                        <td>
                          {highBid ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <StoreAvatar storeId={highBid.storeId} size={28} />
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{highBid.storeName}</span>
                            </div>
                          ) : '—'}
                        </td>
                        <td>
                          <button
                            onClick={() => setExpandedBids(expandedBids === v.id ? null : v.id)}
                            style={{ background: 'none', border: 'none', color: '#1a3d76', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {bids.length} bid{bids.length !== 1 ? 's' : ''} {expandedBids === v.id ? '▲' : '▼'}
                          </button>
                        </td>
                        <td>
                          {bids.length > 0 ? (
                            <span className={`badge ${floorMet ? 'badge-green' : 'badge-red'}`}>
                              {floorMet ? 'Yes' : 'Not met'}
                            </span>
                          ) : <span className="badge badge-gray">No bids</span>}
                        </td>
                        <td>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => unlistVehicle(v.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                      {expandedBids === v.id && bids.length > 0 && (
                        <tr>
                          <td colSpan={7} style={{ background: '#f9fafb', padding: '8px 20px' }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {bids.map((b, i) => (
                                <div key={b.id} style={{
                                  background: i === 0 ? '#1a3d76' : '#fff',
                                  color: i === 0 ? '#fff' : '#374151',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 8,
                                  padding: '8px 14px',
                                  fontSize: 13,
                                  display: 'flex',
                                  gap: 10,
                                  alignItems: 'center',
                                }}>
                                  {i === 0 && <span style={{ background: '#f1bb25', color: '#1a3d76', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>WINNER</span>}
                                  <StoreAvatar storeId={b.storeId} size={24} />
                                  <span style={{ fontWeight: 700 }}>{b.storeName}</span>
                                  <span style={{ fontWeight: 600 }}>${b.amount.toLocaleString()}</span>
                                  <span style={{ fontSize: 11, opacity: .7 }}>{new Date(b.updatedAt).toLocaleTimeString()}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Post-auction: no-sale vehicles */}
      {!data.auction.isOpen && data.vehicles.filter(v => v.status === 'no_sale').length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#991b1b', marginBottom: 12 }}>No sale — follow up required</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>These vehicles didn't meet their floor price. Reach out to stores directly to negotiate.</p>
          {data.vehicles.filter(v => v.status === 'no_sale').map(v => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{v.year} {v.make} {v.model}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Floor: {v.floorPrice ? `$${parseFloat(v.floorPrice).toLocaleString()}` : 'No floor'}</div>
              </div>
              <span className="badge badge-red">No sale</span>
            </div>
          ))}
        </div>
      )}

      {/* Auction History Log */}
      <div className="card" style={{ marginTop: 24, padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Auction history</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Every auction opened and closed — full audit log</p>
          </div>
          <span style={{ background: '#f0f4fb', color: '#1a3d76', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            {(data.auctionHistory || []).length} auctions
          </span>
        </div>
        {(data.auctionHistory || []).length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <p style={{ fontSize: 14 }}>No auction history yet. Open your first auction above.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Auction label</th>
                  <th>Opened</th>
                  <th>Closed</th>
                  <th>Vehicles</th>
                  <th>Awarded</th>
                  <th>No sale</th>
                  <th>Total volume</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...(data.auctionHistory || [])].reverse().map((h, i, arr) => (
                  <tr key={h.id}>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>#{arr.length - i}</td>
                    <td style={{ fontWeight: 600 }}>{h.label || '—'}</td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>
                      {h.openDate ? new Date(h.openDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>
                      {h.closedDate ? new Date(h.closedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                    </td>
                    <td>{h.vehicleCount ?? '—'}</td>
                    <td style={{ fontWeight: 600, color: '#065f46' }}>{h.awardedCount ?? '—'}</td>
                    <td style={{ color: '#991b1b' }}>{h.noSaleCount ?? '—'}</td>
                    <td style={{ fontWeight: 700, color: '#1a3d76' }}>
                      {h.totalVolume ? `$${h.totalVolume.toLocaleString()}` : '—'}
                    </td>
                    <td>
                      <span className="badge badge-gray">Closed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Close confirm modal */}
      {confirmClose && (
        <div className="modal-overlay" onClick={() => setConfirmClose(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-body" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>Close auction?</h2>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>
                Winners will be awarded automatically to the highest bidder on each vehicle.
              </p>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
                Vehicles that don't meet the floor price will be marked "No Sale."
              </p>
              <div className="alert alert-warning" style={{ textAlign: 'left', marginBottom: 20 }}>
                This cannot be undone. Make sure all stores have had time to bid.
              </div>
              {closeError && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991b1b', textAlign: 'left' }}>
                  ⚠ {closeError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => setConfirmClose(false)} disabled={closing}>Not yet</button>
                <button className="btn-navy" onClick={handleClose} disabled={closing}>
                  {closing ? 'Closing…' : 'Close & award winners'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
