import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function StatusBadge({ status }) {
  const styles = {
    listed:     { background: '#d1fae5', color: '#065f46', label: 'Available' },
    in_auction: { background: '#dbeafe', color: '#1e40af', label: 'In Auction' },
  };
  const s = styles[status] || { background: '#f3f4f6', color: '#6b7280', label: status };
  return (
    <span style={{
      background: s.background, color: s.color,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700,
    }}>
      {s.label}
    </span>
  );
}

function VehicleCard({ vehicle, onBuyNow }) {
  const isInAuction = vehicle.status === 'in_auction';

  const mileageDisplay = vehicle.mileage ? `${parseInt(vehicle.mileage).toLocaleString()} mi` : '—';

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Photo or placeholder */}
      <div style={{
        height: 160,
        background: '#f0f4f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}>
        {vehicle.photos?.[0]
          ? <img src={vehicle.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 48, opacity: 0.3 }}>🚗</span>
        }
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <StatusBadge status={vehicle.status} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Title */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </div>
          {vehicle.trim && (
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{vehicle.trim}</div>
          )}
        </div>

        {/* Key details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Detail label="VIN" value={vehicle.vin || '—'} mono />
          <Detail label="Color" value={vehicle.color || '—'} />
          <Detail label="Mileage" value={mileageDisplay} />
          <Detail
            label="List Price"
            value={vehicle.list_price ? `$${parseFloat(vehicle.list_price).toLocaleString()}` : '—'}
            highlight
          />
        </div>

        {/* Disclosure notes */}
        {vehicle.disclosure_notes && (
          <div style={{
            background: '#fff8e7', border: '1px solid #f1bb25',
            borderRadius: 8, padding: '8px 12px',
            fontSize: 12, color: '#92400e', lineHeight: 1.5,
          }}>
            <span style={{ fontWeight: 700 }}>Disclosure: </span>
            {vehicle.disclosure_notes}
          </div>
        )}

        {/* Buy Now button */}
        <button
          onClick={() => !isInAuction && onBuyNow(vehicle)}
          disabled={isInAuction}
          style={{
            marginTop: 'auto',
            padding: '11px 0',
            fontSize: 14, fontWeight: 700,
            border: 'none', borderRadius: 8, cursor: isInAuction ? 'not-allowed' : 'pointer',
            background: isInAuction ? '#e5e7eb' : '#1a3d76',
            color: isInAuction ? '#9ca3af' : '#fff',
            transition: 'background 0.15s',
          }}
        >
          {isInAuction ? 'Currently in Auction' : 'Buy Now'}
        </button>
      </div>
    </div>
  );
}

function Detail({ label, value, mono, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontSize: mono ? 11 : 13, fontWeight: highlight ? 700 : 500,
        color: highlight ? '#1a3d76' : '#374151',
        fontFamily: mono ? 'monospace' : undefined,
        wordBreak: mono ? 'break-all' : undefined,
      }}>
        {value}
      </div>
    </div>
  );
}

export default function Inventory() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyTarget, setBuyTarget] = useState(null);

  const orgId = user?.org_id;

  useEffect(() => {
    if (!orgId) return;

    async function fetchVehicles() {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .in('status', ['listed', 'in_auction'])
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Inventory fetch error:', error);
        setError(error.message);
      } else {
        setVehicles(data || []);
      }
      setLoading(false);
    }

    fetchVehicles();

    // Realtime — refresh on any vehicle change for this org
    const channel = supabase
      .channel('inventory-vehicles')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicles',
        filter: `org_id=eq.${orgId}`,
      }, () => {
        fetchVehicles();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [orgId]);

  const listed = vehicles.filter(v => v.status === 'listed');
  const inAuction = vehicles.filter(v => v.status === 'in_auction');

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
    <div>
      <div className="page-header">
        <h1>Inventory</h1>
        <p>Available vehicles for purchase — updates live</p>
      </div>

      {/* Summary counts */}
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Available</div>
          <div className="stat-value" style={{ color: '#065f46' }}>{listed.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Auction</div>
          <div className="stat-value" style={{ color: '#1e40af' }}>{inAuction.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Listed</div>
          <div className="stat-value">{vehicles.length}</div>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚗</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No vehicles listed</div>
          <div style={{ fontSize: 13 }}>Check back when new inventory is added</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {vehicles.map(v => (
            <VehicleCard key={v.id} vehicle={v} onBuyNow={setBuyTarget} />
          ))}
        </div>
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
              <button
                className="btn-navy"
                onClick={() => {
                  // TODO: wire to purchase mutation
                  console.log('Buy Now confirmed:', buyTarget.id);
                  setBuyTarget(null);
                }}
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
