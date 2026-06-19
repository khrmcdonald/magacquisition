import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StoreAvatar } from '../components/StoreAvatar';
import { useData } from '../context/DataContext';
import { StatusBadge, isTitlePending } from '../components/StatusBadge';
import { SellSheetButton } from '../components/SellSheetButton';

// Outbound: a sold car travelling from Arbor Plaza to the buyer's store.
const OUT_STEPS = [
  { key: 'awarded', label: 'Awarded', icon: '🏆' },
  { key: 'dispatched', label: 'Dispatched', icon: '📦' },
  { key: 'inTransit', label: 'In Transit', icon: '🚚' },
  { key: 'arrived', label: 'Arrived', icon: '✅' },
  { key: 'titleReceived', label: 'Title Received', icon: '📄' },
];

// Inbound: a freshly bought car travelling from the seller/auction to our lot.
const IN_STEPS = [
  { key: 'scheduled', label: 'Pickup scheduled', icon: '📅' },
  { key: 'in_transit', label: 'In transit to lot', icon: '🚛' },
  { key: 'arrived', label: 'Grounded · Arbor Plaza', icon: '⚓' },
];

function StepTracker({ steps, stepDefs, currentStatus, onUpdate, canUpdate, getStamp }) {
  const stepKeys = stepDefs.map(s => s.key);
  const currentIdx = stepKeys.indexOf(currentStatus);

  return (
    <div style={{ margin: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {stepDefs.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          const isClickable = canUpdate && i !== currentIdx;
          const stamp = getStamp ? getStamp(step.key) : (steps && steps[step.key]);
          return (
            <React.Fragment key={step.key}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div
                  onClick={() => isClickable && onUpdate(step.key)}
                  title={isClickable ? (i < currentIdx ? `← Back to ${step.label}` : `→ Mark as ${step.label}`) : ''}
                  style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: done ? '#1a3d76' : '#f3f4f6',
                    color: done ? '#fff' : '#9ca3af',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: done ? 15 : 17, fontWeight: 700,
                    cursor: isClickable ? 'pointer' : 'default',
                    border: active ? '3px solid #f1bb25' : done ? '3px solid #1a3d76' : '3px solid #e5e7eb',
                    transition: 'all 0.15s',
                    boxShadow: isClickable ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                  }}
                  onMouseEnter={e => { if (isClickable) e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
                >
                  {done ? '✓' : step.icon}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: done ? '#1a3d76' : '#9ca3af', whiteSpace: 'nowrap' }}>
                  {step.label}
                </span>
                {stamp && (
                  <span style={{ fontSize: 9, color: '#9ca3af' }}>
                    {new Date(stamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              {i < stepDefs.length - 1 && (
                <div style={{ width: 24, height: 2, background: i < currentIdx ? '#1a3d76' : '#e5e7eb', marginBottom: 24, flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {canUpdate && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
          Click any step to move forward or backward
        </div>
      )}
    </div>
  );
}

function VehiclePhoto({ vehicle }) {
  return vehicle?.photos?.[0] ? (
    <img src={vehicle.photos[0]} alt="" style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid #e5e7eb' }} />
  ) : (
    <div style={{ width: 72, height: 52, background: '#f0f4f8', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🚗</div>
  );
}

// Outbound card — a sold vehicle on its way to the buyer.
function OutboundCard({ t, vehicle, canUpdate, onUpdateStep, onNotes }) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <VehiclePhoto vehicle={vehicle} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{t.vehicleName}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              Going to: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, verticalAlign: 'middle' }}>
                <StoreAvatar storeId={t.storeId} size={22} />
                <strong style={{ color: '#1a3d76' }}>{t.storeName}</strong>
              </span>
              {' · '}Winning bid: <strong>${t.winningBid?.toLocaleString()}</strong>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <StatusBadge vehicle={vehicle} transport={t} />
          <SellSheetButton vehicle={vehicle} transport={t} />
          {canUpdate && (
            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => onNotes(t)}>
              Notes
            </button>
          )}
        </div>
      </div>

      <StepTracker
        stepDefs={OUT_STEPS}
        steps={t.steps}
        currentStatus={t.status}
        onUpdate={(stepKey) => onUpdateStep(t, stepKey)}
        canUpdate={canUpdate}
      />

      {canUpdate && t.status !== 'titleReceived' && (() => {
        const nextIdx = OUT_STEPS.findIndex(s => s.key === t.status) + 1;
        if (nextIdx <= 0 || nextIdx >= OUT_STEPS.length) return null;
        const nextStep = OUT_STEPS[nextIdx];
        return (
          <div style={{ marginTop: 4 }}>
            <button className="btn-navy" style={{ padding: '7px 16px', fontSize: 13 }} onClick={() => onUpdateStep(t, nextStep.key)}>
              Mark as {nextStep.label} {nextStep.icon}
            </button>
          </div>
        );
      })()}

      {t.notes && (
        <div style={{ marginTop: 10, background: '#f9fafb', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#374151', borderLeft: '3px solid #e5e7eb' }}>
          📝 {t.notes}
        </div>
      )}
    </div>
  );
}

// Inbound card — a freshly bought vehicle on its way to Arbor Plaza.
function InboundCard({ vehicle, canUpdate, onAdvance }) {
  const etaText = vehicle.inboundEta
    ? new Date(vehicle.inboundEta + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <VehiclePhoto vehicle={vehicle} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              Coming to: <strong style={{ color: '#1a3d76' }}>⚓ Arbor Plaza</strong>
              {vehicle.pickupLocation ? <> · from {vehicle.pickupLocation}</> : null}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
              {vehicle.inboundMethod || 'Transport'}
              {vehicle.inboundCarrier ? ` · ${vehicle.inboundCarrier}` : ''}
              {etaText ? ` · ETA ${etaText}` : ''}
            </div>
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <StatusBadge vehicle={vehicle} />
        </div>
      </div>

      <StepTracker
        stepDefs={IN_STEPS}
        currentStatus={vehicle.inboundStatus}
        onUpdate={(stepKey) => onAdvance(vehicle, stepKey)}
        canUpdate={canUpdate}
        getStamp={() => null}
      />

      {canUpdate && vehicle.inboundStatus !== 'arrived' && (() => {
        const nextIdx = IN_STEPS.findIndex(s => s.key === vehicle.inboundStatus) + 1;
        if (nextIdx <= 0 || nextIdx >= IN_STEPS.length) {
          // Coming from 'not_arranged' (not in IN_STEPS) — first real step is "scheduled".
          if (vehicle.inboundStatus !== 'in_transit') {
            return (
              <div style={{ marginTop: 4 }}>
                <button className="btn-navy" style={{ padding: '7px 16px', fontSize: 13 }} onClick={() => onAdvance(vehicle, 'in_transit')}>
                  Mark as In transit 🚛
                </button>
              </div>
            );
          }
          return null;
        }
        const nextStep = IN_STEPS[nextIdx];
        return (
          <div style={{ marginTop: 4 }}>
            <button className="btn-navy" style={{ padding: '7px 16px', fontSize: 13 }} onClick={() => onAdvance(vehicle, nextStep.key)}>
              Mark as {nextStep.label} {nextStep.icon}
            </button>
          </div>
        );
      })()}
    </div>
  );
}

export default function Transport() {
  const { user } = useAuth();
  const { data, updateTransport, updateVehicle } = useData();
  const [filter, setFilter] = useState('all');
  const [notesModal, setNotesModal] = useState(null);
  const [notes, setNotes] = useState('');

  const isWholesale = user.role === 'wholesale' || user.role === 'admin';
  const isGM = user.role === 'gm';
  const canUpdate = isWholesale;
  const seesInbound = isWholesale || isGM;

  const vehicleById = (id) => data.vehicles.find(v => v.id === id);

  // Outbound — sold vehicles heading to a buyer. Bidders only see their own.
  const outbound = (isWholesale || isGM)
    ? data.transport
    : data.transport.filter(t => t.storeId === user.id);

  // Inbound — bought vehicles still heading to our lot. Internal only.
  const inbound = seesInbound
    ? data.vehicles.filter(v => ['scheduled', 'in_transit'].includes(v.inboundStatus) && v.status !== 'awarded')
    : [];

  const outboundInTransit = outbound.filter(t => ['dispatched', 'inTransit'].includes(t.status)).length;
  const delivered = outbound.filter(t => t.status === 'titleReceived').length;
  const titlePendingCount =
    inbound.filter(v => isTitlePending(v)).length +
    outbound.filter(t => isTitlePending(vehicleById(t.vehicleId), t)).length;

  const showInbound = (filter === 'all' || filter === 'inbound') && inbound.length > 0;
  const filteredOutbound =
    filter === 'inbound' ? []
    : filter === 'delivered' ? outbound.filter(t => t.status === 'titleReceived')
    : filter === 'outbound' ? outbound.filter(t => t.status !== 'titleReceived')
    : outbound;
  const showOutbound = filter !== 'inbound';

  const handleAdvanceInbound = (v, stepKey) => {
    const fields = { inboundStatus: stepKey };
    if (stepKey === 'arrived') fields.currentLocation = 'Arbor Plaza';
    updateVehicle(v.id, fields);
  };

  const filterTabs = [['all', 'All']];
  if (seesInbound) filterTabs.push(['inbound', 'Inbound']);
  filterTabs.push(['outbound', 'Outbound'], ['delivered', 'Delivered']);

  return (
    <div>
      <div className="page-header">
        <h1>Transport & Title</h1>
        <p>{seesInbound
          ? 'Every vehicle in flux — buys coming in and sells going out — until the title is settled'
          : `Incoming vehicles for ${user.name}`}</p>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {seesInbound && (
          <div className="stat-card">
            <div className="stat-label">In transit · Inbound</div>
            <div className="stat-value" style={{ color: '#0369a1' }}>{inbound.length}</div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-label">In transit · Outbound</div>
          <div className="stat-value" style={{ color: '#1e40af' }}>{outboundInTransit}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Awaiting title</div>
          <div className="stat-value" style={{ color: '#9a3412' }}>{titlePendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Delivered</div>
          <div className="stat-value" style={{ color: '#065f46' }}>{delivered}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {filterTabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: `1px solid ${filter === key ? '#1a3d76' : '#e5e7eb'}`,
              background: filter === key ? '#1a3d76' : '#fff',
              color: filter === key ? '#fff' : '#374151',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {!showInbound && filteredOutbound.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 36, marginBottom: 8 }}>🚚</div>
          <p>No vehicles to track</p>
          <span>{seesInbound
            ? 'Buys in transit and sold cars appear here while they’re on the move'
            : 'Vehicles appear here after auction winners are awarded'}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Inbound section */}
          {showInbound && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0369a1', marginBottom: 10 }}>
                🚛 Inbound — buys heading to Arbor Plaza
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {inbound.map(v => (
                  <InboundCard key={v.id} vehicle={v} canUpdate={canUpdate} onAdvance={handleAdvanceInbound} />
                ))}
              </div>
            </div>
          )}

          {/* Outbound section */}
          {showOutbound && filteredOutbound.length > 0 && (
            <div>
              {seesInbound && (
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 10 }}>
                  🚚 Outbound — sells heading to buyers
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredOutbound.map(t => (
                  <OutboundCard
                    key={t.id}
                    t={t}
                    vehicle={vehicleById(t.vehicleId)}
                    canUpdate={canUpdate}
                    onUpdateStep={(tr, stepKey) => updateTransport(tr.vehicleId, stepKey)}
                    onNotes={(tr) => { setNotesModal(tr); setNotes(tr.notes || ''); }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes modal */}
      {notesModal && (
        <div className="modal-overlay" onClick={() => setNotesModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Transport notes</h2>
              <button onClick={() => setNotesModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>{notesModal.vehicleName}</div>
              <div className="form-group">
                <label>Notes (driver info, ETA, contact, etc.)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="E.g. Pickup Friday 8am, contact John 989-555-0100" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setNotesModal(null)}>Cancel</button>
              <button className="btn-navy" onClick={() => { updateTransport(notesModal.vehicleId, notesModal.status, notes); setNotesModal(null); }}>Save notes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
