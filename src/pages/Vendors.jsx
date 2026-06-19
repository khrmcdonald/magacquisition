import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

// Common shop specialties — used to tag each vendor so the repair picker can
// show what a shop is good for. Free-form "Other" keeps it flexible.
export const VENDOR_SPECIALTIES = [
  'Body work', 'Mechanical', 'Paint', 'Glass', 'Tires', 'Detail', 'Upholstery', 'Electrical', 'General', 'Other',
];

function VendorForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', specialty: 'General', contact: '', phone: '', address: '', poRequired: false, notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, name: form.name.trim() });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Vendor / shop name</label>
        <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Arbor Collision Center" autoFocus />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Specialty</label>
          <select value={form.specialty} onChange={e => set('specialty', e.target.value)}>
            {VENDOR_SPECIALTIES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 123-4567" />
        </div>
      </div>
      <div className="form-group">
        <label>Contact name</label>
        <input type="text" value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="Who to ask for" />
      </div>
      <div className="form-group">
        <label>Address</label>
        <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} placeholder="Street, city, state, ZIP" />
      </div>
      <div className="form-group">
        <label>PO required?</label>
        <div style={{ display: 'flex', gap: 18, marginTop: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, cursor: 'pointer' }}>
            <input type="radio" name="poRequired" checked={form.poRequired === true} onChange={() => set('poRequired', true)} style={{ width: 'auto' }} />
            Yes
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, cursor: 'pointer' }}>
            <input type="radio" name="poRequired" checked={form.poRequired !== true} onChange={() => set('poRequired', false)} style={{ width: 'auto' }} />
            No
          </label>
        </div>
      </div>
      <div className="form-group">
        <label>Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Rates, turnaround, what they're best at..." />
      </div>
      <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: 'none' }}>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-navy">Save vendor</button>
      </div>
    </form>
  );
}

export default function Vendors() {
  const { user } = useAuth();
  const { data, addVendor, updateVendor, deleteVendor } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // TRI-STATE owns this list; GM/Admin can view. Bidders never reach it.
  if (user.role !== 'wholesale' && user.role !== 'gm' && user.role !== 'admin') {
    return <Navigate to="/auction" replace />;
  }
  const isReadOnly = user.role === 'gm';

  const vendors = data.approvedVendors || [];

  const handleSave = (vendor) => {
    if (editing) updateVendor(editing.id, vendor);
    else addVendor(vendor);
    setShowForm(false);
    setEditing(null);
  };

  // How many vehicles are currently out at each vendor — a quick health read.
  const inRepairByVendor = {};
  data.vehicles.forEach(v => {
    if (v.repair?.status === 'in_repair' && v.repair.vendorId) {
      inRepairByVendor[v.repair.vendorId] = (inRepairByVendor[v.repair.vendorId] || 0) + 1;
    }
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Repair Vendors {isReadOnly ? '(GM View)' : ''}</h1>
          <p>TRI-STATE's approved shops for repair work. Any vehicle can be sent out for repair to one of these from Acquisitions.</p>
        </div>
        {!isReadOnly && (
          <button className="btn-navy" onClick={() => { setEditing(null); setShowForm(true); }}>
            + Add vendor
          </button>
        )}
      </div>

      {vendors.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <div className="empty-state">
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔧</div>
            <p>No approved vendors yet</p>
            {!isReadOnly && <span>Add the shops you trust for repair work so they're ready to pick when a car needs repair.</span>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {vendors.map(vn => {
            const active = inRepairByVendor[vn.id] || 0;
            return (
              <div key={vn.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{vn.name}</div>
                    {vn.specialty && (
                      <span style={{ display: 'inline-block', marginTop: 6, background: '#e8eef5', color: '#1a3d76', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                        {vn.specialty}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 22 }}>🔧</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#374151' }}>
                  {vn.contact && <div><strong style={{ color: '#6b7280' }}>Contact:</strong> {vn.contact}</div>}
                  {vn.phone && <div><strong style={{ color: '#6b7280' }}>Phone:</strong> {vn.phone}</div>}
                  {vn.address && <div><strong style={{ color: '#6b7280' }}>Address:</strong> {vn.address}</div>}
                  <div>
                    <strong style={{ color: '#6b7280' }}>PO required:</strong>{' '}
                    <span style={{ fontWeight: 700, color: vn.poRequired ? '#92400e' : '#15803d' }}>
                      {vn.poRequired ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                {vn.notes && (
                  <div style={{ fontSize: 13, color: '#374151', background: '#f9fafb', borderRadius: 8, padding: '8px 10px', borderLeft: '3px solid #e5e7eb' }}>{vn.notes}</div>
                )}

                {active > 0 && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef3c7', borderRadius: 8, padding: '6px 10px' }}>
                    🚗 {active} vehicle{active > 1 ? 's' : ''} in repair here
                  </div>
                )}

                {!isReadOnly && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => { setEditing(vn); setShowForm(true); }}>Edit</button>
                    <button onClick={() => setConfirmDelete(vn)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>{editing ? 'Edit vendor' : 'Add approved vendor'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <VendorForm initial={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🗑</div>
              <h2 style={{ fontSize: 17, marginBottom: 8 }}>Remove vendor?</h2>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
                <strong>{confirmDelete.name}</strong> will be removed from the approved list. Vehicles already sent to this vendor keep their repair record.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="btn-danger" onClick={() => { deleteVendor(confirmDelete.id); setConfirmDelete(null); }}>Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
