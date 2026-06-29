import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StoreAvatar } from '../components/StoreAvatar';
import { useData } from '../context/DataContext';
import { VehicleCard, AuctionCountdownPill } from '../components/VehicleCard';
import VehicleDetailModal from '../components/VehicleDetailModal';

// ── BidStrip — inline below each VehicleCard ─────────────────────────────────
function BidStrip({ vehicleId, userId, locationId, isOpen }) {
  const { placeBid, getMyBid, getHighBid } = useData();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const highBid = getHighBid(vehicleId);
  const myBid = getMyBid(vehicleId, userId);
  const isWinning = myBid && highBid && myBid.amount >= highBid;

  const handleBid = async (e) => {
    e.preventDefault();
    const val = parseInt(amount, 10);
    if (!val || val < 100) { setError('Enter a valid amount (min $100).'); return; }
    if (highBid && val <= highBid) {
      setError(`Must exceed current high bid of $${highBid.toLocaleString()}.`);
      return;
    }
    try {
      await placeBid(vehicleId, userId, locationId, val);
      setSuccess(true);
      setAmount('');
      setError('');
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError('Bid failed: ' + (err.message || 'Unknown error'));
    }
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
                <StoreAvatar locationId={locationId} size={16} />
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
  const [showMonitor, setShowMonitor] = useState(false);

  const [detailModal, setDetailModal] = useState(null);
  const canBid = user.role === 'bidder';

  const activeVehicles = data.vehicles.filter(v => v.status === 'in_auction');
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
          {/* Controls: filter pills + view toggle + monitor button */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
              {(canBid ? [['all', 'All cars'], ['my', 'My bids'], ['winning', 'Winning']] : [['all', 'All cars']]).map(([key, label]) => (
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
            <button
              onClick={() => setShowMonitor(v => !v)}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                border: '1.5px solid', borderColor: showMonitor ? '#0d2550' : '#e5e7eb',
                background: showMonitor ? '#0d2550' : '#fff',
                color: showMonitor ? '#e8b84b' : '#374151',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 10, color: showMonitor ? '#e8b84b' : '#ef4444' }}>●</span>
              Live Monitor
            </button>
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

          {/* Vehicles + optional monitor panel */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
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
                const bidCount = data.bids.filter(b => b.vehicleId === v.id).length;

                return (
                  <div key={v.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Card — no bottom radius, connects to bid strip */}
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
                          isWinning
                            ? <span style={{ background: '#0d2550', color: '#e8b84b', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>WINNING</span>
                            : myBid
                              ? <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>OUTBID</span>
                              : null
                        }
                        pricePill={<AuctionCountdownPill closeDate={data.auction?.closeDate} />}
                      >
                        {/* Bid count + details button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            {bidCount === 0 ? '0 bids' : `${bidCount} bid${bidCount !== 1 ? 's' : ''}`}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setDetailModal(v); }}
                            title="View details"
                            style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
                          >🔍</button>
                        </div>
                      </VehicleCard>
                    </div>
                    {canBid ? (
                      <BidStrip
                        vehicleId={v.id}
                        userId={user.id}
                        locationId={user.locationId}
                        isOpen={data.auction.isOpen}
                      />
                    ) : (
                      <ReadOnlyBidStrip vehicleId={v.id} highBid={highBid} bidCount={bidCount} bids={data.bids} locations={data.locations} />
                    )}
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
                const bidCount = data.bids.filter(b => b.vehicleId === v.id).length;

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
                          : <AuctionCountdownPill closeDate={data.auction?.closeDate} />
                    }
                    pricePill={null}
                  >
                    {/* Inline bid strip */}
                    <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #f3f4f6', background: '#f8faff' }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={e => { e.stopPropagation(); setDetailModal(v); }}
                          title="View details"
                          style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
                        >🔍</button>
                        <div>
                          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>High bid</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: highBid ? '#0d2550' : '#9ca3af' }}>
                            {highBid ? `$${highBid.toLocaleString()}` : 'No bids'}
                          </div>
                          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                            {bidCount === 0 ? '0 bids' : `${bidCount} bid${bidCount !== 1 ? 's' : ''}`}
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
                        {canBid
                          ? <ListBidForm vehicleId={v.id} userId={user.id} locationId={user.locationId} isOpen={data.auction.isOpen} highBid={highBid} myBid={myBid} />
                          : highBid && (
                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Leader</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2550' }}>
                                {(() => { const top = (data.bids || []).filter(b => b.vehicleId === v.id).reduce((t, b) => (!t || b.amount > t.amount) ? b : t, null); return data.locations.find(l => l.id === top?.locationId)?.name || '—'; })()}
                              </div>
                            </div>
                          )
                        }
                      </div>
                    </div>
                  </VehicleCard>
                );
              })}
            </div>
          )}
          </div>{/* end flex:1 */}
          {showMonitor && (
            <BidMonitorPanel
              vehicles={activeVehicles}
              bids={data.bids}
              locations={data.locations}
              onClose={() => setShowMonitor(false)}
            />
          )}
          </div>{/* end flex row */}
        </>
      )}

      {!data.auction.isOpen && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🔒</div>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 8 }}>No active auction</p>
          <span style={{ fontSize: 14, color: '#9ca3af' }}>TRI-STATE will open the next auction when ready.</span>
        </div>
      )}

      {detailModal && (
        <VehicleDetailModal vehicle={detailModal} onClose={() => setDetailModal(null)} />
      )}
    </div>
  );
}

