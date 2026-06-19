import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { StatusBadge, isTitlePending } from './StatusBadge';
import { SellSheetButton } from './SellSheetButton';

// Title status labels — mirrors the list TRI-STATE sets on Acquisitions so the
// buyer sees the exact same wording.
const TITLE_LABELS = {
  pending: { label: 'Pending', bg: '#fef3c7', color: '#92400e' },
  in_transit: { label: 'Title in Transit', bg: '#dbeafe', color: '#1e40af' },
  on_hand: { label: 'On Hand', bg: '#d1fae5', color: '#065f46' },
  lien: { label: 'Lien – Payoff Needed', bg: '#fee2e2', color: '#991b1b' },
  missing: { label: 'Missing / Issue', bg: '#fee2e2', color: '#991b1b' },
  transferred: { label: 'Transferred Out', bg: '#f3f4f6', color: '#6b7280' },
};

// Outbound transport steps — the journey of a sold car from Arbor Plaza to the
// buyer's store. Shown read-only here; TRI-STATE advances them on Transport & Title.
const OUT_STEPS = [
  { key: 'awarded', label: 'Awarded', icon: '🏆' },
  { key: 'dispatched', label: 'Dispatched', icon: '📦' },
  { key: 'inTransit', label: 'In Transit', icon: '🚚' },
  { key: 'arrived', label: 'Arrived', icon: '✅' },
  { key: 'titleReceived', label: 'Title Received', icon: '📄' },
];

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: mono ? 'break-all' : 'normal' }}>
        {value || '—'}
      </div>
    </div>
  );
}

