import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData, isAuctionSource, DEFAULT_INBOUND } from '../context/DataContext';

const INBOUND_STATUSES = [
  { value: 'not_scheduled', label: 'Not Scheduled', bg: '#f3f4f6', color: '#6b7280', icon: '🗓️' },
  { value: 'scheduled', label: 'Pickup Scheduled', bg: '#dbeafe', color: '#1e40af', icon: '📅' },
  { value: 'in_transit', label: 'In Transit', bg: '#e0f2fe', color: '#0369a1', icon: '🚚' },
  { value: 'delivered', label: 'Delivered', bg: '#d1fae5', color: '#065f46', icon: '✅' },
];

const GATE_PASS_STATUSES = [
  { value: 'na', label: 'N/A' },
  { value: 'needed', label: 'Needed' },
  { value: 'requested', label: 'Requested' },
  { value: 'received', label: 'Received' },
];

const STEPS = [
  { key: 'scheduled', label: 'Scheduled', icon: '📅', status: 'scheduled' },
  { key: 'pickedUp', label: 'Picked Up', icon: '🚚', status: 'in_transit' },
  { key: 'delivered', label: 'Delivered', icon: '✅', status: 'delivered' },
];

function statusMeta(value) {
  return INBOUND_STATUSES.find(s => s.value === value) || INBOUND_STATUSES[0];
}

