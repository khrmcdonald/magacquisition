import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StoreAvatar } from '../components/StoreAvatar';
import { useData } from '../context/DataContext';

const STEPS = [
  { key: 'awarded', label: 'Awarded', icon: '🏆' },
  { key: 'dispatched', label: 'Dispatched', icon: '📦' },
  { key: 'inTransit', label: 'In Transit', icon: '🚚' },
  { key: 'arrived', label: 'Arrived', icon: '✅' },
  { key: 'titleReceived', label: 'Title Received', icon: '📄' },
];

function StepTracker({ steps, currentStatus, onUpdate, canUpdate }) {
  const stepKeys = STEPS.map(s => s.key);
  const currentIdx = stepKeys.indexOf(currentStatus);

  return (
    <div style={{ margin: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          const isClickable = canUpdate && i !== currentIdx;
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
                {steps[step.key] && (
                  <span style={{ fontSize: 9, color: '#9ca3af' }}>
                    {new Date(steps[step.key]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              {i < STEPS.length - 1 && (
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

  const handleUpdateStep = (t, stepKey) => {
    updateTransport(t.vehicleId, stepKey);
  };

  const statusLabel = {
    awarded: { label: 'Pending dispatch', bg: '#fef3c7', color: '#92400e' },
    dispatched: { label: 'Dispatched', bg: '#dbeafe', color: '#1e40af' },
    inTransit: { label: 'In transit', bg: '#e0f2fe', color: '#0369a1' },
    arrived: { label: 'Arrived', bg: '#d1fae5', color: '#065f46' },
    titleReceived: { label: 'Complete', bg: '#d1fae5', color: '#065f46' },
  };

  return (
    <div>
      <div className="page-header">
        <h1>Transport & Title</h1>
        <p>{isWholesale ? 'Track all vehicle movements across the group' : `Incoming vehicles for ${user.name}`}</p>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total vehicles</div>
          <div className="stat-value">{myTransport.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In transit</div>
          <div className="stat-value" style={{ color: '#0369a1' }}>
            {myTransport.filter(t => ['dispatched', 'inTransit'].includes(t.status)).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Arrived</div>
          <div className="stat-value" style={{ color: '#065f46' }}>
            {myTransport.filter(t => t.status === 'arrived').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Title received</div>
          <div className="stat-value" style={{ color: '#065f46' }}>
            {myTransport.filter(t => t.status === 'titleReceived').length}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['all', 'All'], ['active', 'In progress'], ['complete', 'Complete']].map(([key, label]) => (
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

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 36, marginBottom: 8 }}>🚚</div>
          <p>No vehicles to track</p>
          <span>Vehicles appear here after auction winners are awarded</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(t => {
            const st = statusLabel[t.status] || statusLabel.awarded;
            const canUpdate = isWholesale;
            return (
              <div key={t.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    {(() => { const v = data.vehicles.find(vv => vv.id === t.vehicleId); return v?.photos?.[0] ? (
                      <img src={v.photos[0]} alt="" style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid #e5e7eb' }} />
                    ) : (
                      <div style={{ width: 72, height: 52, background: '#f0f4f8', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🚗</div>
                    ); })()}
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
                    <span style={{ background: st.bg, color: st.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                      {st.label}
                    </span>
                    {canUpdate && (
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => { setNotesModal(t); setNotes(t.notes || ''); }}
                      >
                        Notes
                      </button>
                    )}
                  </div>
                </div>

                <StepTracker
                  steps={t.steps}
                  currentStatus={t.status}
                  onUpdate={(stepKey) => handleUpdateStep(t, stepKey)}
                  canUpdate={canUpdate}
                />

                {canUpdate && t.status !== 'titleReceived' && (
                  <div style={{ marginTop: 4 }}>
                    {(() => {
                      const stepKeys = STEPS.map(s => s.key);
                      const nextIdx = stepKeys.indexOf(t.status) + 1;
                      if (nextIdx >= STEPS.length) return null;
                      const nextStep = STEPS[nextIdx];
                      return (
                        <button
                          className="btn-navy"
                          style={{ padding: '7px 16px', fontSize: 13 }}
                          onClick={() => handleUpdateStep(t, nextStep.key)}
                        >
                          Mark as {nextStep.label} {nextStep.icon}
                        </button>
                      );
                    })()}
                  </div>
                )}

                {t.notes && (
                  <div style={{ marginTop: 10, background: '#f9fafb', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#374151', borderLeft: '3px solid #e5e7eb' }}>
                    📝 {t.notes}
                  </div>
                )}
              </div>
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
