import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { StoreAvatar } from '../components/StoreAvatar';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { USERS } from '../context/AuthContext';

const BUYER_STORES = USERS.filter(u => u.role === 'bidder');

function DirectSaleModal({ vehicles, onClose, onSell }) {
  const [vehicleId, setVehicleId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [otherName, setOtherName] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState(null);

  const vehicle = vehicles.find(v => v.id === vehicleId);
  const isOther = buyerId === 'OTHER';
  const buyerName = isOther ? otherName.trim() : (BUYER_STORES.find(s => s.id === buyerId)?.name || '');
  const amount = parseFloat(price) || 0;
  const cost = vehicle ? (parseFloat(vehicle.totalCost) || 0) : 0;
  const margin = amount - cost;
  const valid = vehicleId && amount > 0 && (isOther ? otherName.trim() : buyerId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valid) return;
    setSummary({
      name: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle',
      buyerName,
      amount,
    });
    onSell(vehicleId, isOther ? 'EXT' : buyerId, buyerName, amount, note);
    setDone(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>{done ? 'Sale recorded' : 'Sell now — direct sale'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>
        <div className="modal-body">
          {done ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🤝</div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#065f46' }}>
                {summary?.name} sold to {summary?.buyerName}
              </p>
              <p style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>
                Sold for ${(summary?.amount || 0).toLocaleString()}. It's now in Logistics, Transport &amp; Title and the buyer's wins.
              </p>
              <button className="btn-navy" style={{ marginTop: 20 }} onClick={onClose}>Done</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="alert alert-info" style={{ marginBottom: 18 }}>
                Sell a vehicle straight to a store at a price you've agreed on — no auction needed. The car moves to Awarded and into transport just like an auction win.
              </div>

              <div className="form-group">
                <label>Vehicle *</label>
                <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
                  <option value="">Select a vehicle...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model}{v.trim ? ` ${v.trim}` : ''}{v.vin ? ` · ${v.vin}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Buyer (store) *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {BUYER_STORES.map(s => {
                    const active = buyerId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setBuyerId(s.id)}
                        style={{
                          padding: '7px 14px', borderRadius: 20,
                          border: `1px solid ${active ? '#1a3d76' : '#e5e7eb'}`,
                          background: active ? '#1a3d76' : '#fff',
                          color: active ? '#fff' : '#374151',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setBuyerId('OTHER')}
                    style={{
                      padding: '7px 14px', borderRadius: 20,
                      border: `1px solid ${isOther ? '#1a3d76' : '#e5e7eb'}`,
                      background: isOther ? '#1a3d76' : '#fff',
                      color: isOther ? '#fff' : '#374151',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Other store…
                  </button>
                </div>
                {isOther && (
                  <input
                    type="text"
                    value={otherName}
                    onChange={e => setOtherName(e.target.value)}
                    placeholder="Outside store / dealer name"
                    style={{ marginTop: 10 }}
                  />
                )}
              </div>

              <div className="form-group">
                <label>Agreed sale price *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" min={0} style={{ paddingLeft: 24 }} required />
                </div>
              </div>

              <div className="form-group">
                <label>Note (optional)</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Spoke with buyer, pickup next week" />
              </div>

              {vehicle && amount > 0 && (
                <div style={{ background: '#f0f4fb', borderRadius: 8, padding: '12px 16px', marginBottom: 16, border: '1px solid #c7d6ef' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 4 }}>
                    <span>Cost basis</span>
                    <span>${cost.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 4 }}>
                    <span>Sale price</span>
                    <span>${amount.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 1, background: '#c7d6ef', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: margin >= 0 ? '#065f46' : '#991b1b' }}>
                    <span>Margin</span>
                    <span>{margin >= 0 ? '+' : '−'}${Math.abs(margin).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="modal-footer" style={{ padding: '8px 0 0', borderTop: 'none' }}>
                <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn-navy" disabled={!valid}>Complete sale</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuctionManage() {
  const { user } = useAuth();
  const { data, openAuction, closeAuction, directSale, unlistVehicle, getAllBidsForVehicle } = useData();
  const [closeDate, setCloseDate] = useState('');
  const [label, setLabel] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [expandedBids, setExpandedBids] = useState(null);
  const [showDirectSale, setShowDirectSale] = useState(false);

  if (user.role !== 'wholesale' && user.role !== 'admin') return <Navigate to="/auction" replace />;

  const activeVehicles = data.vehicles.filter(v => v.status === 'active');
  const readyVehicles = data.vehicles.filter(v => v.status === 'ready');
  const sellableVehicles = data.vehicles.filter(v => !['awarded', 'no_sale'].includes(v.status));
  const directSales = data.vehicles
    .filter(v => v.saleType === 'direct')
    .sort((a, b) => new Date(b.awardedAt || 0) - new Date(a.awardedAt || 0));

  const handleOpen = (e) => {
    e.preventDefault();
    if (!closeDate) return;
    openAuction(new Date(closeDate).toISOString(), label || undefined);
  };

  const handleClose = () => {
    closeAuction();
    setConfirmClose(false);
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
                <label>Auction label</label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder={`Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
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
            <button type="submit" className="btn-navy" disabled={!closeDate}>
              Open auction
            </button>
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

      {/* Direct sale — sell now */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Sell now — direct sale</h2>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              Agreed on a price with a store outside the auction? Sell the vehicle to them directly — no opening or closing an auction.
            </p>
          </div>
          <button
            className="btn-navy"
            onClick={() => setShowDirectSale(true)}
            disabled={sellableVehicles.length === 0}
            style={{ flexShrink: 0 }}
          >
            🤝 Sell a vehicle now
          </button>
        </div>
        {sellableVehicles.length === 0 && (
          <div className="alert alert-info" style={{ marginTop: 14, marginBottom: 0 }}>
            No vehicles available to sell. Add inventory on the Acquisitions page first.
          </div>
        )}

        {directSales.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              Recent direct sales
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {directSales.slice(0, 6).map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{v.year} {v.make} {v.model}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      Sold to <strong style={{ color: '#1a3d76' }}>{v.winnerName}</strong>
                      {v.awardedAt ? ` · ${new Date(v.awardedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#065f46', fontSize: 15 }}>${(v.winningBid || 0).toLocaleString()}</div>
                </div>
              ))}
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
                      <span className={`badge ${h.closedDate ? 'badge-gray' : 'badge-green'}`}>
                        {h.closedDate ? 'Closed' : 'Open'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Direct sale modal */}
      {showDirectSale && (
        <DirectSaleModal
          vehicles={sellableVehicles}
          onClose={() => setShowDirectSale(false)}
          onSell={(vehicleId, buyerId, buyerName, amount, note) => directSale(vehicleId, buyerId, buyerName, amount, note)}
        />
      )}

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
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => setConfirmClose(false)}>Not yet</button>
                <button className="btn-navy" onClick={handleClose}>Close & award winners</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
