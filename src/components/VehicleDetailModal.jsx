import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const TRANSPORT_STEPS = [
  { key: 'awarded',       label: 'Awarded' },
  { key: 'dispatched',    label: 'Dispatched' },
  { key: 'inTransit',     label: 'In Transit' },
  { key: 'arrived',       label: 'Arrived' },
  { key: 'titleReceived', label: 'Title Received' },
];

const RATING_STYLE = {
  good:       { label: 'Good',       color: '#065f46', bg: '#d1fae5' },
  fair:       { label: 'Fair',       color: '#92400e', bg: '#fef3c7' },
  needs_work: { label: 'Needs Work', color: '#991b1b', bg: '#fee2e2' },
};

const INSPECTION_CATS = [
  { key: 'exterior',   label: 'Exterior / Body' },
  { key: 'glass',      label: 'Glass' },
  { key: 'tires',      label: 'Tires & Wheels' },
  { key: 'interior',   label: 'Interior' },
  { key: 'mechanical', label: 'Mechanical' },
  { key: 'lights',     label: 'Lights & Electronics' },
];

const STATUS_LABELS = {
  intake:     'Intake',
  inspection: 'Inspection',
  recon:      'In Recon',
  ready:      'Ready to List',
  in_auction: 'Live in Auction',
  awarded:    'Awarded',
  no_sale:    'No Sale',
};

export default function VehicleDetailModal({ vehicle, onClose }) {
  const { data } = useData();
  const { user } = useAuth();
  const isBidder = user?.role === 'bidder';

  const transport = (data.transport || []).find(t => t.vehicleId === vehicle.id);
  const openRepairs = (data.repairOrders || []).filter(r =>
    r.vehicleId === vehicle.id && !['complete', 'cancelled'].includes(r.status)
  );
  const insp = vehicle.inspection;
  const inspComplete = insp?.status === 'complete';
  const transportStepIdx = transport
    ? TRANSPORT_STEPS.findIndex(s => s.key === transport.status)
    : -1;

  const photos = Array.isArray(vehicle.photos) ? vehicle.photos : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>

        {/* Header */}
        <div style={{ background: '#0d2550', color: '#fff', padding: '20px 24px 16px', borderRadius: '12px 12px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#93c5fd', letterSpacing: '.06em', marginBottom: 4 }}>{vehicle.vin || '—'}</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{vehicle.year} {vehicle.make} {vehicle.model}{vehicle.trim ? ' ' + vehicle.trim : ''}</div>
              <div style={{ fontSize: 13, color: '#93c5fd', marginTop: 3 }}>
                {[vehicle.color, vehicle.interior_color].filter(Boolean).join(' / ')}
                {vehicle.mileage ? ` · ${Number(vehicle.mileage).toLocaleString()} mi` : ''}
                {vehicle.condition ? ` · ${vehicle.condition}` : ''}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 18, width: 34, height: 34, cursor: 'pointer', lineHeight: '34px', textAlign: 'center' }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'Status', value: STATUS_LABELS[vehicle.status] || vehicle.status },
              !isBidder && vehicle.buyer_name ? { label: 'Buyer', value: vehicle.buyer_name } : null,
            ].filter(Boolean).map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 8, padding: '5px 12px', minWidth: 80 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 1 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 24px 24px' }}>

          {/* Photos */}
          {photos.length > 0 && (
            <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 18, marginBottom: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 18, marginBottom: 10 }}>Photos</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {photos.map((p, i) => (
                  <img key={i} src={p} alt="" style={{ width: 130, height: 97, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                ))}
              </div>
            </div>
          )}

          {/* Transport — internal only */}
          {!isBidder && transport && (
            <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 18, marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 18, marginBottom: 10 }}>Transport</div>
              {transport.storeName && (
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                  From: <span style={{ fontWeight: 600, color: '#374151' }}>{transport.storeName}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                {TRANSPORT_STEPS.map((step, i) => {
                  const done   = i <= transportStepIdx;
                  const active = i === transportStepIdx;
                  return (
                    <React.Fragment key={step.key}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: done ? '#0d2550' : '#f3f4f6',
                          border: active ? '2.5px solid #3b82f6' : 'none',
                          fontSize: 13, fontWeight: 700, color: done ? '#fff' : '#9ca3af',
                        }}>
                          {done ? '✓' : i + 1}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 600, color: done ? '#0d2550' : '#9ca3af', whiteSpace: 'nowrap' }}>{step.label}</span>
                        {transport.steps?.[step.key] && (
                          <span style={{ fontSize: 8, color: '#9ca3af' }}>
                            {new Date(transport.steps[step.key]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {i < TRANSPORT_STEPS.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: i < transportStepIdx ? '#0d2550' : '#e5e7eb', minWidth: 12, marginBottom: 18 }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* PSI Results */}
          <div style={{ borderBottom: openRepairs.length ? '1px solid #f3f4f6' : 'none', paddingBottom: openRepairs.length ? 18 : 0, marginBottom: openRepairs.length ? 18 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em' }}>Post-Sale Inspection</div>
              {inspComplete && (
                <div style={{
                  fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px',
                  background: insp.result === 'pass' ? '#d1fae5' : '#fee2e2',
                  color: insp.result === 'pass' ? '#065f46' : '#991b1b',
                }}>
                  {insp.result === 'pass' ? '✓ Pass' : '⚠ Recon Needed'}
                </div>
              )}
            </div>
            {!inspComplete ? (
              <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No inspection on record.</div>
            ) : (
              <>
                {!isBidder && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                    Inspector: <span style={{ fontWeight: 600, color: '#374151' }}>{insp.completed_by || '—'}</span>
                    {insp.completed_at && (
                      <span style={{ marginLeft: 10 }}>
                        {new Date(insp.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {INSPECTION_CATS.map(cat => {
                    const item = insp.items?.[cat.key];
                    if (!item) return null;
                    const style = RATING_STYLE[item.rating] || {};
                    return (
                      <div key={cat.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{cat.label}</div>
                          {item.notes && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{item.notes}</div>}
                        </div>
                        {style.label && (
                          <div style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 9px', background: style.bg, color: style.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {style.label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {insp.overall_notes && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                    <span style={{ fontWeight: 700 }}>Notes: </span>{insp.overall_notes}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Open Repairs */}
          {openRepairs.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 18, marginBottom: 10 }}>
                Open Repairs ({openRepairs.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {openRepairs.map(ro => {
                  const total = (ro.lines || []).reduce((s, l) => s + (l.cost || 0), 0);
                  return (
                    <div key={ro.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{ro.notes || '—'}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{ro.status}</div>
                      </div>
                      {!isBidder && total > 0 && <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>${total.toLocaleString()}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
