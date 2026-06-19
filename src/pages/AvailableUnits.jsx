import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Navigate } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { VehicleDetailModal } from '../components/VehicleDetailModal';

// "Available Units" — a read-only window for the stores into TRI-STATE's stock.
//
// TRI-STATE (the wholesale account) is the single source of truth for inventory.
// Every other store can browse anything TRI-STATE owns that hasn't been sold yet,
// so they can see what's available at any time without an auction having to be
// open. Nothing here is a separate copy: the cards and the detail view read the
// same live records TRI-STATE maintains on Acquisitions, so the moment TRI-STATE
// adds a car, advances its status, or updates its photos/notes, the stores see it.
//
// A vehicle counts as "available" until it is awarded to a buyer. That covers
// intake, recon, ready-to-list, currently live in the auction, and no-sale cars.
// Awarded/sold cars drop off because they already belong to someone.
function isAvailable(v) {
  return v.status !== 'awarded';
}

function UnitCard({ vehicle, transport, onClick }) {
  const v = vehicle;
  const conditionColors = {
    excellent: { bg: '#d1fae5', color: '#065f46' },
    good: { bg: '#dbeafe', color: '#1e40af' },
    fair: { bg: '#fef3c7', color: '#92400e' },
    poor: { bg: '#fee2e2', color: '#991b1b' },
  };
  const cond = conditionColors[v.condition?.toLowerCase()] || conditionColors.good;

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
    >
      {/* Photo */}
      <div style={{ height: 148, background: '#f0f4f8', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {v.photos && v.photos[0] ? (
          <img src={v.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 36 }}>🚗</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>No photo</div>
          </div>
        )}
        {v.condition && (
          <span style={{ position: 'absolute', top: 8, left: 8, background: cond.bg, color: cond.color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
            {v.condition.toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>
          {v.year} {v.make} {v.model}
        </h3>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
          {[v.trim, v.mileage ? `${parseInt(v.mileage).toLocaleString()} mi` : null, v.color].filter(Boolean).join(' · ')}
        </p>
        {v.vin && (
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9ca3af', background: '#f3f4f6', borderRadius: 4, padding: '2px 6px', display: 'inline-block', marginBottom: 10 }}>
            {v.vin}
          </p>
        )}

        <div style={{ marginTop: 2 }}>
          <StatusBadge vehicle={v} transport={transport} size="sm" />
        </div>

        <div style={{ marginTop: 12, padding: '8px 12px', background: '#f5f6f8', borderRadius: 8, fontSize: 12, color: '#6b7280', textAlign: 'center', fontWeight: 500 }}>
          Click to view full details
        </div>
      </div>
    </div>
  );
}

export default function AvailableUnits() {
  const { user } = useAuth();
  const { data } = useData();
  const [detailVehicleId, setDetailVehicleId] = useState(null);
  const [search, setSearch] = useState('');

  // Stores browse here. TRI-STATE itself uses Acquisitions (the source view) and
  // doesn't need a read-only mirror, so send it there.
  if (user.role === 'wholesale') return <Navigate to="/acquisitions" replace />;

  const available = useMemo(
    () => data.vehicles.filter(isAvailable),
    [data.vehicles]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return available;
    return available.filter(v =>
      [v.year, v.make, v.model, v.trim, v.color, v.vin]
        .filter(Boolean)
        .some(field => String(field).toLowerCase().includes(q))
    );
  }, [available, search]);

  const readyCount = available.filter(v => v.status === 'ready').length;
  const liveCount = available.filter(v => v.status === 'active').length;

  const getTransport = (vehicleId) => data.transport.find(t => t.vehicleId === vehicleId && t.kind !== 'repair');

  return (
    <div>
      <div className="page-header">
        <h1>Available Units</h1>
        <p>Vehicles available from TRI-STATE right now — browse the full lot any time, whether or not an auction is open.</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Available units</div>
          <div className="stat-value">{available.length}</div>
          <div className="stat-sub">not yet sold</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ready to list</div>
          <div className="stat-value" style={{ color: '#065f46' }}>{readyCount}</div>
          <div className="stat-sub">recon complete</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Live in auction</div>
          <div className="stat-value" style={{ color: data.auction.isOpen ? '#1a3d76' : '#9ca3af' }}>{liveCount}</div>
          <div className="stat-sub">{data.auction.isOpen ? 'open now' : 'auction closed'}</div>
        </div>
      </div>

      <div style={{ marginBottom: 20, maxWidth: 420 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by year, make, model, color or VIN"
          style={{ width: '100%', fontSize: 14, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', boxSizing: 'border-box' }}
        />
      </div>

      {available.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚙</div>
          <p>No units available right now</p>
          <span>Check back once TRI-STATE adds inventory.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p>No matches</p>
          <span>Try a different search.</span>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, fontWeight: 600 }}>
            {filtered.length} {filtered.length === 1 ? 'unit' : 'units'}{search ? ' matching' : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(270px, 100%), 1fr))', gap: 16 }}>
            {filtered.map(v => (
              <UnitCard
                key={v.id}
                vehicle={v}
                transport={getTransport(v.id)}
                onClick={() => setDetailVehicleId(v.id)}
              />
            ))}
          </div>
        </>
      )}

      {detailVehicleId && (
        <VehicleDetailModal
          vehicleId={detailVehicleId}
          onClose={() => setDetailVehicleId(null)}
        />
      )}
    </div>
  );
}
