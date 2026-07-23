import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { isTitleIn } from './VehicleCard';

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


const RO_STATUS = {
  draft:            { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  pending:          { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  pending_approval: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  approved:         { bg: '#ede9fe', color: '#6d28d9', label: 'Approved' },
  in_progress:      { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  complete:         { bg: '#d1fae5', color: '#065f46', label: 'Complete' },
  cancelled:        { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled' },
};

const INP = { padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, width: '100%', boxSizing: 'border-box' };

export default function VehicleDetailModal({ vehicle, onClose }) {
  const { data, updateVehicle, addRepairOrder, updateRepairOrder, deleteRepairOrder, repairOrders, repairVendors, addRepairOrderLine, deleteRepairOrderLine, getMileageHistory } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isBidder = user?.role === 'bidder';
  const isWholesale = ['wholesale', 'gm', 'admin'].includes(user?.role);

  const [photoIdx, setPhotoIdx] = useState(0);
  const [titleSaving, setTitleSaving] = useState(false);
  const [addingRo, setAddingRo] = useState(false);
  const [newRoDesc, setNewRoDesc] = useState('');
  const [newRoCost, setNewRoCost] = useState('');
  const [editingRo, setEditingRo] = useState(null);
  const [editRoFields, setEditRoFields] = useState({});
  const [addingLine, setAddingLine] = useState(null);
  const [newLineDesc, setNewLineDesc] = useState('');
  const [newLineCost, setNewLineCost] = useState('');
  const [mileageHistory, setMileageHistory] = useState([]);

  useEffect(() => {
    if (isWholesale) getMileageHistory(vehicle.id).then(setMileageHistory);
  }, [vehicle.id]); // eslint-disable-line

  // Always read from live state so mutations reflect immediately
  const lv = (data.vehicles || []).find(v => v.id === vehicle.id) || vehicle;

  const transport = (data.transport || []).find(t => t.vehicleId === vehicle.id);
  const allRepairs = (repairOrders || []).filter(r => r.vehicleId === vehicle.id);
  const openRepairs = allRepairs.filter(r => !['complete', 'cancelled'].includes(r.status));
  const vendorMap = Object.fromEntries((repairVendors || []).map(v => [v.id, v]));
  const totalRepairCost = allRepairs.reduce((s, r) => s + (r.totalCost || 0), 0);

  const insp = lv.inspection;
  const inspComplete = insp?.status === 'complete';
  const transportStepIdx = transport ? TRANSPORT_STEPS.findIndex(s => s.key === transport.status) : -1;

  const photos = Array.isArray(lv.photos) ? lv.photos : [];
  const prev = useCallback(() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setPhotoIdx(i => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    if (photos.length < 2) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, onClose, photos.length]);

  const toggleTitle = async () => {
    const newStatus = isTitleIn(lv.titleStatus) ? 'pending' : 'clear';
    setTitleSaving(true);
    try {
      await updateVehicle(lv.id, { titleStatus: newStatus });
      showToast(newStatus === 'clear' ? '✓ Title marked IN' : 'Title marked OUT', 'success');
    } catch (e) { showToast('Failed to update title', 'error'); }
    setTitleSaving(false);
  };

  const handleAddRo = async () => {
    if (!newRoDesc.trim()) return;
    const vin6 = lv.vin ? lv.vin.slice(-6) : null;
    try {
      await addRepairOrder(lv.id, vin6, null, newRoDesc.trim(), parseFloat(newRoCost) || 0);
      setNewRoDesc(''); setNewRoCost(''); setAddingRo(false);
      showToast('Repair order added', 'success');
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
  };

  const handleSaveRo = async (roId) => {
    try {
      await updateRepairOrder(roId, {
        notes: editRoFields.notes,
        total_cost: parseFloat(editRoFields.cost) || 0,
        status: editRoFields.status,
      });
      setEditingRo(null);
      showToast('Saved', 'success');
    } catch (e) { showToast('Failed', 'error'); }
  };

  const handleDeleteRo = async (roId) => {
    if (!window.confirm('Delete this repair order?')) return;
    try {
      await deleteRepairOrder(roId);
      showToast('Deleted', 'success');
    } catch (e) { showToast('Failed', 'error'); }
  };

  const handleAddLine = async (roId) => {
    if (!newLineDesc.trim()) return;
    try {
      await addRepairOrderLine(roId, newLineDesc.trim(), parseFloat(newLineCost) || 0, null);
      setAddingLine(null); setNewLineDesc(''); setNewLineCost('');
      showToast('Line item added', 'success');
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
  };

  const handleDeleteLine = async (lineId, roId) => {
    try {
      await deleteRepairOrderLine(lineId, roId);
      showToast('Removed', 'success');
    } catch (e) { showToast('Failed', 'error'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>

        {/* Header */}
        <div style={{ background: '#0d2550', color: '#fff', padding: '20px 24px 16px', borderRadius: '12px 12px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#93c5fd', letterSpacing: '.06em', marginBottom: 4 }}>{lv.vin || '—'}</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{lv.year} {lv.make} {lv.model}{lv.trim ? ' ' + lv.trim : ''}</div>
              <div style={{ fontSize: 13, color: '#93c5fd', marginTop: 3 }}>
                {[lv.color, lv.interior_color].filter(Boolean).join(' / ')}
                {lv.mileage ? ` · ${Number(lv.mileage).toLocaleString()} mi` : ''}
                {lv.condition ? ` · ${lv.condition}` : ''}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.35)', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, padding: '6px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>✕ Close</button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'Status', value: STATUS_LABELS[lv.status] || lv.status },
              !isBidder && lv.buyer_name ? { label: 'Buyer', value: lv.buyer_name } : null,
              { label: 'Title', value: isTitleIn(lv.titleStatus) ? 'IN' : 'OUT' },
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
            <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 16, marginBottom: 0, marginLeft: -24, marginRight: -24 }}>
              <div style={{ position: 'relative', background: '#111', lineHeight: 0 }}>
                <img src={photos[photoIdx]} alt="" style={{ width: '100%', maxHeight: 380, objectFit: 'contain', display: 'block' }} />
                {photos.length > 1 && (
                  <>
                    <button onClick={prev} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>‹</button>
                    <button onClick={next} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>›</button>
                    <div style={{ position: 'absolute', bottom: 10, right: 12, background: 'rgba(0,0,0,.55)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                      {photoIdx + 1} / {photos.length}
                    </div>
                  </>
                )}
              </div>
              {photos.length > 1 && (
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 16px 0', scrollbarWidth: 'thin' }}>
                  {photos.map((p, i) => (
                    <img key={i} src={p} alt="" onClick={() => setPhotoIdx(i)}
                      style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 6, border: `2px solid ${i === photoIdx ? '#e8b84b' : 'transparent'}`, cursor: 'pointer', flexShrink: 0, opacity: i === photoIdx ? 1 : 0.6, transition: 'opacity .15s, border-color .15s' }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transport — wholesale only */}
          {!isBidder && transport && (
            <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 18, marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 18, marginBottom: 10 }}>Transport</div>
              {transport.storeName && transport.storeName !== 'Intake' && (
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                  To: <span style={{ fontWeight: 600, color: '#374151' }}>{transport.storeName}</span>
                </div>
              )}
              {transport.storeName === 'Intake' && transport.notes && (
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                  From: <span style={{ fontWeight: 600, color: '#374151' }}>{transport.notes}</span>
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

          {/* Title — wholesale can toggle */}
          {isWholesale && (
            <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 18, marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em' }}>Title</div>
                <span style={{
                  background: isTitleIn(lv.titleStatus) ? '#d1fae5' : '#fee2e2',
                  color: isTitleIn(lv.titleStatus) ? '#065f46' : '#991b1b',
                  padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                }}>
                  {isTitleIn(lv.titleStatus) ? 'Title IN' : 'Title OUT'}
                </span>
              </div>
              <button
                onClick={toggleTitle}
                disabled={titleSaving}
                style={{
                  width: '100%',
                  background: isTitleIn(lv.titleStatus) ? '#fee2e2' : '#d1fae5',
                  color: isTitleIn(lv.titleStatus) ? '#991b1b' : '#065f46',
                  border: `1.5px solid ${isTitleIn(lv.titleStatus) ? '#fca5a5' : '#6ee7b7'}`,
                  borderRadius: 8, padding: '10px 0',
                  fontSize: 13, fontWeight: 700,
                  cursor: titleSaving ? 'not-allowed' : 'pointer',
                  opacity: titleSaving ? 0.6 : 1,
                }}
              >
                {titleSaving ? '…' : isTitleIn(lv.titleStatus) ? 'Mark Title OUT' : 'Mark Title IN'}
              </button>
            </div>
          )}

          {/* Repairs — wholesale can manage */}
          {isWholesale && (
            <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 18, marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Repairs{totalRepairCost > 0 ? ` · $${totalRepairCost.toLocaleString()}` : ''}
                </div>
                {!addingRo && (
                  <button onClick={() => setAddingRo(true)}
                    style={{ background: 'none', border: 'none', color: '#0d2550', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                    + Add
                  </button>
                )}
              </div>

              {addingRo && (
                <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: '12px 14px', background: '#f8faff', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input autoFocus value={newRoDesc} onChange={e => setNewRoDesc(e.target.value)} placeholder="Description (required)" style={INP} />
                  <input type="number" value={newRoCost} onChange={e => setNewRoCost(e.target.value)} placeholder="Cost $0" min="0" step="0.01" style={INP} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleAddRo} disabled={!newRoDesc.trim()}
                      style={{ flex: 1, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: newRoDesc.trim() ? 'pointer' : 'not-allowed', opacity: newRoDesc.trim() ? 1 : 0.6 }}>
                      Add RO
                    </button>
                    <button onClick={() => { setAddingRo(false); setNewRoDesc(''); setNewRoCost(''); }}
                      style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {allRepairs.length === 0 && !addingRo && (
                <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No repair orders.</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allRepairs.map(ro => {
                  const isEditing = editingRo === ro.id;
                  const vendor = vendorMap[ro.vendorId];
                  const st = RO_STATUS[ro.status] || RO_STATUS.draft;
                  return (
                    <div key={ro.id} style={{ border: `1px solid ${isEditing ? '#0d2550' : '#e5e7eb'}`, borderRadius: 8, overflow: 'hidden' }}>
                      <div
                        onClick={() => {
                          if (isEditing) { setEditingRo(null); }
                          else { setEditingRo(ro.id); setEditRoFields({ notes: ro.notes || '', cost: ro.totalCost || 0, status: ro.status || 'draft' }); }
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', background: isEditing ? '#f0f4fb' : '#fff', gap: 8 }}
                        onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = '#f8faff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isEditing ? '#f0f4fb' : '#fff'; }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ro.notes || '—'}</div>
                          {vendor && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{vendor.name}</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{st.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#0d2550' }}>${(ro.totalCost || 0).toLocaleString()}</span>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteRo(ro.id); }}
                            style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 18, padding: '0 0 0 4px', lineHeight: 1, flexShrink: 0 }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                          >×</button>
                        </div>
                      </div>
                      {/* Line items — always visible when present */}
                      {ro.lines && ro.lines.length > 0 && (
                        <div style={{ background: '#f9fafb', borderTop: '1px solid #f3f4f6', padding: '6px 14px' }}>
                          {ro.lines.map(line => (
                            <div key={line.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f3f4f6' }}>
                              <span style={{ fontSize: 12, color: '#374151' }}>{line.description}</span>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#0d2550' }}>${(line.cost || 0).toLocaleString()}</span>
                                {isEditing && (
                                  <button onClick={() => handleDeleteLine(line.id, ro.id)}
                                    style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}>×</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {isEditing && (
                        <div style={{ padding: '10px 14px', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 8, background: '#f8faff' }}>
                          <input value={editRoFields.notes} onChange={e => setEditRoFields(f => ({ ...f, notes: e.target.value }))} placeholder="Description" style={INP} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <select value={editRoFields.status} onChange={e => setEditRoFields(f => ({ ...f, status: e.target.value }))} style={INP}>
                              <option value="draft">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="complete">Complete</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <input type="number" value={editRoFields.cost} onChange={e => setEditRoFields(f => ({ ...f, cost: e.target.value }))} placeholder="Total cost $0" min="0" step="0.01" style={INP} />
                          </div>
                          {/* Add line item */}
                          {addingLine === ro.id ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input autoFocus value={newLineDesc} onChange={e => setNewLineDesc(e.target.value)} placeholder="Line item description" style={{ ...INP, flex: 2 }} />
                              <input type="number" value={newLineCost} onChange={e => setNewLineCost(e.target.value)} placeholder="$0" min="0" step="0.01" style={{ ...INP, flex: 1 }} />
                              <button onClick={() => handleAddLine(ro.id)} disabled={!newLineDesc.trim()}
                                style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                Add
                              </button>
                              <button onClick={() => { setAddingLine(null); setNewLineDesc(''); setNewLineCost(''); }}
                                style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer', color: '#6b7280' }}>
                                ×
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => { setAddingLine(ro.id); setNewLineDesc(''); setNewLineCost(''); }}
                              style={{ background: 'none', border: '1px dashed #cbd5e1', borderRadius: 6, padding: '6px 0', fontSize: 12, color: '#6b7280', cursor: 'pointer', textAlign: 'center' }}>
                              + Add line item
                            </button>
                          )}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleSaveRo(ro.id)}
                              style={{ flex: 1, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                              Save
                            </button>
                            <button onClick={() => { setEditingRo(null); setAddingLine(null); }}
                              style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mileage History — wholesale only */}
          {isWholesale && mileageHistory.length > 0 && (
            <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 18, marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 18, marginBottom: 10 }}>Mileage History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {mileageHistory.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#f9fafb', borderRadius: 6, border: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{parseInt(m.reading).toLocaleString()} mi</span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      {m.reason === 'intake' ? 'Intake' : m.reason === 'edit' ? 'Updated' : m.reason}
                      {' · '}
                      {new Date(m.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inspection */}
          <div style={{ borderBottom: isBidder && openRepairs.length > 0 ? '1px solid #f3f4f6' : 'none', paddingBottom: 18, marginBottom: isBidder && openRepairs.length > 0 ? 18 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em' }}>Inspection</div>
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

          {/* Open repairs — bidder read-only */}
          {isBidder && openRepairs.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 18, marginBottom: 10 }}>
                Open Repairs ({openRepairs.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {openRepairs.map(ro => (
                  <div key={ro.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{ro.notes || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
