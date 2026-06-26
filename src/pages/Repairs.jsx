import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';
import { VehicleCard } from '../components/VehicleCard';

const STATUS = {
  draft:            { bg: '#fef3c7', color: '#92400e', label: 'Pending',     next: 'in_progress' },
  pending:          { bg: '#fef3c7', color: '#92400e', label: 'Pending',     next: 'in_progress' },
  pending_approval: { bg: '#fef3c7', color: '#92400e', label: 'Pending',     next: 'in_progress' },
  approved:         { bg: '#ede9fe', color: '#6d28d9', label: 'Approved',    next: 'in_progress' },
  in_progress:      { bg: '#dbeafe', color: '#1e40af', label: 'In Progress', next: 'complete' },
  complete:         { bg: '#d1fae5', color: '#065f46', label: 'Complete',    next: 'draft' },
  cancelled:        { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled',   next: 'draft' },
};


function EditRow({ ro, vehicleName, vin, vendorMap, repairVendors, onSave, onCancel }) {
  const [description, setDescription] = useState(ro.notes || '');
  const [vendorId, setVendorId]       = useState(ro.vendorId || '');
  const [cost, setCost]               = useState(ro.totalCost || '');
  const [status, setStatus]           = useState(ro.status || 'draft');
  const [saving, setSaving]           = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(ro.id, {
      notes:       description,
      vendor_id:   vendorId || null,
      total_cost:  parseFloat(cost) || 0,
      status,
    });
    setSaving(false);
  };

  return (
    <div style={{ padding: '14px 20px', background: '#f0f4fb', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0d2550' }}>{vehicleName}</div>
        {vin && <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', letterSpacing: '.04em', marginTop: 1 }}>{vin}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 130px 110px', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Vendor</label>
          <select value={vendorId} onChange={e => setVendorId(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
            <option value="">No vendor</option>
            {repairVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Cost</label>
          <input type="number" value={cost} onChange={e => setCost(e.target.value)} min="0" step="0.01"
            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
            <option value="draft">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel}
          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '7px 18px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Repairs() {
  const { data, repairOrders, repairVendors, updateRepairOrder, deleteRepairOrder } = useData();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch]             = useState('');
  const [editing, setEditing]           = useState(null);

  const vehicles   = data?.vehicles || [];
  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const vendorMap  = Object.fromEntries(repairVendors.map(v => [v.id, v]));

  const filtered = repairOrders.filter(ro => {
    if (statusFilter !== 'all') {
      const isOpen = ['draft', 'pending', 'in_progress', 'approved', 'pending_approval'].includes(ro.status);
      const isDone = ro.status === 'complete';
      if (statusFilter === 'draft'       && !['draft','pending','pending_approval'].includes(ro.status)) return false;
      if (statusFilter === 'in_progress' && ro.status !== 'in_progress') return false;
      if (statusFilter === 'complete'    && ro.status !== 'complete') return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const v = vehicleMap[ro.vehicleId];
      const label = [v?.year, v?.make, v?.model, ro.notes, vendorMap[ro.vendorId]?.name].join(' ').toLowerCase();
      if (!label.includes(q)) return false;
    }
    return true;
  });

  const kpis = [
    { id: 'all',         label: 'Total ROs',   accent: '#0d2550', color: '#0d2550', count: repairOrders.length },
    { id: 'draft',       label: 'Pending',     accent: '#e8b84b', color: '#92400e', count: repairOrders.filter(r => ['draft','pending','pending_approval'].includes(r.status)).length },
    { id: 'in_progress', label: 'In Progress', accent: '#3b82f6', color: '#1e40af', count: repairOrders.filter(r => r.status === 'in_progress').length },
    { id: 'complete',    label: 'Complete',    accent: '#10b981', color: '#065f46', count: repairOrders.filter(r => r.status === 'complete').length },
  ];

  const handleSave = async (id, fields) => {
    try {
      await updateRepairOrder(id, fields);
      setEditing(null);
      showToast('Repair order saved.', 'success');
    } catch (err) { showToast('Failed to save: ' + err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this repair order?')) return;
    try { await deleteRepairOrder(id); setEditing(null); showToast('Repair order deleted.', 'success'); }
    catch (err) { showToast('Failed to delete: ' + err.message, 'error'); }
  };

  return (
    <div>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Repairs</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 0 }}>All repair orders across the group — click a tile to filter</p>
      </div>

      {/* KPI tiles — click to filter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {kpis.map(k => (
          <div
            key={k.id}
            onClick={() => setStatusFilter(statusFilter === k.id ? 'all' : k.id)}
            style={{
              background: '#fff',
              border: `1px solid ${statusFilter === k.id ? k.accent : '#e5e7eb'}`,
              borderTop: `3px solid ${k.accent}`,
              borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
              transition: 'border-color 0.15s',
              boxShadow: statusFilter === k.id ? `0 0 0 2px ${k.accent}33` : 'none',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.count}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search vehicle, description, vendor…"
          style={{ width: 320, padding: '7px 14px', borderRadius: 20, border: '1px solid #e5e7eb', fontSize: 13, background: '#fff' }}
        />
      </div>

      {/* Grouped by vehicle */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.3 }}>🔧</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>No repair orders</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Add them from the 🔧 button on any vehicle in Acquisitions.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(() => {
            const groups = [];
            const seen = new Set();
            filtered.forEach(ro => {
              if (!seen.has(ro.vehicleId)) {
                seen.add(ro.vehicleId);
                groups.push({
                  vehicle: vehicleMap[ro.vehicleId] || { id: ro.vehicleId, make: ro.vehicleId, model: '', year: '', photos: [], status: 'intake' },
                  ros: filtered.filter(r => r.vehicleId === ro.vehicleId),
                });
              }
            });

            return groups.map(({ vehicle, ros }) => {
              const totalCost = ros.reduce((s, r) => s + (r.totalCost || 0), 0);
              const roCount = ros.length;
              const vehicleName = vehicle.year ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : vehicle.make;

              return (
                <VehicleCard
                  key={vehicle.id}
                  variant="list"
                  vehicle={vehicle}
                  badge={
                    <span style={{ background: '#f0f4fb', color: '#0d2550', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                      {roCount} RO{roCount !== 1 ? 's' : ''}
                    </span>
                  }
                  pricePill={totalCost > 0 ? (
                    <div style={{ background: 'rgba(13,37,80,0.85)', color: '#e8b84b', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>
                      ${totalCost.toLocaleString()}
                    </div>
                  ) : null}
                >
                  {/* RO strip */}
                  <div style={{ borderTop: '1px solid #f3f4f6' }}>
                    {/* Column header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 110px 80px 40px', padding: '7px 20px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      {['Description', 'Vendor', 'Status', 'Cost', ''].map((h, i) => (
                        <div key={i} style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</div>
                      ))}
                    </div>

                    {ros.map((ro, i) => {
                      const vendor = vendorMap[ro.vendorId];
                      const st = STATUS[ro.status] || STATUS.draft;
                      const isEditing = editing === ro.id;

                      return (
                        <div key={ro.id} style={{ borderBottom: i < ros.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                          <div
                            onClick={() => setEditing(isEditing ? null : ro.id)}
                            style={{
                              display: 'grid', gridTemplateColumns: '1fr 150px 110px 80px 40px',
                              padding: '11px 20px', alignItems: 'center', cursor: 'pointer',
                              background: isEditing ? '#f0f4fb' : '#fff',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = '#f8faff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isEditing ? '#f0f4fb' : '#fff'; }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ro.notes || '—'}
                            </div>
                            <div style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {vendor?.name || <span style={{ color: '#d1d5db' }}>No vendor</span>}
                            </div>
                            <div>
                              <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                                {st.label}
                              </span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#0d2550' }}>
                              ${(ro.totalCost || 0).toLocaleString()}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(ro.id); }}
                                style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 16, padding: '2px 4px', borderRadius: 4 }}
                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                              >×</button>
                            </div>
                          </div>

                          {isEditing && (
                            <EditRow
                              ro={ro}
                              vehicleName={vehicleName}
                              vin={vehicle.vin || null}
                              vendorMap={vendorMap}
                              repairVendors={repairVendors}
                              onSave={handleSave}
                              onCancel={() => setEditing(null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </VehicleCard>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
