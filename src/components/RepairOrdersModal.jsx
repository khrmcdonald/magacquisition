import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from './Toast';

const STATUS = {
  draft:            { bg: '#fef3c7', color: '#92400e', label: 'Pending',     next: 'in_progress' },
  pending:          { bg: '#fef3c7', color: '#92400e', label: 'Pending',     next: 'in_progress' },
  pending_approval: { bg: '#fef3c7', color: '#92400e', label: 'Pending',     next: 'in_progress' },
  approved:         { bg: '#ede9fe', color: '#6d28d9', label: 'Approved',    next: 'in_progress' },
  in_progress:      { bg: '#dbeafe', color: '#1e40af', label: 'In Progress', next: 'complete' },
  complete:         { bg: '#d1fae5', color: '#065f46', label: 'Complete',    next: 'draft' },
  cancelled:        { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled',   next: 'draft' },
};

export default function RepairOrdersModal({ vehicle, onClose }) {
  const { repairOrders, repairVendors, addRepairOrder, updateRepairOrder, deleteRepairOrder, addRepairVendor } = useData();
  const { showToast } = useToast();

  const [adding, setAdding] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [addingVendor, setAddingVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);

  const vehicleROs = repairOrders.filter(r => r.vehicleId === vehicle.id);
  const totalRepairs = vehicleROs.reduce((s, r) => s + r.totalCost, 0);
  const costBasis = (parseFloat(vehicle.totalCost) || 0) + totalRepairs;

  const resetForm = () => {
    setVendorId(''); setDescription(''); setCost('');
    setAddingVendor(false); setNewVendorName(''); setNewVendorPhone('');
    setAdding(false);
  };

  const handleSaveVendor = async () => {
    if (!newVendorName.trim()) return;
    setSaving(true);
    try {
      const v = await addRepairVendor(newVendorName.trim(), newVendorPhone.trim());
      setVendorId(v.id);
      setAddingVendor(false);
      setNewVendorName(''); setNewVendorPhone('');
    } catch (err) { showToast('Failed to add vendor: ' + err.message, 'error'); }
    setSaving(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!description.trim() || !cost) return;
    setSaving(true);
    try {
      const vin6 = (vehicle.vin || '').slice(-6) || null;
      await addRepairOrder(vehicle.id, vin6, vendorId || null, description.trim(), parseFloat(cost) || 0);
      resetForm();
    } catch (err) { showToast('Failed to add repair order: ' + err.message, 'error'); }
    setSaving(false);
  };

  const cycleStatus = async (ro) => {
    const next = STATUS[ro.status]?.next || 'pending';
    try { await updateRepairOrder(ro.id, { status: next }); }
    catch (err) { showToast('Failed to update status: ' + err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this repair order?')) return;
    try { await deleteRepairOrder(id); showToast('Repair order deleted.', 'success'); }
    catch (err) { showToast('Failed to delete: ' + err.message, 'error'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 64, height: 48, borderRadius: 6, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {vehicle.photos?.[0]
                ? <img src={vehicle.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 24, opacity: 0.25 }}>🚗</span>
              }
            </div>
            <div>
              <h2 style={{ margin: 0 }}>Repair Orders</h2>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </div>
              {vehicle.vin && <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', letterSpacing: '.04em', marginTop: 1 }}>{vehicle.vin}</div>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>

        <div className="modal-body">

          {/* Cost summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Repair costs', value: `$${totalRepairs.toLocaleString()}`, accent: '#e8b84b', color: '#92400e' },
              { label: 'Open ROs',     value: vehicleROs.filter(r => r.status !== 'completed').length, accent: '#3b82f6', color: '#1e40af' },
              { label: 'Cost basis',   value: `$${costBasis.toLocaleString()}`,   accent: '#0d2550', color: '#0d2550' },
            ].map(({ label, value, accent, color }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: `3px solid ${accent}`, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* RO list */}
          {vehicleROs.length === 0 && !adding && (
            <div style={{ textAlign: 'center', padding: '28px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>No repair orders yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Track shop work and costs for this vehicle.</div>
            </div>
          )}

          {vehicleROs.map(ro => {
            const vendor = repairVendors.find(v => v.id === ro.vendorId);
            const st = STATUS[ro.status] || STATUS.draft;
            return (
              <div key={ro.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ro.notes || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{vendor?.name || 'No vendor'}</div>
                </div>
                <span
                  onClick={() => cycleStatus(ro)}
                  title="Click to update status"
                  style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}
                >
                  {st.label}
                </span>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0d2550', minWidth: 64, textAlign: 'right', flexShrink: 0 }}>
                  ${ro.totalCost.toLocaleString()}
                </div>
                <button onClick={() => handleDelete(ro.id)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 18, padding: '0 2px', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                >×</button>
              </div>
            );
          })}

          {/* Add RO form */}
          {adding ? (
            <form onSubmit={handleAdd} style={{ marginTop: 14, border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 12 }}>New repair order</div>

              {/* Vendor row */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Vendor</label>
                {!addingVendor ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={vendorId} onChange={e => setVendorId(e.target.value)}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
                      <option value="">No vendor / TBD</option>
                      {repairVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setAddingVendor(true)}
                      style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#0d2550', background: 'none', border: '1px solid #0d2550', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontWeight: 600 }}>
                      + New vendor
                    </button>
                  </div>
                ) : (
                  <div style={{ background: '#f9fafb', borderRadius: 6, padding: '10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <input value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="Vendor name *"
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} autoFocus />
                      <input value={newVendorPhone} onChange={e => setNewVendorPhone(e.target.value)} placeholder="Phone (optional)"
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={handleSaveVendor} disabled={saving || !newVendorName.trim()}
                        style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        Save vendor
                      </button>
                      <button type="button" onClick={() => setAddingVendor(false)}
                        style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: '#6b7280' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Description + cost */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Description *</label>
                  <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Front brakes, AC recharge, Detail"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Cost *</label>
                  <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0" min="0" step="0.01"
                    style={{ width: 90, padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={saving}
                  style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving…' : 'Add repair order'}
                </button>
                <button type="button" onClick={resetForm}
                  style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '7px 18px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAdding(true)}
              style={{ width: '100%', marginTop: 12, padding: '9px', border: '1.5px dashed #d1d5db', borderRadius: 8, background: 'none', fontSize: 13, fontWeight: 600, color: '#6b7280', cursor: 'pointer' }}>
              + Add repair order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