function StepTracker({ ib, onJump, canEdit }) {
  const order = ['not_scheduled', 'scheduled', 'in_transit', 'delivered'];
  const currentIdx = order.indexOf(ib.status || 'not_scheduled');
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, margin: '4px 0 12px' }}>
      {STEPS.map((step, i) => {
        const stepIdx = order.indexOf(step.status);
        const done = stepIdx <= currentIdx;
        const active = stepIdx === currentIdx;
        const clickable = canEdit;
        return (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                onClick={() => clickable && onJump(step.status)}
                title={clickable ? `Mark as ${step.label}` : ''}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: done ? '#1a3d76' : '#f3f4f6',
                  color: done ? '#fff' : '#9ca3af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: done ? 14 : 16, fontWeight: 700,
                  cursor: clickable ? 'pointer' : 'default',
                  border: active ? '3px solid #f1bb25' : done ? '3px solid #1a3d76' : '3px solid #e5e7eb',
                }}
              >
                {done ? '✓' : step.icon}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: done ? '#1a3d76' : '#9ca3af', whiteSpace: 'nowrap' }}>{step.label}</span>
              {ib.steps?.[step.key] && (
                <span style={{ fontSize: 9, color: '#9ca3af' }}>
                  {new Date(ib.steps[step.key]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 28, height: 2, background: order.indexOf(STEPS[i + 1].status) <= currentIdx ? '#1a3d76' : '#e5e7eb', marginBottom: 24, flexShrink: 0 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label style={{ fontSize: 11 }}>{label}</label>
      {children}
    </div>
  );
}

function InboundCard({ vehicle, canEdit, onSave }) {
  const [ib, setIb] = useState({ ...DEFAULT_INBOUND, ...(vehicle.inbound || {}) });
  const auctionBuy = isAuctionSource(vehicle.source);

  const set = (k, v) => setIb(prev => ({ ...prev, [k]: v }));
  const persist = (patch) => onSave(vehicle.id, patch);
  const jump = (status) => { setIb(prev => ({ ...prev, status })); persist({ status }); };

  const meta = statusMeta(ib.status);
  const photo = vehicle.photos?.[0];

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {photo
            ? <img src={photo} alt="" style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid #e5e7eb' }} />
            : <div style={{ width: 72, height: 52, background: '#f0f4f8', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🚗</div>}
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
              {vehicle.year} {vehicle.make} {vehicle.model}{vehicle.trim ? ` · ${vehicle.trim}` : ''}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {vehicle.source && <span>{vehicle.source}</span>}
              {auctionBuy && <span style={{ background: '#1a3d76', color: '#f1bb25', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>Auction pickup</span>}
              {vehicle.vin && <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#e8eef5', color: '#1a3d76', padding: '1px 8px', borderRadius: 6 }}>{vehicle.vin}</span>}
            </div>
          </div>
        </div>
        <span style={{ background: meta.bg, color: meta.color, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {meta.icon} {meta.label}
        </span>
      </div>

      <StepTracker ib={ib} onJump={jump} canEdit={canEdit} />

      {canEdit ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <Field label="Pickup location / origin">
            <input type="text" value={ib.origin} onChange={e => set('origin', e.target.value)} onBlur={e => persist({ origin: e.target.value })} placeholder={auctionBuy ? 'Auction lot + lane' : 'Seller address / city'} />
          </Field>
          <Field label="Pickup date">
            <input type="date" value={ib.pickupDate} onChange={e => { set('pickupDate', e.target.value); persist({ pickupDate: e.target.value }); }} />
          </Field>
          <Field label="Pickup time">
            <input type="time" value={ib.pickupTime} onChange={e => { set('pickupTime', e.target.value); persist({ pickupTime: e.target.value }); }} />
          </Field>
          <Field label="Driver / hauler">
            <input type="text" value={ib.driver} onChange={e => set('driver', e.target.value)} onBlur={e => persist({ driver: e.target.value })} placeholder="Who picks it up" />
          </Field>
          <Field label="Driver contact">
            <input type="text" value={ib.driverContact} onChange={e => set('driverContact', e.target.value)} onBlur={e => persist({ driverContact: e.target.value })} placeholder="Phone" />
          </Field>
          <Field label="Origin contact">
            <input type="text" value={ib.originContact} onChange={e => set('originContact', e.target.value)} onBlur={e => persist({ originContact: e.target.value })} placeholder="Seller / lot contact" />
          </Field>
          {auctionBuy && (
            <>
              <Field label="Gate pass / buyer #">
                <input type="text" value={ib.gatePass} onChange={e => set('gatePass', e.target.value)} onBlur={e => persist({ gatePass: e.target.value })} placeholder="Gate pass / buyer #" />
              </Field>
              <Field label="Gate pass status">
                <select value={ib.gatePassStatus} onChange={e => { set('gatePassStatus', e.target.value); persist({ gatePassStatus: e.target.value }); }}>
                  {GATE_PASS_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
            </>
          )}
          <Field label="Pickup notes">
            <input type="text" value={ib.notes} onChange={e => set('notes', e.target.value)} onBlur={e => persist({ notes: e.target.value })} placeholder="Timing, coordination, instructions" />
          </Field>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#374151' }}>
          {ib.origin && <span><strong>From:</strong> {ib.origin}</span>}
          {ib.pickupDate && <span><strong>When:</strong> {new Date(ib.pickupDate + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{ib.pickupTime ? ` ${ib.pickupTime}` : ''}</span>}
          {ib.driver && <span><strong>Driver:</strong> {ib.driver}{ib.driverContact ? ` (${ib.driverContact})` : ''}</span>}
          {auctionBuy && ib.gatePass && <span><strong>Gate pass:</strong> {ib.gatePass}</span>}
          {ib.notes && <span><strong>Notes:</strong> {ib.notes}</span>}
        </div>
      )}

      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        Title status: <span style={{ fontWeight: 600, color: '#374151' }}>{(vehicle.titleStatus || 'pending').replace(/_/g, ' ')}</span>
        {vehicle.titleNotes && <span>· {vehicle.titleNotes}</span>}
      </div>
    </div>
  );
}

export default function Inbound() {
  const { user } = useAuth();
  const { data, updateInbound } = useData();
  const [filter, setFilter] = useState('active');

  if (user.role !== 'wholesale' && user.role !== 'gm' && user.role !== 'admin') {
    return <Navigate to="/auction" replace />;
  }
  const canEdit = user.role === 'wholesale' || user.role === 'admin';

  // Inbound applies to vehicles we are bringing onto the lot — those not yet
  // through the outbound auction flow (awarded / no_sale are post-sale states).
  const candidates = data.vehicles.filter(v => !['awarded', 'no_sale'].includes(v.status));
  const ibStatus = v => (v.inbound?.status || 'not_scheduled');

  const counts = {
    not_scheduled: candidates.filter(v => ibStatus(v) === 'not_scheduled').length,
    scheduled: candidates.filter(v => ibStatus(v) === 'scheduled').length,
    in_transit: candidates.filter(v => ibStatus(v) === 'in_transit').length,
    delivered: candidates.filter(v => ibStatus(v) === 'delivered').length,
  };

  const filtered = candidates.filter(v => {
    const s = ibStatus(v);
    if (filter === 'all') return true;
    if (filter === 'active') return s !== 'delivered';
    return s === filter;
  });

  const filterTabs = [
    ['active', 'Needs handling'],
    ['not_scheduled', `Not scheduled (${counts.not_scheduled})`],
    ['scheduled', `Scheduled (${counts.scheduled})`],
    ['in_transit', `In transit (${counts.in_transit})`],
    ['delivered', `Delivered (${counts.delivered})`],
    ['all', 'All'],
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Inbound Logistics</h1>
        <p>Coordinate pickups, drivers, gate passes and timing for every vehicle coming to the lot.</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Not scheduled</div>
          <div className="stat-value" style={{ color: '#6b7280' }}>{counts.not_scheduled}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Scheduled</div>
          <div className="stat-value" style={{ color: '#1e40af' }}>{counts.scheduled}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In transit</div>
          <div className="stat-value" style={{ color: '#0369a1' }}>{counts.in_transit}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Delivered</div>
          <div className="stat-value" style={{ color: '#065f46' }}>{counts.delivered}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {filterTabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '7px 16px', borderRadius: 8,
              border: `1px solid ${filter === key ? '#1a3d76' : '#e5e7eb'}`,
              background: filter === key ? '#1a3d76' : '#fff',
              color: filter === key ? '#fff' : '#374151',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 36, marginBottom: 8 }}>🚛</div>
          <p>Nothing to coordinate here</p>
          <span>Add a vehicle in Acquisitions to start tracking its pickup</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(v => (
            <InboundCard key={v.id} vehicle={v} canEdit={canEdit} onSave={updateInbound} />
          ))}
        </div>
      )}
    </div>
  );
}
