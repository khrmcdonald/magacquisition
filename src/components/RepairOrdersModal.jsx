import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const STATUS_STYLES = {
  pending:     { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  completed:   { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
};

function LineItemRow({ line, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ flex: 1, fontSize: 13, color: '#374151' }}>{line.description}</div>
      {line.notes && <div style={{ fontSize: 11, color: '#9ca3af', flex: 1 }}>{line.notes}</div>}
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2550', minWidth: 70, textAlign: 'right' }}>${line.cost.toLocaleString()}</div>
      <button onClick={() => onDelete(line.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
    </div>
  );
}

function AddLineForm({ repairOrderId, onDone }) {
  const { addRepairOrderLine } = useData();
  const [desc, setDesc] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!desc || !cost) return;
    setSaving(true);
    try {
      await addRepairOrderLine(repairOrderId, desc, cost, notes);
      setDesc(''); setCost(''); setNotes('');
      onDone();
    } catch (err) {
      alert('Failed to add line: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: '#f9fafb', borderRadius: 6, padding: '10px 12px', marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
        <input
          placeholder="Description (e.g. Front brakes, Labor)"
          value={desc} onChange={e => setDesc(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
          required
        />
        <input
          type="number" placeholder="Cost" min="0" step="0.01"
          value={cost} onChange={e => setCost(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, width: 90 }}
          required
        />
      </div>
      <input
        placeholder="Notes (optional)"
        value={notes} onChange={e => setNotes(e.target.value)}
        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={saving} style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Adding…' : 'Add line'}
        </button>
        <button type="button" onClick={onDone} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: '#6b7280' }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function RepairOrderCard({ ro, vendors, onDelete }) {
  const { updateRepairOrder, deleteRepairOrderLine } = useData();
  const [expanded, setExpanded] = useState(true);
  const [addingLine, setAddingLine] = useState(false);
  const vendor = vendors.find(v => v.id === ro.vendorId);
  const st = STATUS_STYLES[ro.status] || STATUS_STYLES.pending;

  const cycleStatus = async () => {
    const next = { pending: 'in_progress', in_progress: 'completed', completed: 'pending' };
    try { await updateRepairOrder(ro.id, { status: next[ro.status] }); }
    catch (err) { alert('Failed to update status: ' + err.message); }
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
      {/* RO header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f9fafb', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
            {vendor ? vendor.name : 'No vendor'}
          </div>
          {ro.notes && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{ro.notes}</div>}
        </div>
        <span onClick={e => { e.stopPropagation(); cycleStatus(); }} style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}>
          {st.label}
        </span>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0d2550', minWidth: 70, textAlign: 'right' }}>
          ${ro.totalCost.toLocaleString()}
        </div>
        <button onClick={e => { e.stopPropagation(); if (window.confirm('Delete this repair order and all its line items?')) onDelete(ro.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, padding: '0 2px' }}>
          🗑
        </button>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Line items */}
      {expanded && (
        <div style={{ padding: '8px 14px 12px' }}>
          {ro.lines.length === 0 && !addingLine && (
            <div style={{ fontSize: 12, color: '#9ca3af', padding: '6px 0' }}>No line items yet.</div>
          )}
          {ro.lines.map(line => (
            <LineItemRow key={line.id} line={line} onDelete={(id) => deleteRepairOrderLine(id, ro.id)} />
          ))}
          {addingLine
            ? <AddLineForm repairOrderId={ro.id} onDone={() => setAddingLine(false)} />
            : <button onClick={() => setAddingLine(true)} style={{ marginTop: 8, background: 'none', border: '1px dashed #d1d5db', borderRadius: 6, padding: '5px 12px', fontSize: 12, color: '#6b7280', cursor: 'pointer', width: '100%' }}>
                + Add line item
              </button>
          }
        </div>
      )}
    </div>
  );
}

export default function RepairOrdersModal({ vehicle, onClose }) {
  const { repairOrders, repairVendors, addRepairOrder, deleteRepairOrder } = useData();
  const [addingRO, setAddingRO] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [roNotes, setRoNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const vehicleROs = repairOrders.filter(r => r.vehicleId === vehicle.id);
  const totalRepairCost = vehicleROs.reduce((s, r) => s + r.totalCost, 0);
  const vin6 = (vehicle.vin || '').slice(-6) || null;

  const handleAddRO = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addRepairOrder(vehicle.id, vin6, vendorId || null, roNotes || null);
      setVendorId(''); setRoNotes(''); setAddingRO(false);
    } catch (err) {
      alert('Failed to create repair order: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>Repair Orders</h2>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.vin ? `· ${vehicle.vin}` : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>

        <div className="modal-body">
          {/* Cost summary */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, background: '#f0f4fb', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em' }}>Total repair cost</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0d2550' }}>${totalRepairCost.toLocaleString()}</div>
            </div>
            <div style={{ flex: 1, background: '#f0f4fb', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em' }}>Open ROs</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0d2550' }}>{vehicleROs.filter(r => r.status !== 'completed').length}</div>
            </div>
            <div style={{ flex: 1, background: '#f0f4fb', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em' }}>Cost basis</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0d2550' }}>${((vehicle.totalCost || 0) + totalRepairCost).toLocaleString()}</div>
            </div>
          </div>

          {/* RO list */}
          {vehicleROs.map(ro => (
            <RepairOrderCard key={ro.id} ro={ro} vendors={repairVendors} onDelete={deleteRepairOrder} />
          ))}

          {vehicleROs.length === 0 && !addingRO && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔧</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>No repair orders</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Add an RO to track shop work and costs.</div>
            </div>
          )}

          {/* Add RO form */}
          {addingRO ? (
            <form onSubmit={handleAddRO} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#111827' }}>New repair order</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em' }}>Vendor</label>
                  <select value={vendorId} onChange={e => setVendorId(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, marginTop: 4 }}>
                    <option value="">No vendor / TBD</option>
                    {repairVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em' }}>Notes</label>
                  <input value={roNotes} onChange={e => setRoNotes(e.target.value)} placeholder="Optional notes" style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, marginTop: 4, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={saving} style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Creating…' : 'Create RO'}
                </button>
                <button type="button" onClick={() => setAddingRO(false)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '7px 18px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAddingRO(true)} style={{ width: '100%', marginTop: 4, padding: '9px', border: '1.5px dashed #d1d5db', borderRadius: 8, background: 'none', fontSize: 13, fontWeight: 600, color: '#6b7280', cursor: 'pointer' }}>
              + New repair order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
