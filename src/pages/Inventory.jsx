import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { VehicleCard, AuctionCountdownPill } from '../components/VehicleCard';

// ── Detail modal ──────────────────────────────────────────────────────────────
function VehicleDetailModal({ vehicle, mileage, onBuyNow, onClose }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const isInAuction = vehicle.status === 'in_auction';
  const photos = Array.isArray(vehicle.photos) && vehicle.photos.length > 0 ? vehicle.photos : null;
  const mileageDisplay = mileage != null ? `${parseInt(mileage).toLocaleString()} mi` : null;
  const listPrice = vehicle.list_price ? `$${parseFloat(vehicle.list_price).toLocaleString()}` : null;
  const specs = [vehicle.color, mileageDisplay].filter(Boolean).join(' · ');

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 32, paddingBottom: 32, overflowY: 'auto' }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, width: '100%', padding: 0, overflow: 'hidden', borderRadius: 14 }}>
        {/* Photo */}
        <div style={{ position: 'relative', background: '#f1f5f9', height: 264, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {photos
            ? <img src={photos[photoIdx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ fontSize: 40, fontWeight: 900, color: '#cbd5e1', letterSpacing: -1 }}>{(vehicle.make || '').slice(0, 3).toUpperCase()}</div>
          }
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          {photos && photos.length > 1 && (
            <>
              <button onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <button onClick={() => setPhotoIdx(i => (i + 1) % photos.length)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
              <div style={{ position: 'absolute', bottom: 10, right: 14, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>{photoIdx + 1} / {photos.length}</div>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {photos && photos.length > 1 && (
          <div style={{ display: 'flex', gap: 6, padding: '8px 16px', background: '#f8fafc', overflowX: 'auto' }}>
            {photos.map((p, i) => (
              <img key={i} src={p} alt="" onClick={() => setPhotoIdx(i)} style={{ width: 54, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0, cursor: 'pointer', border: i === photoIdx ? '2px solid #0d2550' : '2px solid transparent', opacity: i === photoIdx ? 1 : 0.65 }} />
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Hero identity */}
          <div>
            <div style={{ fontWeight: 800, fontSize: 21, color: '#111827', lineHeight: 1.15 }}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
            {vehicle.trim && <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{vehicle.trim}</div>}
          </div>

          {/* Specs + status pill inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {specs && <span style={{ fontSize: 13, color: '#6b7280' }}>{specs}</span>}
            <span style={{ background: isInAuction ? '#dbeafe' : '#d1fae5', color: isInAuction ? '#1e40af' : '#065f46', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {isInAuction ? 'In Auction' : 'Available'}
            </span>
          </div>

          {/* VIN */}
          {vehicle.vin && (
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 10px', letterSpacing: '.04em', display: 'inline-block', width: 'fit-content' }}>
              {vehicle.vin}
            </div>
          )}

          {/* List price */}
          {listPrice && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 2 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>List Price</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0d2550', lineHeight: 1 }}>{listPrice}</div>
            </div>
          )}

          {/* Disclosure */}
          {vehicle.disclosure_notes && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700 }}>Disclosure: </span>{vehicle.disclosure_notes}
            </div>
          )}

          {/* Notes */}
          {vehicle.notes && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Description</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{vehicle.notes}</div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => { if (!isInAuction) { onClose(); onBuyNow(vehicle); } }}
            disabled={isInAuction}
            style={{ marginTop: 6, padding: '14px 0', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 9, cursor: isInAuction ? 'not-allowed' : 'pointer', background: isInAuction ? '#f1f5f9' : '#0d2550', color: isInAuction ? '#94a3b8' : '#fff' }}
          >
            {isInAuction ? 'Currently in Auction' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Inventory() {
  const { user } = useAuth();
  const { data } = useData();
  const [vehicles, setVehicles] = useState([]);
  const [mileageMap, setMileageMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyTarget, setBuyTarget] = useState(null);
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const orgId = user?.org_id;

  const CONDITION_SCORE = { excellent: 5, good: 4, fair: 3, poor: 2 };
  const CONDITION_COLOR = { 5: '#065f46', 4: '#1e40af', 3: '#92400e', 2: '#991b1b' };
  const conditionScore = (c) => c ? (CONDITION_SCORE[c.toLowerCase()] ?? null) : null;
  const conditionLabel = (c) => c ? (c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()) : null;

  useEffect(() => {
    if (!orgId) return;

    async function fetchVehicles() {
      const { data: vehicleData2, error } = await supabase
        .from('vehicles')
        .select('*')
        .in('status', ['ready', 'in_auction'])
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        const vehicleData = vehicleData2 || [];
        setVehicles(vehicleData);
        if (vehicleData.length > 0) {
          const vehicleIds = vehicleData.map(v => v.id);
          const { data: mileageRows } = await supabase
            .from('mileage_log')
            .select('vehicle_id, reading, logged_at')
            .in('vehicle_id', vehicleIds)
            .order('logged_at', { ascending: false });
          const map = {};
          mileageRows?.forEach(r => { if (!map[r.vehicle_id]) map[r.vehicle_id] = r.reading; });
          setMileageMap(map);
        }
      }
      setLoading(false);
    }

    fetchVehicles();

    const channel = supabase
      .channel('inventory-vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles', filter: `org_id=eq.${orgId}` }, () => { fetchVehicles(); })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [orgId]);

  const listed = vehicles.filter(v => v.status === 'ready');
  const inAuction = vehicles.filter(v => v.status === 'in_auction');
  const availablePrices = listed.map(v => parseFloat(v.list_price)).filter(p => p > 0);
  const avgAsk = availablePrices.length ? Math.round(availablePrices.reduce((s, p) => s + p, 0) / availablePrices.length) : null;
  const lowestAsk = availablePrices.length ? Math.min(...availablePrices) : null;

  const filteredVehicles = vehicles.filter(v => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (v.make||'').toLowerCase().includes(q)
        || (v.model||'').toLowerCase().includes(q)
        || (v.vin||'').toLowerCase().includes(q)
        || (v.color||'').toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#9ca3af' }}>
      Loading inventory…
    </div>
  );

  if (error) return (
    <div style={{ background: '#fee2e2', color: '#991b1b', padding: '16px 20px', borderRadius: 10, marginTop: 20 }}>
      Failed to load inventory: {error}
    </div>
  );

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', margin: '-20px -16px', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Inventory</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 0 }}>Available vehicles for purchase — updates live</p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Available Now', value: listed.length, color: '#065f46', accent: '#10b981', suffix: ' cars' },
          { label: 'In Auction',    value: inAuction.length, color: '#1e40af', accent: '#3b82f6', suffix: ' live' },
          { label: 'Avg Ask',       value: avgAsk ? `$${avgAsk.toLocaleString()}` : '—', color: '#0d2550', accent: '#0d2550' },
          { label: 'Lowest Ask',    value: lowestAsk ? `$${lowestAsk.toLocaleString()}` : '—', color: '#92400e', accent: '#e8b84b' },
        ].map(({ label, value, color, accent, suffix }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: `3px solid ${accent}`, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>
              {value}{typeof value === 'number' && suffix ? <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', marginLeft: 2 }}>{suffix}</span> : null}
            </div>
          </div>
        ))}
      </div>

      {/* Controls: search + filter pills + view toggle */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by make, model, VIN, color…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all','All'], ['ready','Available'], ['in_auction','In Auction']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: statusFilter === val ? '#0d2550' : '#e5e7eb',
              background: statusFilter === val ? '#0d2550' : '#fff',
              color: statusFilter === val ? '#fff' : '#6b7280',
              transition: 'all 0.12s',
            }}>{label}</button>
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

      {/* Vehicle grid / list */}
      {filteredVehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🚗</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No vehicles found</div>
          <div style={{ fontSize: 13 }}>{search ? 'Try a different search term' : 'Check back when new inventory is added'}</div>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filteredVehicles.map(v => {
            const isInAuction = v.status === 'in_auction';
            const bidCount = data.bids.filter(b => b.vehicleId === v.id).length;
            return (
              <VehicleCard
                key={v.id}
                vehicle={v}
                mileage={mileageMap[v.id] ?? null}
                auctionCloseDate={data.auction?.closeDate}
                badge={isInAuction ? null : undefined}
                pricePill={isInAuction ? <AuctionCountdownPill closeDate={data.auction?.closeDate} /> : undefined}
                onDetails={() => setDetailVehicle(v)}
                actionButton={
                  <button
                    onClick={e => { e.stopPropagation(); !isInAuction && setBuyTarget(v); }}
                    disabled={isInAuction}
                    style={{
                      width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 700,
                      border: 'none', borderRadius: 8,
                      cursor: isInAuction ? 'not-allowed' : 'pointer',
                      background: isInAuction ? '#1e40af' : '#0d2550',
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}
                  >
                    {isInAuction ? '🔨 Bidding Open' : '🛒 Buy Now'}
                  </button>
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                  {v.condition && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{
                        background: CONDITION_COLOR[conditionScore(v.condition)] || '#6b7280',
                        color: '#fff', fontWeight: 800, fontSize: 12,
                        width: 22, height: 22, borderRadius: 6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{conditionScore(v.condition)}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{conditionLabel(v.condition)}</span>
                    </div>
                  )}
                  {isInAuction && (
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>
                      {bidCount === 0 ? '0 bids' : `${bidCount} bid${bidCount !== 1 ? 's' : ''}`}
                    </div>
                  )}
                </div>
              </VehicleCard>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredVehicles.map(v => {
            const isInAuction = v.status === 'in_auction';
            const bidCount = data.bids.filter(b => b.vehicleId === v.id).length;
            return (
              <VehicleCard
                key={v.id}
                variant="list"
                vehicle={v}
                mileage={mileageMap[v.id] ?? null}
                auctionCloseDate={data.auction?.closeDate}
                badge={isInAuction ? <AuctionCountdownPill closeDate={data.auction?.closeDate} /> : undefined}
                onClick={() => setDetailVehicle(v)}
                actionButton={
                  <button
                    onClick={e => { e.stopPropagation(); !isInAuction && setBuyTarget(v); }}
                    disabled={isInAuction}
                    style={{
                      padding: '7px 14px', fontSize: 12, fontWeight: 700,
                      border: 'none', borderRadius: 8,
                      cursor: isInAuction ? 'not-allowed' : 'pointer',
                      background: isInAuction ? '#F3F4F6' : '#0d2550',
                      color: isInAuction ? '#9ca3af' : '#fff',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isInAuction ? 'In Auction' : 'Buy Now'}
                  </button>
                }
              >
                {isInAuction && (
                  <div style={{ padding: '6px 16px 10px', fontSize: 11, color: '#9ca3af' }}>
                    {bidCount === 0 ? '0 bids' : `${bidCount} bid${bidCount !== 1 ? 's' : ''}`}
                    {v.floor_price ? ` · floor $${parseFloat(v.floor_price).toLocaleString()}` : ''}
                  </div>
                )}
              </VehicleCard>
            );
          })}
        </div>
      )}

      {/* Vehicle detail modal */}
      {detailVehicle && (
        <VehicleDetailModal
          vehicle={detailVehicle}
          mileage={mileageMap[detailVehicle.id] ?? null}
          onBuyNow={setBuyTarget}
          onClose={() => setDetailVehicle(null)}
        />
      )}

      {/* Buy Now confirmation modal */}
      {buyTarget && (
        <div className="modal-overlay" onClick={() => setBuyTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>Confirm Purchase</h2>
              <button onClick={() => setBuyTarget(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 4 }}>
                {buyTarget.year} {buyTarget.make} {buyTarget.model}
              </div>
              {buyTarget.trim && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>{buyTarget.trim}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <Detail label="VIN" value={buyTarget.vin || '—'} mono />
                <Detail label="Color" value={buyTarget.color || '—'} />
                <Detail label="List Price" value={buyTarget.list_price ? `$${parseFloat(buyTarget.list_price).toLocaleString()}` : '—'} highlight />
              </div>
              {buyTarget.disclosure_notes && (
                <div style={{ background: '#fff8e7', border: '1px solid #f1bb25', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 16 }}>
                  <strong>Disclosure:</strong> {buyTarget.disclosure_notes}
                </div>
              )}
              <div className="alert alert-info">
                By clicking confirm, you are committing to purchase this vehicle at the listed price.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setBuyTarget(null)}>Cancel</button>
              <button className="btn-navy" onClick={() => { console.log('Buy Now confirmed:', buyTarget.id); setBuyTarget(null); }}>
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
