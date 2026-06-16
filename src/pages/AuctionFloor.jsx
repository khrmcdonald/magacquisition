function PhotoGallery({ photos }) {
  const [current, setCurrent] = React.useState(0);
  if (!photos || photos.length === 0) return null;
  return (
    <div style={{ position: 'relative', background: '#000' }}>
      <img
        src={photos[current]}
        alt=""
        style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
      />
      {photos.length > 1 && (
        <>
          <button
            onClick={() => setCurrent(i => (i - 1 + photos.length) % photos.length)}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >‹</button>
          <button
            onClick={() => setCurrent(i => (i + 1) % photos.length)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >›</button>
          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {photos.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrent(i)}
                style={{ width: i === current ? 20 : 8, height: 8, borderRadius: 4, background: i === current ? '#f1bb25' : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.2s' }}
              />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
            {current + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StoreAvatar } from '../components/StoreAvatar';
import { useData } from '../context/DataContext';

function VehicleModal({ vehicle, onClose, storeId, storeName, isOpen }) {
  const { placeBid, getMyBid, getHighBid, checkAndAwardBadges } = useData();
  const myBid = getMyBid(vehicle.id, storeId);
  const highBid = getHighBid(vehicle.id);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isWinning = myBid && highBid && myBid.amount >= highBid;

  const conditionColors = {
    excellent: { bg: '#d1fae5', color: '#065f46' },
    good: { bg: '#dbeafe', color: '#1e40af' },
    fair: { bg: '#fef3c7', color: '#92400e' },
    poor: { bg: '#fee2e2', color: '#991b1b' },
  };
  const cond = conditionColors[vehicle.condition?.toLowerCase()] || conditionColors.good;

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseInt(amount, 10);
    if (!val || val < 100) { setError('Please enter a valid amount.'); return; }
    if (highBid && val <= highBid) {
      setError(`Your bid must be higher than the current high bid of $${highBid.toLocaleString()}.`);
      return;
    }
    placeBid(vehicle.id, storeId, storeName, val);
    checkAndAwardBadges(storeId, val);
    setSuccess(true);
    setAmount('');
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>

        {/* Header */}
        <div className="modal-header" style={{ background: '#1a3d76', borderRadius: '12px 12px 0 0', padding: '18px 24px' }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }}>
              {vehicle.trim} · {vehicle.color}
            </p>
            {vehicle.vin && (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'monospace', marginTop: 3 }}>
                {vehicle.vin}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>

          {/* Photo gallery */}
          {vehicle.photos && vehicle.photos.length > 0 && (
            <PhotoGallery photos={vehicle.photos} />
          )}

          {/* Details grid */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#f5f6f8', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>Mileage</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{vehicle.mileage ? parseInt(vehicle.mileage).toLocaleString() : '—'}</div>
              </div>
              <div style={{ background: '#f5f6f8', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>Condition</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: cond.bg, color: cond.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                    {vehicle.condition || 'N/A'}
                  </span>
                </div>
              </div>
              <div style={{ background: '#f5f6f8', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>Color</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{vehicle.color || '—'}</div>
              </div>
            </div>

            {vehicle.notes && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, color: '#92400e' }}>Notes: </span>{vehicle.notes}
              </div>
            )}
          </div>

          {/* Bidding area */}
          <div style={{ padding: '20px 24px' }}>
            {/* Current bid status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#f0f4fb', border: '1px solid #c7d6ef', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#1a3d76', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Current high bid</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#1a3d76' }}>
                  {highBid ? `$${highBid.toLocaleString()}` : 'No bids yet'}
                </div>
              </div>
              <div style={{ background: myBid ? (isWinning ? '#f0fdf4' : '#fef2f2') : '#f9fafb', border: `1px solid ${myBid ? (isWinning ? '#86efac' : '#fca5a5') : '#e5e7eb'}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>My bid</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: myBid ? (isWinning ? '#065f46' : '#991b1b') : '#9ca3af' }}>
                  {myBid ? `$${myBid.amount.toLocaleString()}` : '—'}
                </div>
                {myBid && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <StoreAvatar storeId={storeId} size={20} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: isWinning ? '#065f46' : '#991b1b' }}>{isWinning ? '✓ Winning' : '✗ Outbid'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bid form */}
            {isOpen && (
              <form onSubmit={handleSubmit}>
                {success && (
                  <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
                    ✅ Bid placed successfully!
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#374151', fontSize: 16, fontWeight: 700 }}>$</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => { setAmount(e.target.value); setError(''); }}
                      placeholder={highBid ? `More than $${highBid.toLocaleString()}` : 'Enter your bid'}
                      style={{ paddingLeft: 28, fontSize: 16, fontWeight: 600, height: 48 }}
                      min={1}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ height: 48, padding: '0 24px', fontSize: 15, fontWeight: 700, flexShrink: 0 }}
                  >
                    {myBid ? 'Update' : 'Bid'}
                  </button>
                </div>
                {error && (
                  <div style={{ marginTop: 8, color: '#991b1b', fontSize: 13, fontWeight: 500 }}>⚠ {error}</div>
                )}
              </form>
            )}

            {!isOpen && (
              <div style={{ textAlign: 'center', padding: '12px', background: '#f9fafb', borderRadius: 8, color: '#9ca3af', fontSize: 13 }}>
                Auction is closed
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VehicleCard({ vehicle, storeId, onClick }) {
  const { getHighBid, getMyBid } = useData();
  const highBid = getHighBid(vehicle.id);
  const myBid = getMyBid(vehicle.id, storeId);
  const isWinning = myBid && highBid && myBid.amount >= highBid;

  const conditionColors = {
    excellent: { bg: '#d1fae5', color: '#065f46' },
    good: { bg: '#dbeafe', color: '#1e40af' },
    fair: { bg: '#fef3c7', color: '#92400e' },
    poor: { bg: '#fee2e2', color: '#991b1b' },
  };
  const cond = conditionColors[vehicle.condition?.toLowerCase()] || conditionColors.good;

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: `1px solid ${isWinning ? '#1a3d76' : '#e5e7eb'}`,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: isWinning ? '0 0 0 2px #1a3d76' : '0 1px 3px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = isWinning ? '0 0 0 2px #1a3d76, 0 6px 16px rgba(0,0,0,0.1)' : '0 6px 16px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = isWinning ? '0 0 0 2px #1a3d76' : '0 1px 3px rgba(0,0,0,0.06)'; }}
    >
      {/* Photo */}
      <div style={{ height: 148, background: '#f0f4f8', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {vehicle.photos && vehicle.photos[0] ? (
          <img src={vehicle.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 36 }}>🚗</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>No photo</div>
          </div>
        )}
        <span style={{ position: 'absolute', top: 8, left: 8, background: cond.bg, color: cond.color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
          {vehicle.condition?.toUpperCase() || 'N/A'}
        </span>
        {isWinning && (
          <span style={{ position: 'absolute', top: 8, right: 8, background: '#1a3d76', color: '#f1bb25', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
            WINNING
          </span>
        )}
        {myBid && !isWinning && (
          <span style={{ position: 'absolute', top: 8, right: 8, background: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
            OUTBID
          </span>
        )}
        {/* Store avatar overlay */}
        <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
          <StoreAvatar storeId={storeId} size={28} />
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
          {vehicle.trim} · {parseInt(vehicle.mileage || 0).toLocaleString()} mi · {vehicle.color}
        </p>
        {vehicle.vin && (
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9ca3af', background: '#f3f4f6', borderRadius: 4, padding: '2px 6px', display: 'inline-block', marginBottom: 10 }}>
            {vehicle.vin}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>
              High bid
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: highBid ? '#1a3d76' : '#9ca3af' }}>
              {highBid ? `$${highBid.toLocaleString()}` : 'No bids'}
            </div>
          </div>
          {myBid && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>My bid</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isWinning ? '#065f46' : '#991b1b' }}>
                ${myBid.amount.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, padding: '8px 12px', background: '#f5f6f8', borderRadius: 8, fontSize: 12, color: '#6b7280', textAlign: 'center', fontWeight: 500 }}>
          Click to view details & bid
        </div>
      </div>
    </div>
  );
}

export default function AuctionFloor() {
  const { user } = useAuth();
  const { data, getHighBid, getMyBid } = useData();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [filter, setFilter] = useState('all');

  const activeVehicles = data.vehicles.filter(v => v.status === 'active');
  const myBids = activeVehicles.filter(v => getMyBid(v.id, user.id));
  const winning = myBids.filter(v => {
    const high = getHighBid(v.id);
    const my = getMyBid(v.id, user.id);
    return my && high && my.amount >= high;
  });

  const filtered = filter === 'my' ? myBids : filter === 'winning' ? winning : activeVehicles;

  const isMobile = window.innerWidth < 640;

  return (
    <div>
      <div className="page-header">
        <h1>Auction Floor</h1>
        <p>{data.auction.isOpen ? `${activeVehicles.length} vehicles available — click any car to view details and bid` : 'The auction is currently closed.'}</p>
      </div>

      {data.auction.isOpen && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Cars available</div>
              <div className="stat-value">{activeVehicles.length}</div>
              <div className="stat-sub">this auction</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">My bids</div>
              <div className="stat-value">{myBids.length}</div>
              <div className="stat-sub">{user.name}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Currently winning</div>
              <div className="stat-value" style={{ color: '#065f46' }}>{winning.length}</div>
              <div className="stat-sub">high bid</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[['all', 'All cars'], ['my', 'My bids'], ['winning', 'Winning']].map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${filter === key ? '#1a3d76' : '#e5e7eb'}`, background: filter === key ? '#1a3d76' : '#fff', color: filter === key ? '#fff' : '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <p>No vehicles found</p>
              <span>Try a different filter</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(270px, 100%), 1fr))', gap: 16 }}>
              {filtered.map(v => (
                <VehicleCard key={v.id} vehicle={v} storeId={user.id} onClick={() => setSelectedVehicle(v)} />
              ))}
            </div>
          )}
        </>
      )}

      {!data.auction.isOpen && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 8 }}>No active auction</p>
          <span style={{ fontSize: 14, color: '#9ca3af' }}>TRI-STATE will open the next auction when ready.</span>
        </div>
      )}

      {selectedVehicle && (
        <VehicleModal
          vehicle={selectedVehicle}
          storeId={user.id}
          storeName={user.name}
          isOpen={data.auction.isOpen}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}