// ── Read-only bid strip for non-bidder grid cards ────────────────────────────
function ReadOnlyBidStrip({ vehicleId, highBid, bidCount, bids, locations }) {
  const leader = (bids || [])
    .filter(b => b.vehicleId === vehicleId)
    .reduce((top, b) => (!top || b.amount > top.amount) ? b : top, null);
  const leaderName = leader ? (locations || []).find(l => l.id === leader.locationId)?.name || '—' : null;

  return (
    <div style={{
      background: '#0d2550', borderRadius: '0 0 12px 12px',
      padding: '10px 14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
            High bid
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: highBid ? '#e8b84b' : '#4b6587' }}>
            {highBid ? `$${highBid.toLocaleString()}` : 'No bids'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
            {bidCount} bid{bidCount !== 1 ? 's' : ''}
          </div>
          {leaderName && (
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{leaderName}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Side panel bid monitor ────────────────────────────────────────────────────
function BidMonitorPanel({ vehicles, bids, locations, onClose }) {
  const enriched = vehicles.map(v => {
    const vBids = (bids || []).filter(b => b.vehicleId === v.id);
    const highBid = vBids.reduce((max, b) => b.amount > max ? b.amount : max, 0);
    const leader = vBids.reduce((top, b) => (!top || b.amount > top.amount) ? b : top, null);
    const leaderName = leader ? (locations || []).find(l => l.id === leader.locationId)?.name || '—' : null;
    const latestAt = vBids.reduce((latest, b) => {
      const t = new Date(b.placedAt || 0).getTime();
      return t > latest ? t : latest;
    }, 0);
    return { ...v, vBids, highBid: highBid || null, leader, leaderName, latestAt };
  }).sort((a, b) => b.latestAt - a.latestAt);

  const totalBids = (bids || []).length;

  return (
    <div style={{
      width: 290, flexShrink: 0, background: '#0d2550', borderRadius: 12, overflow: 'hidden',
      position: 'sticky', top: 0, alignSelf: 'flex-start',
      maxHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #1e3a5f' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, color: '#ef4444' }}>●</span>
              Live Monitor
            </div>
            <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 2 }}>
              {totalBids} total bid{totalBids !== 1 ? 's' : ''} · {vehicles.length} vehicles
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>
      </div>
      {/* Vehicle rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {enriched.map((v, i) => (
          <div key={v.id} style={{
            padding: '11px 16px',
            borderBottom: '1px solid #1e3a5f',
            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {v.year} {v.make} {v.model}
                </div>
                {v.leader ? (
                  <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 2 }}>
                    {v.vBids.length} bid{v.vBids.length !== 1 ? 's' : ''} · {v.leaderName}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#374b66', marginTop: 2 }}>No bids yet</div>
                )}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: v.highBid ? '#e8b84b' : '#374b66', flexShrink: 0, lineHeight: 1.1 }}>
                {v.highBid ? `$${v.highBid.toLocaleString()}` : '—'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Compact bid form for list view ────────────────────────────────────────────
function ListBidForm({ vehicleId, userId, locationId, isOpen, highBid, myBid }) {
  const { placeBid } = useData();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return <div style={{ fontSize: 12, color: '#9ca3af' }}>Auction closed</div>;

  const handleBid = async (e) => {
    e.preventDefault();
    const val = parseInt(amount, 10);
    if (!val || val < 100) { setError('Min $100'); return; }
    if (highBid && val <= highBid) { setError(`Must exceed $${highBid.toLocaleString()}`); return; }
    try {
      await placeBid(vehicleId, userId, locationId, val);
      setSuccess(true); setAmount(''); setError('');
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError('Bid failed: ' + (err.message || 'Unknown error'));
    }
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
