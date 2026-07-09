import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';
import { VehicleCard, AuctionCountdownPill } from '../components/VehicleCard';

function Detail({ label, value, mono, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: mono ? 11 : 13, fontWeight: highlight ? 700 : 500, color: highlight ? '#0d2550' : '#374151', fontFamily: mono ? 'monospace' : undefined }}>
        {value}
      </div>
    </div>
  );
}

export default function Inventory() {
  const { user } = useAuth();
  const { data, updateVehicle } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [vehicles, setVehicles]         = useState([]);
  const [mileageMap, setMileageMap]     = useState({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [buyTarget, setBuyTarget]       = useState(null);
  const [buyConfirming, setBuyConfirming] = useState(false);
  const [panelVehicle, setPanelVehicle] = useState(null);
  const [panelPhotoIdx, setPanelPhotoIdx] = useState(0);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode]         = useState('grid');

  const orgId      = user?.org_id;
  const isWholesale = user?.role === 'wholesale' || user?.role === 'admin';

  const CONDITION_SCORE = { excellent: 5, good: 4, fair: 3, poor: 2 };
  const CONDITION_COLOR = { 5: '#065f46', 4: '#1e40af', 3: '#92400e', 2: '#991b1b' };
  const conditionScore = (c) => c ? (CONDITION_SCORE[c.toLowerCase()] ?? null) : null;
  const conditionLabel = (c) => c ? (c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()) : null;

  // list_price is the retail/Buy Now price; floor_price is the auction floor
  const askPrice = (v) => parseFloat(v.list_price || v.floor_price) || null;

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

  const listed     = vehicles.filter(v => v.status === 'ready');
  const inAuction  = vehicles.filter(v => v.status === 'in_auction');
  const availablePrices = listed.map(askPrice).filter(p => p > 0);
  const avgAsk     = availablePrices.length ? Math.round(availablePrices.reduce((s, p) => s + p, 0) / availablePrices.length) : null;
  const lowestAsk  = availablePrices.length ? Math.min(...availablePrices) : null;

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

  const pv = panelVehicle ? vehicles.find(v => v.id === panelVehicle.id) || panelVehicle : null;

  const openPanel  = (v) => { setPanelVehicle(v); setPanelPhotoIdx(0); };
  const closePanel = () => { setPanelVehicle(null); };

  const handleBuyNow = async () => {
    if (!buyTarget || buyConfirming) return;
    setBuyConfirming(true);
    try {
      const price = askPrice(buyTarget);
      const today = new Date().toISOString().split('T')[0];
      const buyer = data.profiles?.find(p => p.id === user?.id);
      const buyerName = buyer?.name || user?.email || 'Online Purchase';
      const cost = (parseFloat(buyTarget.purchase_price) || 0) + (parseFloat(buyTarget.overhead_costs) || 0) + (parseFloat(buyTarget.total_repair_costs) || 0);
      const gross = price != null && cost > 0 ? price - cost : null;
      await updateVehicle(buyTarget.id, {
        status: 'sold',
        soldPrice: price,
        soldDate: today,
        soldTo: buyerName,
        soldGross: gross,
      });
      showToast('Purchase confirmed! Vehicle moved to Sold.', 'success');
      setBuyTarget(null);
      closePanel();
    } catch (err) {
      showToast('Purchase failed: ' + err.message, 'error');
    }
    setBuyConfirming(false);
  };

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

  const pvIsInAuction = pv?.status === 'in_auction';
  const pvPhotos      = pv && Array.isArray(pv.photos) && pv.photos.length > 0 ? pv.photos : null;
  const pvBidCount    = pv ? (data.bids || []).filter(b => b.vehicleId === pv.id).length : 0;
  const pvMileage     = pv ? mileageMap[pv.id] ?? null : null;
  const pvAskPrice    = pv ? askPrice(pv) : null;

  const STATUS_FILTERS = [
    { val: 'all',        label: 'All',        count: vehicles.length },
    { val: 'ready',      label: 'Available',  count: listed.length },
    { val: 'in_auction', label: 'In Auction', count: inAuction.length },
  ];

  return (
    <div style={{ position: 'relative' }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Inventory</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 0 }}>Available vehicles for purchase — updates live</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Available Now', value: listed.length,    color: '#065f46', accent: '#10b981', suffix: ' cars' },
          { label: 'In Auction',    value: inAuction.length, color: '#1e40af', accent: '#3b82f6', suffix: ' live' },
          { label: 'Avg Ask',       value: avgAsk    ? `$${avgAsk.toLocaleString()}`    : '—', color: '#0d2550', accent: '#0d2550' },
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

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by make, model, VIN, color…"
            value={search}
            onChange={e => { setSearch(e.target.value); closePanel(); }}
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>

        {/* Status filter tabs — styled to match Acquisitions page */}
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 3, gap: 2 }}>
          {STATUS_FILTERS.map(({ val, label, count }) => (
            <button
              key={val}
              onClick={() => { setStatusFilter(val); closePanel(); }}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: statusFilter === val ? '#0d2550' : 'transparent',
                color: statusFilter === val ? '#fff' : '#6b7280',
                transition: 'all 0.12s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {label}
              <span style={{
                background: statusFilter === val ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                color: statusFilter === val ? '#fff' : '#9ca3af',
                fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 10,
              }}>{count}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', border: '1.5px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          {[['grid','⊞'],['list','☰']].map(([mode, icon]) => (
            <button key={mode} onClick={() => { setViewMode(mode); closePanel(); }} style={{
              padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 14,
              background: viewMode === mode ? '#0d2550' : '#fff',
              color: viewMode === mode ? '#fff' : '#6b7280',
              borderRight: mode === 'grid' ? '1px solid #e5e7eb' : 'none',
            }}>{icon}</button>
          ))}
        </div>
      </div>

      {/* Grid / List */}
      <div style={{ paddingRight: panelVehicle ? 460 : 0, transition: 'padding-right 0.2s' }}>
        {filteredVehicles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🚗</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No vehicles found</div>
            <div style={{ fontSize: 13 }}>{search ? 'Try a different search term' : 'Check back when new inventory is added'}</div>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {filteredVehicles.map(v => {
              const isInAuction = v.status === 'in_auction';
              const bidCount    = (data.bids || []).filter(b => b.vehicleId === v.id).length;
              const isActive    = panelVehicle?.id === v.id;
              const vAsk        = askPrice(v);
              return (
                <VehicleCard
                  key={v.id}
                  variant="grid"
                  vehicle={v}
                  mileage={mileageMap[v.id] ?? null}
                  highlighted={isActive}
                  auctionCloseDate={data.auction?.closeDate}
                  onTitleClick={() => navigate(`/acquisitions?v=${v.id}`)}
                  pricePill={isInAuction
                    ? <AuctionCountdownPill closeDate={data.auction?.closeDate} />
                    : vAsk ? <span style={{ background: '#f0f4fb', color: '#0d2550', fontWeight: 800, fontSize: 13, padding: '3px 10px', borderRadius: 20 }}>${vAsk.toLocaleString()}</span> : null
                  }
                  actionButton={
                    isWholesale ? (
                      <button
                        onClick={() => isActive ? closePanel() : openPanel(v)}
                        style={{ width: '100%', background: isActive ? '#0d2550' : '#fff', color: isActive ? '#fff' : '#0d2550', border: '1.5px solid #0d2550', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {isActive ? '← Viewing' : 'View Details'}
                      </button>
                    ) : (
                      isInAuction ? (
                        <button
                          onClick={() => isActive ? closePanel() : openPanel(v)}
                          style={{ width: '100%', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          🔨 Bidding Open · {bidCount} bid{bidCount !== 1 ? 's' : ''}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => isActive ? closePanel() : openPanel(v)}
                            style={{ flex: 1, background: isActive ? '#0d2550' : '#fff', color: isActive ? '#fff' : '#0d2550', border: '1.5px solid #0d2550', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                            {isActive ? '← Viewing' : 'Details'}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setBuyTarget(v); }}
                            style={{ flex: 2, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            🛒 Buy Now
                          </button>
                        </div>
                      )
                    )
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
                    {isInAuction && !isWholesale && (
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
              const bidCount    = (data.bids || []).filter(b => b.vehicleId === v.id).length;
              const isActive    = panelVehicle?.id === v.id;
              return (
                <VehicleCard
                  key={v.id}
                  variant="list"
                  vehicle={v}
                  mileage={mileageMap[v.id] ?? null}
                  highlighted={isActive}
                  auctionCloseDate={data.auction?.closeDate}
                  onTitleClick={() => navigate(`/acquisitions?v=${v.id}`)}
                  badge={isInAuction ? <AuctionCountdownPill closeDate={data.auction?.closeDate} /> : undefined}
                  onClick={() => isActive ? closePanel() : openPanel(v)}
                  actionButton={isWholesale ? null : (
                    <button
                      onClick={e => { e.stopPropagation(); !isInAuction && setBuyTarget(v); }}
                      disabled={isInAuction}
                      style={{
                        padding: '7px 14px', fontSize: 12, fontWeight: 700,
                        border: 'none', borderRadius: 8,
                        cursor: isInAuction ? 'not-allowed' : 'pointer',
                        background: isInAuction ? '#f3f4f6' : '#0d2550',
                        color: isInAuction ? '#9ca3af' : '#fff',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isInAuction ? 'In Auction' : 'Buy Now'}
                    </button>
                  )}
                >
                  {isInAuction && (
                    <div style={{ padding: '4px 16px 8px', fontSize: 11, color: '#9ca3af' }}>
                      {bidCount === 0 ? '0 bids' : `${bidCount} bid${bidCount !== 1 ? 's' : ''}`}
                      {v.floor_price ? ` · asking $${parseFloat(v.floor_price).toLocaleString()}` : ''}
                    </div>
                  )}
                </VehicleCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-out panel */}
      {pv && (
        <div style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: 460,
          background: '#fff', borderLeft: '1px solid #e5e7eb',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
          zIndex: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 18px 0' }}>
            <button onClick={closePanel}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: 20, width: 30, height: 30, cursor: 'pointer', fontSize: 18, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>

          <div style={{ padding: '4px 20px 0' }}>
            <div style={{ position: 'relative', background: '#f1f5f9', borderRadius: 10, overflow: 'hidden', height: 200 }}>
              {pvPhotos
                ? <img src={pvPhotos[panelPhotoIdx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: '#cbd5e1' }}>
                      {[pv.make?.[0], pv.model?.[0]].filter(Boolean).join('').toUpperCase()}
                    </span>
                  </div>
              }
              {pvPhotos && pvPhotos.length > 1 && (
                <>
                  <button onClick={() => setPanelPhotoIdx(i => (i - 1 + pvPhotos.length) % pvPhotos.length)}
                    style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                  <button onClick={() => setPanelPhotoIdx(i => (i + 1) % pvPhotos.length)}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                  <div style={{ position: 'absolute', bottom: 8, right: 10, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 8 }}>{panelPhotoIdx + 1} / {pvPhotos.length}</div>
                </>
              )}
            </div>
            {pvPhotos && pvPhotos.length > 1 && (
              <div style={{ display: 'flex', gap: 5, marginTop: 6, overflowX: 'auto' }}>
                {pvPhotos.map((p, i) => (
                  <img key={i} src={p} alt="" onClick={() => setPanelPhotoIdx(i)}
                    style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0, cursor: 'pointer', border: i === panelPhotoIdx ? '2px solid #0d2550' : '2px solid transparent', opacity: i === panelPhotoIdx ? 1 : 0.6 }} />
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: '14px 20px 0' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>
              {[pv.year, pv.make, pv.model].filter(Boolean).join(' ')}
            </div>
            {pv.trim && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{pv.trim}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {(() => {
                const parts = [pv.color, pv.engine, pv.condition, pvMileage != null ? `${parseInt(pvMileage).toLocaleString()} mi` : null].filter(Boolean);
                return parts.length > 0 ? <span style={{ fontSize: 12, color: '#6b7280' }}>{parts.join(' · ')}</span> : null;
              })()}
              <span style={{ background: pvIsInAuction ? '#dbeafe' : '#d1fae5', color: pvIsInAuction ? '#1e40af' : '#065f46', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                {pvIsInAuction ? 'In Auction' : 'Available'}
              </span>
            </div>
            {pv.vin && (
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                {pv.vin}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', margin: '14px 0 0' }} />

          <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pvIsInAuction ? (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Auction</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <AuctionCountdownPill closeDate={data.auction?.closeDate} />
                  <span style={{ fontSize: 13, color: '#6b7280' }}>
                    {pvBidCount === 0 ? 'No bids yet' : `${pvBidCount} bid${pvBidCount !== 1 ? 's' : ''} placed`}
                  </span>
                </div>
              </div>
            ) : pvAskPrice ? (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Asking Price</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: '#0d2550', lineHeight: 1 }}>
                  ${pvAskPrice.toLocaleString()}
                </div>
              </div>
            ) : null}

            {pv.disclosure_notes && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700 }}>Disclosure: </span>{pv.disclosure_notes}
              </div>
            )}

            {pv.notes && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Description</div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{pv.notes}</div>
              </div>
            )}

            {!isWholesale && !pvIsInAuction && (
              <button
                onClick={() => { closePanel(); setBuyTarget(pv); }}
                style={{ padding: '14px 0', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 9, cursor: 'pointer', background: '#0d2550', color: '#fff', marginTop: 4 }}
              >
                🛒 Buy Now{pvAskPrice ? ` — $${pvAskPrice.toLocaleString()}` : ''}
              </button>
            )}

            <button
              onClick={() => navigate(`/acquisitions?v=${pv.id}`)}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left', textDecoration: 'underline' }}
            >
              View full vehicle record →
            </button>
          </div>
        </div>
      )}

      {/* Buy Now confirmation modal */}
      {buyTarget && (
        <div className="modal-overlay" onClick={() => { if (!buyConfirming) setBuyTarget(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header" style={{ background: '#0d2550', borderRadius: '12px 12px 0 0' }}>
              <div>
                <h2 style={{ color: '#fff', fontSize: 17 }}>Confirm Purchase</h2>
                <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 13, marginTop: 2 }}>
                  {buyTarget.year} {buyTarget.make} {buyTarget.model}
                </p>
              </div>
              <button onClick={() => setBuyTarget(null)} disabled={buyConfirming} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <Detail label="VIN"          value={buyTarget.vin || '—'} mono />
                <Detail label="Color"        value={buyTarget.color || '—'} />
                <Detail label="Mileage"      value={mileageMap[buyTarget.id] != null ? `${parseInt(mileageMap[buyTarget.id]).toLocaleString()} mi` : '—'} />
                <Detail label="Condition"    value={buyTarget.condition ? buyTarget.condition.charAt(0).toUpperCase() + buyTarget.condition.slice(1) : '—'} />
              </div>
              {(() => {
                const p = askPrice(buyTarget);
                return p ? (
                  <div style={{ background: '#f0f4fb', border: '1px solid #c7d6ef', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>Purchase Price</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: '#0d2550' }}>${p.toLocaleString()}</span>
                  </div>
                ) : null;
              })()}
              {buyTarget.disclosure_notes && (
                <div style={{ background: '#fff8e7', border: '1px solid #f1bb25', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 16 }}>
                  <strong>Disclosure:</strong> {buyTarget.disclosure_notes}
                </div>
              )}
              <div className="alert alert-info">
                By confirming, you commit to purchase this vehicle at the listed price.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setBuyTarget(null)} disabled={buyConfirming}>Cancel</button>
              <button className="btn-navy" onClick={handleBuyNow} disabled={buyConfirming}>
                {buyConfirming ? 'Processing…' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
