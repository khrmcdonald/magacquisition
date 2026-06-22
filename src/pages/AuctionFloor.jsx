import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StoreAvatar } from '../components/StoreAvatar';
import { useData } from '../context/DataContext';
import { VehicleCard } from '../components/VehicleCard';

// ── BidStrip — inline below each VehicleCard ─────────────────────────────────
function BidStrip({ vehicleId, storeId, storeName, isOpen }) {
  const { placeBid, getMyBid, getHighBid, checkAndAwardBadges } = useData();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const highBid = getHighBid(vehicleId);
  const myBid = getMyBid(vehicleId, storeId);
  const isWinning = myBid && highBid && myBid.amount >= highBid;

  const handleBid = (e) => {
    e.preventDefault();
    const val = parseInt(amount, 10);
    if (!val || val < 100) { setError('Enter a valid amount (min $100).'); return; }
    if (highBid && val <= highBid) {
      setError(`Must exceed current high bid of $${highBid.toLocaleString()}.`);
      return;
    }
    placeBid(vehicleId, storeId, storeName, val);
    checkAndAwardBadges(storeId, val);
    setSuccess(true);
    setAmount('');
    setError('');
    setTimeout(() => setSuccess(false), 2500);
  };

  return (
    <div style={{
      background: '#f8faff',
      border: '1.5px solid #e8eaed',
      borderRadius: '0 0 12px 12px',
      borderTop: 'none',
      padding: '12px 14px 14px',
    }}>
      {/* High bid + My bid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>High bid</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: highBid ? '#0d2550' : '#9ca3af' }}>
            {highBid ? `$${highBid.toLocaleString()}` : 'No bids'}
          </div>
        </div>
        <div style={{
          background: myBid ? (isWinning ? '#f0fdf4' : '#fef2f2') : '#fff',
          border: `1px solid ${myBid ? (isWinning ? '#86efac' : '#fca5a5') : '#e5e7eb'}`,
          borderRadius: 8, padding: '10px 12px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>My bid</div>
          {myBid ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 800, color: isWinning ? '#065f46' : '#991b1b' }}>
                ${myBid.amount.toLocaleString()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <StoreAvatar storeId={storeId} size={16} />
                <span style={{ fontSize: 10, fontWeight: 700, color: isWinning ? '#065f46' : '#991b1b' }}>
                  {isWinning ? '✓ Winning' : '✗ Outbid'}
                </span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 18, fontWeight: 800, color: '#9ca3af' }}>—</div>
          )}
        </div>
      </div>

      {/* Bid form */}
      {isOpen ? (
        <form onSubmit={handleBid}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#374151', fontWeight: 700, fontSize: 15 }}>$</span>
              <input
                type="number"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError(''); }}
                placeholder={highBid ? `>${highBid.toLocaleString()}` : 'Enter bid'}
                style={{
                  paddingLeft: 24, fontSize: 14, fontWeight: 600, height: 40,
                  width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8,
                  boxSizing: 'border-box', outline: 'none',
                }}
                min={1}
              />
            </div>
            <button
              type="submit"
              style={{
                height: 40, padding: '0 18px', fontSize: 14, fontWeight: 700,
                background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8,
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              {myBid ? 'Update' : 'Bid'}
            </button>
          </div>
          {error && <div style={{ marginTop: 6, color: '#991b1b', fontSize: 12 }}>⚠ {error}</div>}
          {success && <div style={{ marginTop: 6, color: '#065f46', fontSize: 12, fontWeight: 600 }}>✓ Bid placed!</div>}
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '8px', background: '#f9fafb', borderRadius: 8, color: '#9ca3af', fontSize: 12 }}>
          Auction closed
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AuctionFloor() {
  const { user } = useAuth();
  const { data, getHighBid, getMyBid } = useData();
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const activeVehicles = data.vehicles.filter(v => v.status === 'active');
  const myBids = activeVehicles.filter(v => getMyBid(v.id, user.id));
  const winning = myBids.filter(v => {
    const high = getHighBid(v.id);
    const my = getMyBid(v.id, user.id);
    return my && high && my.amount >= high;
  });

  const filtered = filter === 'my' ? myBids : filter === 'winning' ? winning : activeVehicles;

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', margin: '-20px -16px', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Auction Floor</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 0 }}>
          {data.auction.isOpen
            ? `${activeVehicles.length} vehicles in auction — bid directly on each card`
            : 'The auction is currently closed.'}
        </p>
      </div>

      {data.auction.isOpen && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: '3px solid #0d2550', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Cars available</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0d2550' }}>{activeVehicles.length}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>this auction</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: '3px solid #e8b84b', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>My bids</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0d2550' }}>{myBids.length}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{user.name}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: '3px solid #10b981', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Currently winning</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#065f46' }}>{winning.length}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>high bid</div>
            </div>
          </div>

          {/* Controls: filter pills + view toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
              {[['all', 'All cars'], ['my', 'My bids'], ['winning', 'Winning']].map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)} style={{
                  padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: filter === key ? '#0d2550' : '#e5e7eb',
                  background: filter === key ? '#0d2550' : '#fff',
                  color: filter === key ? '#fff' : '#374151',
                  transition: 'all 0.12s',
                }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', border: '1.5px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
              {[['grid','⊞'],['list','☰']].map(([mode, icon]) => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 14,
                  background: viewMode === mode ? '#0d2550' : '#fff',
                  color: viewMode === mode ? '#fff' : '#6b7280',
                  borderRight: mode === 'grid' ? '1px solid #e5e7eb' : 'none',
                }}>{icon}</button>
              ))}
            </div>
          </div>

          {/* Vehicles */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No vehicles found</div>
              <div style={{ fontSize: 13 }}>Try a different filter</div>
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 16 }}>
              {filtered.map(v => {
                const highBid = getHighBid(v.id);
                const myBid = getMyBid(v.id, user.id);
                const isWinning = myBid && highBid && myBid.amount >= highBid;
                const conditionColors = {
                  excellent: { bg: '#d1fae5', color: '#065f46' },
                  good:      { bg: '#dbeafe', color: '#1e40af' },
                  fair:      { bg: '#fef3c7', color: '#92400e' },
                  poor:      { bg: '#fee2e2', color: '#991b1b' },
                };
                const cond = conditionColors[v.condition?.toLowerCase()] || conditionColors.good;

                return (
                  <div key={v.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Card — no bottom radius, connects to BidStrip */}
                    <div style={{
                      borderRadius: '12px 12px 0 0',
                      overflow: 'hidden',
                      border: `1.5px solid ${isWinning ? '#0d2550' : '#e5e7eb'}`,
                      borderBottom: 'none',
                      boxShadow: isWinning ? '0 0 0 2px rgba(13,37,80,0.1)' : 'none',
                      transition: 'border-color 0.15s',
                    }}>
                      <VehicleCard
                        vehicle={v}
                        auctionCloseDate={data.auction?.closeDate}
                        highlighted={isWinning}
                        badge={
                          <span style={{
                            background: '#0d2550', color: '#fff',
                            padding: '3px 10px', borderRadius: 20,
                            fontSize: 11, fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e8b84b' }} />
                            {v.condition ? (
                              <span style={{ background: cond.bg, color: cond.color, padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>
                                {v.condition}
                              </span>
                            ) : 'In Auction'}
                          </span>
                        }
                        pricePill={
                          isWinning
                            ? <span style={{ background: '#0d2550', color: '#e8b84b', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>WINNING</span>
                            : myBid
                              ? <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>OUTBID</span>
                              : null
                        }
                      />
                    </div>
                    {/* Bid strip — no top radius */}
                    <BidStrip
                      vehicleId={v.id}
                      storeId={user.id}
                      storeName={user.name}
                      isOpen={data.auction.isOpen}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            // List view
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(v => {
                const highBid = getHighBid(v.id);
                const myBid = getMyBid(v.id, user.id);
                const isWinning = myBid && highBid && myBid.amount >= highBid;

                return (
                  <VehicleCard
                    key={v.id}
                    variant="list"
                    vehicle={v}
                    highlighted={isWinning}
                    badge={
                      isWinning
                        ? <span style={{ background: '#0d2550', color: '#e8b84b', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>WINNING</span>
                        : myBid
                          ? <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>OUTBID</span>
                          : <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>In Auction</span>
                    }
                    pricePill={null}
                  >
                    {/* Inline bid strip */}
                    <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #f3f4f6', background: '#f8faff' }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>High bid</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: highBid ? '#0d2550' : '#9ca3af' }}>
                            {highBid ? `$${highBid.toLocaleString()}` : 'No bids'}
                          </div>
                        </div>
                        {myBid && (
                          <div>
                            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>My bid</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: isWinning ? '#065f46' : '#991b1b' }}>
                              ${myBid.amount.toLocaleString()}
                            </div>
                          </div>
                        )}
                        <ListBidForm vehicleId={v.id} storeId={user.id} storeName={user.name} isOpen={data.auction.isOpen} highBid={highBid} myBid={myBid} />
                      </div>
                    </div>
                  </VehicleCard>
                );
              })}
            </div>
          )}
        </>
      )}

      {!data.auction.isOpen && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🔒</div>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 8 }}>No active auction</p>
          <span style={{ fontSize: 14, color: '#9ca3af' }}>TRI-STATE will open the next auction when ready.</span>
        </div>
      )}
    </div>
  );
}

// ── Compact bid form for list view ────────────────────────────────────────────
function ListBidForm({ vehicleId, storeId, storeName, isOpen, highBid, myBid }) {
  const { placeBid, checkAndAwardBadges } = useData();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return <div style={{ fontSize: 12, color: '#9ca3af' }}>Auction closed</div>;

  const handleBid = (e) => {
    e.preventDefault();
    const val = parseInt(amount, 10);
    if (!val || val < 100) { setError('Min $100'); return; }
    if (highBid && val <= highBid) { setError(`Must exceed $${highBid.toLocaleString()}`); return; }
    placeBid(vehicleId, storeId, storeName, val);
    checkAndAwardBadges(storeId, val);
    setSuccess(true); setAmount(''); setError('');
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <form onSubmit={handleBid} style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#374151', fontWeight: 700, fontSize: 13 }}>$</span>
        <input
          type="number"
          value={amount}
          onChange={e => { setAmount(e.target.value); setError(''); }}
          placeholder={highBid ? `>${highBid.toLocaleString()}` : 'Bid'}
          style={{ paddingLeft: 20, fontSize: 13, fontWeight: 600, height: 36, width: 130, border: '1.5px solid #e5e7eb', borderRadius: 8, boxSizing: 'border-box', outline: 'none' }}
          min={1}
        />
      </div>
      <button type="submit" style={{ height: 36, padding: '0 14px', fontSize: 13, fontWeight: 700, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
        {myBid ? 'Update' : 'Bid'}
      </button>
      {error && <span style={{ color: '#991b1b', fontSize: 11 }}>{error}</span>}
      {success && <span style={{ color: '#065f46', fontSize: 11, fontWeight: 700 }}>✓</span>}
    </form>
  );
}