// Read-only step tracker (mirrors the Transport page, without the editing UI).
function ReadOnlyTracker({ steps, currentStatus }) {
  const keys = OUT_STEPS.map(s => s.key);
  const currentIdx = keys.indexOf(currentStatus);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
      {OUT_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        const stamp = steps && steps[step.key];
        return (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 64 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: done ? '#1a3d76' : '#f3f4f6',
                color: done ? '#fff' : '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: done ? 15 : 16, fontWeight: 700,
                border: active ? '3px solid #f1bb25' : done ? '3px solid #1a3d76' : '3px solid #e5e7eb',
              }}>
                {done ? '✓' : step.icon}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: done ? '#1a3d76' : '#9ca3af', textAlign: 'center', lineHeight: 1.2 }}>{step.label}</span>
              {stamp && <span style={{ fontSize: 9, color: '#9ca3af' }}>{new Date(stamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
            </div>
            {i < OUT_STEPS.length - 1 && (
              <div style={{ width: 18, height: 2, background: i < currentIdx ? '#1a3d76' : '#e5e7eb', marginTop: 17, flexShrink: 0 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Full vehicle detail, opened when a store clicks one of its vehicles.
//
// Everything is read live from the DataContext by vehicle id, so TRI-STATE is
// the single source of truth: any edit TRI-STATE makes to the car — notes,
// repairs, title, transport progress — shows here the next render with no copy
// to keep in sync.
//
// `showFinancials` is false for stores (bidders): they see what they paid and
// the work done, but never TRI-STATE's internal cost basis, recon spend, floor,
// or margin. Pass true only for internal (wholesale/gm/admin) viewers.
export function VehicleDetailModal({ vehicleId, onClose, showFinancials = false }) {
  const { data } = useData();
  const vehicle = data.vehicles.find(v => v.id === vehicleId);
  const transport = data.transport.find(t => t.vehicleId === vehicleId && t.kind !== 'repair');
  const [activePhoto, setActivePhoto] = useState(0);

  if (!vehicle) return null;

  const v = vehicle;
  const photos = v.photos || [];
  const reconItems = v.reconItems || [];
  const title = TITLE_LABELS[v.titleStatus || 'pending'] || TITLE_LABELS.pending;
  const titlePending = isTitlePending(v, transport);

  const Section = ({ title, children, accent }) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: accent || '#1a3d76', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>{v.year} {v.make} {v.model}</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>{v.trim ? `${v.trim} · ` : ''}{v.color || ''}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>
        <div className="modal-body">

          {/* Status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            <StatusBadge vehicle={v} transport={transport} />
            {v.repair?.status === 'in_repair' && (
              <span style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>🔧 In repair</span>
            )}
            {v.arbitration?.status === 'open' && (
              <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>⚠ Arbitration open</span>
            )}
            {v.arbitration?.status === 'resolved' && (
              <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>✓ Arbitration resolved</span>
            )}
            {v.status === 'awarded' && (
              <span style={{ marginLeft: 'auto' }}>
                <SellSheetButton vehicle={v} transport={transport} variant="solid" />
              </span>
            )}
          </div>

          {/* Photos */}
          <Section title={`Photos${photos.length ? ` (${photos.length})` : ''}`}>
            {photos.length > 0 ? (
              <div>
                <img
                  src={photos[activePhoto]}
                  alt=""
                  style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb' }}
                />
                {photos.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {photos.map((p, i) => (
                      <img
                        key={i}
                        src={p}
                        alt=""
                        onClick={() => setActivePhoto(i)}
                        style={{
                          width: 64, height: 48, objectFit: 'cover', borderRadius: 6, cursor: 'pointer',
                          border: i === activePhoto ? '3px solid #1a3d76' : '1px solid #e5e7eb',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ width: '100%', height: 160, background: '#f0f4f8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>🚗</div>
            )}
          </Section>

          {/* Details grid */}
          <Section title="Vehicle details">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}><Field label="VIN" value={v.vin} mono /></div>
              <Field label="Year" value={v.year} />
              <Field label="Make" value={v.make} />
              <Field label="Model" value={v.model} />
              <Field label="Trim" value={v.trim} />
              <Field label="Mileage" value={v.mileage ? `${parseInt(v.mileage).toLocaleString()} mi` : null} />
              <Field label="Color" value={v.color} />
              <Field label="Condition" value={v.condition} />
              {showFinancials && <Field label="Source" value={v.source} />}
            </div>
          </Section>

          {/* What the buyer paid */}
          {v.status === 'awarded' && v.winningBid != null && (
            <Section title="Purchase">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0f4fb', border: '1px solid #c7d6ef', borderRadius: 10, padding: '14px 18px' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em' }}>Purchased by</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a3d76' }}>{v.winnerName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em' }}>Price paid</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1a3d76' }}>${(v.winningBid || 0).toLocaleString()}</div>
                </div>
              </div>
            </Section>
          )}

          {/* Repairs / reconditioning */}
          <Section title="Repairs & reconditioning">
            {v.repair?.status === 'in_repair' && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#9a3412' }}>🔧 In repair at {v.repair.vendorName || 'vendor'}</div>
                {v.repair.reason && <div style={{ fontSize: 13, color: '#7c2d12', marginTop: 3 }}>{v.repair.reason}</div>}
              </div>
            )}
            {v.repair?.status === 'completed' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>✓ Repair complete{v.repair.vendorName ? ` at ${v.repair.vendorName}` : ''}</div>
                {v.repair.reason && <div style={{ fontSize: 13, color: '#065f46', marginTop: 3 }}>{v.repair.reason}</div>}
              </div>
            )}
            {reconItems.length > 0 || v.reconNotes ? (
              <>
                {reconItems.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: v.reconNotes ? 10 : 0 }}>
                    {reconItems.map(item => (
                      <span key={item} style={{ background: '#eef2f6', color: '#374151', border: '1px solid #e5e7eb', padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                        🔧 {item}
                      </span>
                    ))}
                  </div>
                )}
                {v.reconNotes && (
                  <div style={{ fontSize: 13, color: '#374151', background: '#f9fafb', borderRadius: 8, padding: '10px 12px', borderLeft: '3px solid #e5e7eb' }}>{v.reconNotes}</div>
                )}
              </>
            ) : (
              !v.repair && <div style={{ fontSize: 13, color: '#9ca3af' }}>No reconditioning recorded.</div>
            )}
          </Section>

          {/* Notes */}
          {v.notes && (
            <Section title="Notes">
              <div style={{ fontSize: 13, color: '#374151', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px' }}>{v.notes}</div>
            </Section>
          )}

          {/* Title */}
          <Section title="Title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ background: title.bg, color: title.color, padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>{title.label}</span>
              {titlePending && (
                <span style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>⏳ Awaiting title</span>
              )}
            </div>
            {v.titleNotes && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>{v.titleNotes}</div>}
          </Section>

          {/* Transport */}
          <Section title="Transport & delivery">
            {transport ? (
              <>
                <ReadOnlyTracker steps={transport.steps} currentStatus={transport.status} />
                {transport.notes && (
                  <div style={{ marginTop: 12, background: '#f9fafb', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#374151', borderLeft: '3px solid #e5e7eb' }}>📝 {transport.notes}</div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#9ca3af' }}>Transport hasn’t been arranged yet. It will appear here once TRI-STATE dispatches the vehicle.</div>
            )}
          </Section>

          {/* Arbitration detail */}
          {v.arbitration?.status && (
            <Section title="Arbitration" accent="#991b1b">
              <div style={{ background: v.arbitration.status === 'open' ? '#fee2e2' : '#f0fdf4', border: `1px solid ${v.arbitration.status === 'open' ? '#fca5a5' : '#86efac'}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 13, color: v.arbitration.status === 'open' ? '#991b1b' : '#065f46', fontWeight: 700 }}>
                  {v.arbitration.status === 'open' ? `⚠ Open — ${v.arbitration.issueType}` : `✓ Resolved`}
                </div>
                {v.arbitration.details && <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 4 }}>{v.arbitration.details}</div>}
                {v.arbitration.resolution && <div style={{ fontSize: 13, color: '#065f46', marginTop: 4 }}>{v.arbitration.resolution}</div>}
              </div>
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}
