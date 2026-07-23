import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StoreAvatar } from '../components/StoreAvatar';
import { useData } from '../context/DataContext';
import { VehicleCard } from '../components/VehicleCard';

const STEPS = [
  { key: 'awarded',    label: 'Awarded',    icon: '1' },
  { key: 'dispatched', label: 'Dispatched', icon: '2' },
  { key: 'inTransit',  label: 'In Transit', icon: '3' },
  { key: 'arrived',    label: 'Arrived',    icon: '4' },
];

const STATUS_LABEL = {
  awarded:       { label: 'Pending dispatch', bg: '#fef3c7', color: '#92400e' },
  dispatched:    { label: 'Dispatched',       bg: '#dbeafe', color: '#1e40af' },
  inTransit:     { label: 'In Transit',       bg: '#e0f2fe', color: '#0369a1' },
  arrived:       { label: 'Arrived',          bg: '#d1fae5', color: '#065f46' },
  titleReceived: { label: 'Complete',         bg: '#d1fae5', color: '#065f46' },
};

const TRANSPORT_ACCENT = {
  awarded:       '#f59e0b',
  dispatched:    '#3b82f6',
  inTransit:     '#0369a1',
  arrived:       '#10b981',
  titleReceived: '#10b981',
};

function StepTracker({ steps, currentStatus, onUpdate, canUpdate }) {
  const stepKeys = STEPS.map(s => s.key);
  const currentIdx = stepKeys.indexOf(currentStatus);

  return (
    <div style={{ margin: '4px 0 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        {STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          const isClickable = canUpdate && i !== currentIdx;
          return (
            <React.Fragment key={step.key}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div
                  onClick={() => isClickable && onUpdate(step.key)}
                  title={isClickable ? (i < currentIdx ? `← Back to ${step.label}` : `→ Mark as ${step.label}`) : ''}
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: done ? '#0d2550' : '#f3f4f6',
                    color: done ? '#fff' : '#9ca3af',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: done ? 11 : 13, fontWeight: 700,
                    cursor: isClickable ? 'pointer' : 'default',
                    border: active ? '2.5px solid #e8b84b' : done ? '2.5px solid #0d2550' : '2.5px solid #e5e7eb',
                    transition: 'all 0.15s', flexShrink: 0,
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
                <div style={{ width: 18, height: 2, background: i < currentIdx ? '#0d2550' : '#e5e7eb', marginBottom: 20, flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default function Transport() {
  const { user } = useAuth();
  const { data, updateTransport, deleteTransport, closeArrivedTransport, updateTransportSchedule } = useData();
  const navigate = useNavigate();

  const [filter, setFilter]               = useState('active');
  const [closingAll, setClosingAll]       = useState(false);
  const [typeTab, setTypeTab]             = useState('all');
  const [panelTransport, setPanelTransport] = useState(null);
  const [panelPhotoIdx, setPanelPhotoIdx] = useState(0);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleInput, setScheduleInput] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [editingNotes, setEditingNotes]   = useState(false);
  const [notesInput, setNotesInput]       = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isWholesale = user.role === 'wholesale' || user.role === 'admin';
  const isGM = user.role === 'gm';

  const allTransport = isWholesale || isGM
    ? data.transport
    : data.transport.filter(t => t.locationId === user.locationId);

  const isIntake = (t) => t.storeName === 'Intake';

  const myTransport = isWholesale
    ? typeTab === 'deliveries' ? allTransport.filter(t => !isIntake(t))
      : typeTab === 'intake'   ? allTransport.filter(t =>  isIntake(t))
      : allTransport
    : allTransport;

  const filtered = filter === 'all'     ? myTransport
    : filter === 'complete'             ? myTransport.filter(t => ['arrived', 'titleReceived'].includes(t.status))
    : myTransport.filter(t => !['arrived', 'titleReceived'].includes(t.status));

  const deliveries = allTransport.filter(t => !isIntake(t));
  const intakes    = allTransport.filter(t =>  isIntake(t));

  // Keep panel in sync with live data
  const pt = panelTransport ? (data.transport || []).find(t => t.id === panelTransport.id) || null : null;

  const openPanel = (t) => {
    setPanelTransport(t);
    setPanelPhotoIdx(0);
    setEditingSchedule(false);
    setEditingNotes(false);
    setConfirmDelete(false);
    setNotesInput(t.notes || '');
    setScheduleInput(t.scheduledDate ? new Date(t.scheduledDate).toISOString().slice(0, 16) : '');
  };

  const closePanel = () => {
    setPanelTransport(null);
    setEditingSchedule(false);
    setEditingNotes(false);
    setConfirmDelete(false);
  };

  const handleSaveSchedule = async () => {
    if (!pt) return;
    setSavingSchedule(true);
    try {
      const iso = scheduleInput ? new Date(scheduleInput).toISOString() : null;
      await updateTransportSchedule(pt.id, iso);
      setEditingSchedule(false);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!pt) return;
    await updateTransport(pt.vehicleId, pt.status, notesInput);
    setEditingNotes(false);
  };

  const handleDelete = async () => {
    if (!pt) return;
    await deleteTransport(pt.id);
    closePanel();
  };

  // Panel vehicle
  const ptVehicle = pt ? (data.vehicles || []).find(v => v.id === pt.vehicleId) || {
    id: pt.vehicleId, year: null, make: pt.vehicleName || '', model: '', trim: '', color: null, vin: null, photos: [], status: 'in_auction',
  } : null;

  const ptIsIntake = pt ? isIntake(pt) : false;
  const ptWinBid = pt ? (data.bids || []).filter(b => b.vehicleId === pt.vehicleId).reduce((top, b) => (!top || b.amount > top.amount) ? b : top, null) : null;
  const ptLocationId = ptWinBid?.locationId || null;
  const ptStoreName = pt?.storeName || (data.locations || []).find(l => l.id === ptLocationId)?.name || '—';

  const stepKeys = STEPS.map(s => s.key);
  const ptNextIdx = pt ? stepKeys.indexOf(pt.status) + 1 : -1;
  const ptNextStep = ptNextIdx >= 0 && ptNextIdx < STEPS.length ? STEPS[ptNextIdx] : null;

  const ptScheduledDisplay = pt?.scheduledDate
    ? new Date(pt.scheduledDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  const ptLegType = pt
    ? ptIsIntake
      ? { label: 'Intake Pickup', bg: '#fef3c7', color: '#92400e' }
      : { label: 'Auction Delivery', bg: '#eff6ff', color: '#1e40af' }
    : null;

  return (
    <div style={{ position: 'relative' }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Transport</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 0 }}>
          {isWholesale ? 'Inbound pickups from sellers · Outbound deliveries to winning dealers' : `Incoming vehicles for ${user.name}`}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: isWholesale ? 'Deliveries' : 'Total vehicles', value: isWholesale ? deliveries.length : allTransport.length, accent: '#0d2550', color: '#0d2550' },
          { label: isWholesale ? 'Intake' : 'In transit',        value: isWholesale ? intakes.length : allTransport.filter(t => ['dispatched','inTransit'].includes(t.status)).length, accent: '#f59e0b', color: '#92400e' },
          { label: 'In transit', value: allTransport.filter(t => ['dispatched','inTransit'].includes(t.status)).length, accent: '#3b82f6', color: '#1e40af' },
        ].map(({ label, value, accent, color }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: `3px solid ${accent}`, borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs + filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {isWholesale && (
          <div style={{ display: 'flex', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginRight: 6 }}>
            {[['all','All'], ['deliveries','Outbound'], ['intake','Inbound']].map(([key, label]) => (
              <button key={key} onClick={() => { setTypeTab(key); closePanel(); }} style={{
                padding: '7px 14px', border: 'none', borderRight: key !== 'intake' ? '1px solid #e5e7eb' : 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                background: typeTab === key ? '#0d2550' : '#f3f4f6',
                color: typeTab === key ? '#fff' : '#6b7280',
                transition: 'all 0.12s',
              }}>{label}</button>
            ))}
          </div>
        )}
        {[['active','Active'], ['complete','Arrived'], ['all','All']].map(([key, label]) => (
          <button key={key} onClick={() => { setFilter(key); closePanel(); }} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: '1.5px solid', borderColor: filter === key ? '#0d2550' : '#e5e7eb',
            background: filter === key ? '#0d2550' : '#f3f4f6',
            color: filter === key ? '#fff' : '#6b7280',
            transition: 'all 0.12s',
          }}>{label}</button>
        ))}
        {filter === 'complete' && isWholesale && myTransport.filter(t => ['arrived','titleReceived'].includes(t.status)).length > 0 && (
          <button
            disabled={closingAll}
            onClick={async () => {
              if (!window.confirm(`Close all ${myTransport.filter(t => ['arrived','titleReceived'].includes(t.status)).length} arrived transport records? This cannot be undone.`)) return;
              setClosingAll(true);
              try { await closeArrivedTransport(); closePanel(); } catch (e) { alert('Failed: ' + e.message); }
              setClosingAll(false);
            }}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', marginLeft: 4 }}
          >
            {closingAll ? 'Closing…' : `Close all arrived (${myTransport.filter(t => ['arrived','titleReceived'].includes(t.status)).length})`}
          </button>
        )}
      </div>

      {/* Grid */}
      <div style={{ paddingRight: panelTransport ? 460 : 0, transition: 'padding-right 0.2s' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af', fontSize: 13 }}>
            {typeTab === 'intake' ? 'No inbound pickups.' : typeTab === 'deliveries' ? 'No outbound deliveries.' : 'No transport records.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {filtered.map(t => {
              const st = STATUS_LABEL[t.status] || STATUS_LABEL.awarded;
              const vehicle = (data.vehicles || []).find(v => v.id === t.vehicleId) || {
                id: t.vehicleId, year: null, make: t.vehicleName || '', model: '', trim: '', color: null, vin: null, photos: [], status: 'in_auction',
              };
              const isActive  = panelTransport?.id === t.id;
              const legType   = isIntake(t)
                ? { label: 'Inbound', bg: '#fef3c7', color: '#92400e' }
                : { label: 'Outbound', bg: '#eff6ff', color: '#1e40af' };
              const sched = t.scheduledDate
                ? new Date(t.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : null;

              return (
                <VehicleCard
                  key={t.id}
                  variant="grid"
                  vehicle={vehicle}
                  mileage={vehicle.mileage}
                  highlighted={isActive}
                  showTitleStatus={true}
                  accentOverride={TRANSPORT_ACCENT[t.status] || '#e2e8f0'}
                  onTitleClick={() => navigate(`/acquisitions?v=${vehicle.id}`)}
                  badge={
                    <span style={{ background: st.bg, color: st.color, padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700 }}>
                      {st.label}
                    </span>
                  }
                  pricePill={null}
                  actionButton={
                    <button
                      onClick={() => isActive ? closePanel() : openPanel(t)}
                      style={{ width: '100%', background: isActive ? '#0d2550' : '#fff', color: isActive ? '#fff' : '#0d2550', border: '1.5px solid #0d2550', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {isActive ? '← Viewing' : 'View Transport'}
                    </button>
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ background: legType.bg, color: legType.color, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                      {legType.label}
                    </span>
                    {sched && <span style={{ fontSize: 11, color: '#6b7280' }}>{sched}</span>}
                  </div>
                  {isIntake(t) && t.notes
                    ? <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>From: {t.notes}</div>
                    : !isIntake(t) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: '#0d2550', fontWeight: 700 }}>{t.storeName}</span>
                        {(() => {
                          const wb = (data.bids || []).filter(b => b.vehicleId === t.vehicleId).reduce((top, b) => (!top || b.amount > top.amount) ? b : top, null);
                          return wb ? <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>${wb.amount.toLocaleString()}</span> : null;
                        })()}
                      </div>
                    )
                  }
                </VehicleCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-out panel */}
      {pt && ptVehicle && (
        <div style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: 460,
          background: '#fff', borderLeft: '1px solid #e5e7eb',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
          zIndex: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          {/* Close */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 18px 0' }}>
            <button onClick={closePanel}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: 20, width: 30, height: 30, cursor: 'pointer', fontSize: 18, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>

          {/* Vehicle hero */}
          <div style={{ padding: '4px 20px 20px' }}>
            {(() => {
              const photos = Array.isArray(ptVehicle.photos) ? ptVehicle.photos : [];
              return photos.length > 0 ? (
                <>
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 8, height: 168 }}>
                    <img src={photos[panelPhotoIdx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {photos.length > 1 && (
                      <>
                        <button onClick={() => setPanelPhotoIdx(i => Math.max(0, i - 1))} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                        <button onClick={() => setPanelPhotoIdx(i => Math.min(photos.length - 1, i + 1))} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                        <div style={{ position: 'absolute', bottom: 7, right: 9, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20 }}>{panelPhotoIdx + 1} / {photos.length}</div>
                      </>
                    )}
                  </div>
                  {photos.length > 1 && (
                    <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 14 }}>
                      {photos.map((p, i) => (
                        <img key={i} src={p} alt="" onClick={() => setPanelPhotoIdx(i)}
                          style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0, cursor: 'pointer', border: i === panelPhotoIdx ? '2px solid #0d2550' : '2px solid transparent', opacity: i === panelPhotoIdx ? 1 : 0.6, transition: 'opacity .12s, border-color .12s' }} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ width: '100%', height: 120, background: '#f1f5f9', borderRadius: 10, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#cbd5e1', letterSpacing: 2 }}>
                    {[ptVehicle.make?.[0], ptVehicle.model?.[0]].filter(Boolean).join('').toUpperCase()}
                  </span>
                </div>
              );
            })()}
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>
              {[ptVehicle.year, ptVehicle.make, ptVehicle.model].filter(Boolean).join(' ') || pt.vehicleName || 'Unknown Vehicle'}
            </div>
            {ptVehicle.trim && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{ptVehicle.trim}</div>}
            {(() => {
              const parts = [ptVehicle.color, ptVehicle.engine, ptVehicle.condition, ptVehicle.mileage != null ? `${parseInt(ptVehicle.mileage).toLocaleString()} mi` : null].filter(Boolean);
              return parts.length > 0 ? <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{parts.join(' · ')}</div> : null;
            })()}
            {ptVehicle.vin && <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#6b7280', marginTop: 3 }}>{ptVehicle.vin.toUpperCase()}</div>}

            {/* Stat boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
              {(() => {
                const st = STATUS_LABEL[pt.status] || STATUS_LABEL.awarded;
                return [
                  { label: 'Status', value: st.label, color: st.color, bg: st.bg },
                  { label: 'Type', value: ptIsIntake ? 'Inbound' : 'Outbound', color: ptIsIntake ? '#92400e' : '#1e40af', bg: ptIsIntake ? '#fef3c7' : '#eff6ff' },
                  { label: pt.winningBid ? 'Winning Bid' : 'Destination', value: pt.winningBid ? `$${pt.winningBid.toLocaleString()}` : (ptIsIntake ? 'Intake' : ptStoreName), color: '#0d2550', bg: '#f8fafc' },
                ];
              })().map(box => (
                <div key={box.label} style={{ background: box.bg || '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{box.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: box.color, lineHeight: 1.2 }}>{box.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9' }} />

          {/* Transport details */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Destination info */}
            {!ptIsIntake && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Going To</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StoreAvatar locationId={ptLocationId} size={24} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0d2550' }}>{ptStoreName}</span>
                </div>
              </div>
            )}

            {ptIsIntake && pt.notes && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Pickup From</div>
                <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{pt.notes}</div>
              </div>
            )}

            {/* Scheduled */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em' }}>Scheduled</div>
                {isWholesale && !editingSchedule && (
                  <button onClick={() => setEditingSchedule(true)}
                    style={{ background: 'none', border: 'none', color: '#0d2550', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                    Edit
                  </button>
                )}
              </div>
              {editingSchedule ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input type="datetime-local" value={scheduleInput} onChange={e => setScheduleInput(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleSaveSchedule} disabled={savingSchedule}
                      style={{ flex: 1, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {savingSchedule ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingSchedule(false)}
                      style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, fontWeight: ptScheduledDisplay ? 600 : 400, color: ptScheduledDisplay ? '#374151' : '#94a3b8', fontStyle: ptScheduledDisplay ? 'normal' : 'italic' }}>
                  {ptScheduledDisplay || 'Not set'}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9' }} />

            {/* Step tracker */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Progress</div>
              <StepTracker
                steps={pt.steps || {}}
                currentStatus={pt.status}
                onUpdate={(stepKey) => updateTransport(pt.vehicleId, stepKey)}
                canUpdate={isWholesale}
              />
              {isWholesale && ptNextStep && (
                <button
                  onClick={() => updateTransport(pt.vehicleId, ptNextStep.key)}
                  style={{ marginTop: 10, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Mark as {ptNextStep.label} {ptNextStep.icon}
                </button>
              )}
            </div>

            {/* Notes (deliveries only — intake shows address above) */}
            {!ptIsIntake && (
              <>
                <div style={{ borderTop: '1px solid #f1f5f9' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em' }}>Notes</div>
                    {isWholesale && !editingNotes && (
                      <button onClick={() => { setEditingNotes(true); setNotesInput(pt.notes || ''); }}
                        style={{ background: 'none', border: 'none', color: '#0d2550', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                        {pt.notes ? 'Edit' : '+ Add'}
                      </button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea value={notesInput} onChange={e => setNotesInput(e.target.value)} rows={3}
                        placeholder="Driver info, ETA, contact, etc."
                        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleSaveNotes}
                          style={{ flex: 1, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          Save
                        </button>
                        <button onClick={() => setEditingNotes(false)}
                          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: pt.notes ? '#374151' : '#94a3b8', fontStyle: pt.notes ? 'normal' : 'italic' }}>
                      {pt.notes || 'No notes'}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Close / Delete */}
            {isWholesale && (
              <>
                <div style={{ borderTop: '1px solid #f1f5f9' }} />
                {['arrived', 'titleReceived'].includes(pt?.status) ? (
                  confirmDelete ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>Close this transport record?</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Vehicle and bid history are not affected.</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleDelete}
                          style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          Close Transport
                        </button>
                        <button onClick={() => setConfirmDelete(false)}
                          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)}
                      style={{ width: '100%', background: '#f0fdf4', border: '1.5px solid #86efac', color: '#059669', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      ✓ Close Transport
                    </button>
                  )
                ) : (
                  confirmDelete ? (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}>Delete this transport record?</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Vehicle status is not affected.</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleDelete}
                          style={{ flex: 1, background: '#991b1b', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          Delete
                        </button>
                        <button onClick={() => setConfirmDelete(false)}
                          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)}
                      style={{ background: 'none', border: 'none', color: '#d1d5db', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left', fontWeight: 600 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}>
                      Delete record
                    </button>
                  )
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
