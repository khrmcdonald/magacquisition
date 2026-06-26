import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StoreAvatar } from '../components/StoreAvatar';
import { useData } from '../context/DataContext';
import { VehicleCard } from '../components/VehicleCard';

const STEPS = [
  { key: 'awarded',       label: 'Awarded',       icon: '🏆' },
  { key: 'dispatched',    label: 'Dispatched',     icon: '📦' },
  { key: 'inTransit',     label: 'In Transit',     icon: '🚚' },
  { key: 'arrived',       label: 'Arrived',        icon: '✅' },
  { key: 'titleReceived', label: 'Title Received', icon: '📄' },
];

const STATUS_LABEL = {
  awarded:       { label: 'Pending dispatch', bg: '#fef3c7', color: '#92400e' },
  dispatched:    { label: 'Dispatched',       bg: '#dbeafe', color: '#1e40af' },
  inTransit:     { label: 'In Transit',       bg: '#e0f2fe', color: '#0369a1' },
  arrived:       { label: 'Arrived',          bg: '#d1fae5', color: '#065f46' },
  titleReceived: { label: 'Complete',         bg: '#d1fae5', color: '#065f46' },
};

// ── Step tracker ──────────────────────────────────────────────────────────────
function StepTracker({ steps, currentStatus, onUpdate, canUpdate }) {
  const stepKeys = STEPS.map(s => s.key);
  const currentIdx = stepKeys.indexOf(currentStatus);

  return (
    <div style={{ margin: '10px 0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          const isClickable = canUpdate && i !== currentIdx;
          return (
            <React.Fragment key={step.key}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div
                  onClick={() => isClickable && onUpdate(step.key)}
                  title={isClickable ? (i < currentIdx ? `← Back to ${step.label}` : `→ Mark as ${step.label}`) : ''}
                  style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: done ? '#0d2550' : '#f3f4f6',
                    color: done ? '#fff' : '#9ca3af',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: done ? 13 : 15, fontWeight: 700,
                    cursor: isClickable ? 'pointer' : 'default',
                    border: active ? '3px solid #e8b84b' : done ? '3px solid #0d2550' : '3px solid #e5e7eb',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (isClickable) e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
                >
                  {done ? '✓' : step.icon}
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, color: done ? '#0d2550' : '#9ca3af', whiteSpace: 'nowrap' }}>
                  {step.label}
                </span>
                {steps[step.key] && (
                  <span style={{ fontSize: 8, color: '#9ca3af' }}>
                    {new Date(steps[step.key]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 20, height: 2, background: i < currentIdx ? '#0d2550' : '#e5e7eb', marginBottom: 22, flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Transport() {
  const { user } = useAuth();
  const { data, updateTransport } = useData();
  const [filter, setFilter] = useState('all');
  const [notesModal, setNotesModal] = useState(null);
  const [notes, setNotes] = useState('');

  const isWholesale = user.role === 'wholesale' || user.role === 'admin';
  const isGM = user.role === 'gm';

  const myTransport = isWholesale || isGM
    ? data.transport
    : data.transport.filter(t => t.storeId === user.id);

  const filtered = filter === 'all' ? myTransport
    : filter === 'complete' ? myTransport.filter(t => t.status === 'titleReceived')
    : myTransport.filter(t => t.status !== 'titleReceived');

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', margin: '-20px -16px', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Transport & Title</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 0 }}>
          {isWholesale ? 'Track all vehicle movements across the group' : `Incoming vehicles for ${user.name}`}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total vehicles', value: myTransport.length,                                                              accent: '#0d2550', color: '#0d2550' },
          { label: 'In transit',     value: myTransport.filter(t => ['dispatched','inTransit'].includes(t.status)).length,   accent: '#3b82f6', color: '#1e40af' },
          { label: 'Arrived',        value: myTransport.filter(t => t.status === 'arrived').length,                          accent: '#10b981', color: '#065f46' },
          { label: 'Title received', value: myTransport.filter(t => t.status === 'titleReceived').length,                    accent: '#e8b84b', color: '#92400e' },
        ].map(({ label, value, accent, color }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: `3px solid ${accent}`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[['all','All'], ['active','In progress'], ['complete','Complete']].map(([key, label]) => (
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

      {/* Transport list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🚚</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No vehicles to track</div>
          <div style={{ fontSize: 13 }}>Vehicles appear here after auction winners are awarded</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(t => {
            const st = STATUS_LABEL[t.status] || STATUS_LABEL.awarded;
            const canUpdate = isWholesale;
            const vehicle = data.vehicles.find(vv => vv.id === t.vehicleId) || {
              id: t.vehicleId, year: null, make: t.vehicleName || '', model: '', trim: '', color: null, vin: null, photos: [], list_price: null, status: 'active',
            };

            // Next step button
            const stepKeys = STEPS.map(s => s.key);
            const nextIdx = stepKeys.indexOf(t.status) + 1;
            const nextStep = nextIdx < STEPS.length ? STEPS[nextIdx] : null;

            return (
              <VehicleCard
                key={t.id}
                variant="list"
                vehicle={vehicle}
                badge={
                  <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {st.label}
                  </span>
                }
                pricePill={null}
                actionButton={
                  canUpdate ? (
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 11, whiteSpace: 'nowrap' }}
                      onClick={() => { setNotesModal(t); setNotes(t.notes || ''); }}
                    >
                      Notes
                    </button>
                  ) : null
                }
              >
                {/* Transport details strip */}
                <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #f3f4f6', background: '#f9fafb' }}>
                  {/* Destination + winning bid */}
                  {t.storeName === 'Intake' ? (
                    <div style={{ display: 'flex', gap: 20, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Pickup from</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{t.notes || 'Address not set'}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Leg type</div>
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Intake Pickup</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 20, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Going to</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <StoreAvatar storeId={t.storeId} size={22} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0d2550' }}>{t.storeName}</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Winning bid</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#0d2550' }}>${t.winningBid?.toLocaleString() ?? '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Leg type</div>
                        <span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Auction Delivery</span>
                      </div>
                    </div>
                  )}

                  {/* Step tracker */}
                  <StepTracker
                    steps={t.steps}
                    currentStatus={t.status}
                    onUpdate={(stepKey) => updateTransport(t.vehicleId, stepKey)}
                    canUpdate={canUpdate}
                  />

                  {/* Next step button */}
                  {canUpdate && nextStep && t.status !== 'titleReceived' && (
                    <button
                      onClick={() => updateTransport(t.vehicleId, nextStep.key)}
                      style={{
                        marginTop: 10, background: '#0d2550', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Mark as {nextStep.label} {nextStep.icon}
                    </button>
                  )}

                  {/* Notes */}
                  {t.notes && (
                    <div style={{ marginTop: 10, background: '#fff', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#374151', borderLeft: '3px solid #e8b84b' }}>
                      📝 {t.notes}
                    </div>
                  )}
                </div>
              </VehicleCard>
            );
          })}
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
