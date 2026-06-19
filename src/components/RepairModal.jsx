import React, { useState } from 'react';
import { VENDOR_SPECIALTIES } from '../pages/Vendors';

// Send a vehicle out for repair. The buyer picks one of TRI-STATE's approved
// vendors, or adds a new one inline without leaving the flow. Works for a
// vehicle at any stage — the repair is an overlay and doesn't change the
// auction stage.
//
// Props:
//   vehicle      — the vehicle being sent out
//   vendors      — data.approvedVendors
//   onAddVendor  — (vendorObj) => id   (persists a new approved vendor)
//   onSend       — (repairInfo) => void
//   onClose      — () => void
export function RepairModal({ vehicle, vendors = [], onAddVendor, onSend, onClose }) {
  const [vendorId, setVendorId] = useState(vendors[0]?.id || 'NEW');
  const [newVendor, setNewVendor] = useState({ name: '', specialty: 'General', phone: '', address: '', poRequired: false });
  const [reason, setReason] = useState('');
  const [estCost, setEstCost] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const addingNew = vendorId === 'NEW' || vendors.length === 0;
  const selectedVendor = addingNew ? null : vendors.find(v => v.id === vendorId);

  const handleSubmit = (e) => {
    e.preventDefault();
    let chosenId = vendorId;
    let chosenName = '';

    if (addingNew) {
      if (!newVendor.name.trim()) { setError('Enter the new vendor name.'); return; }
      chosenName = newVendor.name.trim();
      chosenId = onAddVendor({ ...newVendor, name: chosenName });
    } else {
      const vn = vendors.find(v => v.id === vendorId);
      if (!vn) { setError('Pick a vendor.'); return; }
      chosenName = vn.name;
    }

    onSend({ vendorId: chosenId, vendorName: chosenName, reason, estCost, notes });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>Send to repair</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>{vehicle.year} {vehicle.make} {vehicle.model}{vehicle.trim ? ` · ${vehicle.trim}` : ''}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Approved vendor</label>
              <select
                value={addingNew ? 'NEW' : vendorId}
                onChange={e => { setVendorId(e.target.value); setError(''); }}
              >
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}{v.specialty ? ` — ${v.specialty}` : ''}</option>
                ))}
                <option value="NEW">+ Add new vendor…</option>
              </select>
            </div>

            {addingNew && (
              <div style={{ background: '#f0f4fb', border: '1px solid #c7d6ef', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1a3d76', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>New vendor</div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label>Vendor / shop name</label>
                  <input type="text" value={newVendor.name} onChange={e => { setNewVendor(n => ({ ...n, name: e.target.value })); setError(''); }} placeholder="e.g. Arbor Collision Center" autoFocus />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Specialty</label>
                    <select value={newVendor.specialty} onChange={e => setNewVendor(n => ({ ...n, specialty: e.target.value }))}>
                      {VENDOR_SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Phone</label>
                    <input type="text" value={newVendor.phone} onChange={e => setNewVendor(n => ({ ...n, phone: e.target.value }))} placeholder="(555) 123-4567" />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>This shop is saved to your approved vendors list.</div>
                <div className="form-group" style={{ marginTop: 10, marginBottom: 10 }}>
                  <label>Address</label>
                  <textarea value={newVendor.address} onChange={e => setNewVendor(n => ({ ...n, address: e.target.value }))} rows={2} placeholder="Street, city, state, ZIP" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>PO required?</label>
                  <div style={{ display: 'flex', gap: 18, marginTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, cursor: 'pointer' }}>
                      <input type="radio" name="newVendorPo" checked={newVendor.poRequired === true} onChange={() => setNewVendor(n => ({ ...n, poRequired: true }))} style={{ width: 'auto' }} />
                      Yes
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, cursor: 'pointer' }}>
                      <input type="radio" name="newVendorPo" checked={newVendor.poRequired !== true} onChange={() => setNewVendor(n => ({ ...n, poRequired: false }))} style={{ width: 'auto' }} />
                      No
                    </label>
                  </div>
                </div>
              </div>
            )}

            {!addingNew && selectedVendor?.poRequired && (
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e', fontWeight: 600 }}>
                📋 This vendor requires a purchase order before work begins.
              </div>
            )}

            <div className="form-group">
              <label>What's the repair for?</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Front bumper & fender, hail damage..." />
            </div>

            <div className="form-group">
              <label>Estimated cost</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
                <input type="number" value={estCost} onChange={e => setEstCost(e.target.value)} placeholder="0" style={{ paddingLeft: 24 }} />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Anything the shop should know, drop-off details..." />
            </div>

            {error && <div style={{ color: '#991b1b', fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <div className="modal-footer" style={{ padding: '8px 0 0', borderTop: 'none' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-navy">🔧 Send to repair</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
