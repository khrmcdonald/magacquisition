import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';
import { VehicleCard } from '../components/VehicleCard';

const RO_STATUS = {
  draft:            { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  pending:          { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  pending_approval: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  approved:         { bg: '#ede9fe', color: '#6d28d9', label: 'Approved' },
  in_progress:      { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  complete:         { bg: '#d1fae5', color: '#065f46', label: 'Complete' },
  cancelled:        { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled' },
};

function roAccent(ros) {
  if (ros.some(r => r.status === 'in_progress')) return '#3b82f6';
  if (ros.some(r => ['draft', 'pending', 'pending_approval'].includes(r.status))) return '#f59e0b';
  if (ros.every(r => r.status === 'complete')) return '#10b981';
  if (ros.every(r => r.status === 'cancelled')) return '#94a3b8';
  return '#e2e8f0';
}

const INP = { padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, width: '100%', boxSizing: 'border-box' };

function EditRoForm({ ro, repairVendors, onSave, onCancel }) {
  const [description, setDescription] = useState(ro.notes || '');
  const [vendorId, setVendorId]       = useState(ro.vendorId || '');
  const [cost, setCost]               = useState(ro.totalCost || '');
  const [status, setStatus]           = useState(ro.status || 'draft');
  const [saving, setSaving]           = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(ro.id, { notes: description, vendor_id: vendorId || null, total_cost: parseFloat(cost) || 0, status });
    setSaving(false);
  };

  return (
    <div style={{ padding: '12px 14px', background: '#f8faff', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" style={INP} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <select value={vendorId} onChange={e => setVendorId(e.target.value)} style={INP}>
          <option value="">No vendor</option>
          {repairVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} style={INP}>
          <option value="draft">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="complete">Complete</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost" min="0" step="0.01" style={INP} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ flex: 1, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel}
          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddRoForm({ repairVendors, onSave, onCancel }) {
  const [description, setDescription] = useState('');
  const [vendorId, setVendorId]       = useState('');
  const [cost, setCost]               = useState('');
  const [saving, setSaving]           = useState(false);

  const handleSave = async () => {
    if (!description.trim()) return;
    setSaving(true);
    await onSave(description.trim(), vendorId || null, parseFloat(cost) || 0);
    setSaving(false);
  };

  return (
    <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: '12px 14px', background: '#f8faff', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em' }}>New Repair Order</div>
      <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (required)" style={INP} autoFocus />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <select value={vendorId} onChange={e => setVendorId(e.target.value)} style={INP}>
          <option value="">No vendor</option>
          {repairVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost $0" min="0" step="0.01" style={INP} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving || !description.trim()}
          style={{ flex: 1, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: saving || !description.trim() ? 'not-allowed' : 'pointer', opacity: saving || !description.trim() ? 0.6 : 1 }}>
          {saving ? 'Adding…' : 'Add RO'}
        </button>
        <button onClick={onCancel}
          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Repairs() {
  const { data, repairOrders, repairVendors, addRepairOrder, updateRepairOrder, deleteRepairOrder } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch]             = useState('');
  const [panelVehicle, setPanelVehicle] = useState(null);
  const [editingRo, setEditingRo]       = useState(null);
  const [addingRo, setAddingRo]         = useState(false);

  const vehicles   = data?.vehicles || [];
  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const vendorMap  = Object.fromEntries(repairVendors.map(v => [v.id, v]));

  // All ROs per vehicle (unfiltered — panel always shows full list)
  const rosByVehicle = {};
  repairOrders.forEach(ro => {
    if (!rosByVehicle[ro.vehicleId]) rosByVehicle[ro.vehicleId] = [];
    rosByVehicle[ro.vehicleId].push(ro);
  });

  // Filtered ROs for the grid
  const filteredRos = repairOrders.filter(ro => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'draft'       && !['draft', 'pending', 'pending_approval'].includes(ro.status)) return false;
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

  // Unique vehicles with their filtered ROs
  const vehicleGroups = (() => {
    const seen = new Set();
    const groups = [];
    filteredRos.forEach(ro => {
      if (!seen.has(ro.vehicleId)) {
        seen.add(ro.vehicleId);
        const vehicle = vehicleMap[ro.vehicleId] || { id: ro.vehicleId, make: '—', model: '', year: '', photos: [], status: 'recon' };
        groups.push({ vehicle, ros: filteredRos.filter(r => r.vehicleId === ro.vehicleId) });
      }
    });
    return groups;
  })();

  const kpis = [
    { id: 'all',         label: 'Total ROs',   accent: '#0d2550', color: '#0d2550', count: repairOrders.length },
    { id: 'draft',       label: 'Pending',     accent: '#f59e0b', color: '#92400e', count: repairOrders.filter(r => ['draft','pending','pending_approval'].includes(r.status)).length },
    { id: 'in_progress', label: 'In Progress', accent: '#3b82f6', color: '#1e40af', count: repairOrders.filter(r => r.status === 'in_progress').length },
    { id: 'complete',    label: 'Complete',    accent: '#10b981', color: '#065f46', count: repairOrders.filter(r => r.status === 'complete').length },
  ];

  const handleSave = async (id, fields) => {
    try {
      await updateRepairOrder(id, fields);
      setEditingRo(null);
      showToast('Repair order saved.', 'success');
    } catch (err) { showToast('Failed to save: ' + err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this repair order?')) return;
    try {
      await deleteRepairOrder(id);
      setEditingRo(null);
      showToast('Deleted.', 'success');
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
  };

  const handleAddRo = async (description, vendorId, cost) => {
    const vin6 = panelVehicle?.vin ? panelVehicle.vin.slice(-6) : null;
    try {
      await addRepairOrder(panelVehicle.id, vin6, vendorId, description, cost);
      setAddingRo(false);
      showToast('Repair order added.', 'success');
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
  };

  // Panel data
  const panelRos       = panelVehicle ? (rosByVehicle[panelVehicle.id] || []) : [];
  const panelTotal     = panelRos.reduce((s, r) => s + (r.totalCost || 0), 0);
  const panelOpenCount = panelRos.filter(r => !['complete', 'cancelled'].includes(r.status)).length;

  const openPanel = (vehicle) => {
    setPanelVehicle(vehicle);
    setEditingRo(null);
    setAddingRo(false);
  };

  const closePanel = () => {
    setPanelVehicle(null);
    setEditingRo(null);
    setAddingRo(false);
  };

  return (
    <div style={{ position: 'relative' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Repairs</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 0 }}>All repair orders across the group — click a tile to filter</p>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.id} onClick={() => setStatusFilter(statusFilter === k.id ? 'all' : k.id)}
            style={{
              background: '#fff', border: `1px solid ${statusFilter === k.id ? k.accent : '#e5e7eb'}`,
              borderTop: `3px solid ${k.accent}`, borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
              boxShadow: statusFilter === k.id ? `0 0 0 2px ${k.accent}33` : 'none',
              transition: 'border-color 0.15s',
            }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.count}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search vehicle, description, vendor…"
          style={{ width: 320, padding: '7px 14px', borderRadius: 20, border: '1px solid #e5e7eb', fontSize: 13, background: '#fff' }} />
      </div>

      {/* Grid */}
      <div style={{ paddingRight: panelVehicle ? 460 : 0, transition: 'padding-right 0.2s' }}>
        {vehicleGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 13 }}>
            No repair orders found.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {vehicleGroups.map(({ vehicle, ros }) => {
              const totalCost  = ros.reduce((s, r) => s + (r.totalCost || 0), 0);
              const openCount  = ros.filter(r => !['complete', 'cancelled'].includes(r.status)).length;
              const isActive   = panelVehicle?.id === vehicle.id;

              return (
                <VehicleCard
                  key={vehicle.id}
                  variant="grid"
                  vehicle={vehicle}
                  mileage={vehicle.mileage}
                  highlighted={isActive}
                  accentOverride={roAccent(ros)}
                  onTitleClick={() => navigate(`/acquisitions?v=${vehicle.id}`)}
                  badge={
                    <span style={{ background: '#0d2550', color: '#fff', padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700 }}>
                      {ros.length} RO{ros.length !== 1 ? 's' : ''}
                    </span>
                  }
                  pricePill={null}
                  actionButton={
                    <button
                      onClick={() => isActive ? closePanel() : openPanel(vehicle)}
                      style={{ width: '100%', background: isActive ? '#0d2550' : '#fff', color: isActive ? '#fff' : '#0d2550', border: '1.5px solid #0d2550', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {isActive ? '← Viewing' : 'View Orders'}
                    </button>
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    {openCount > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fef3c7', borderRadius: 4, padding: '1px 6px' }}>
                        {openCount} open
                      </span>
                    )}
                    {totalCost > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>${totalCost.toLocaleString()}</span>
                    )}
                  </div>
                </VehicleCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-out panel */}
      {panelVehicle && (
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
            {panelVehicle.photos?.[0]
              ? <img src={panelVehicle.photos[0]} alt="" style={{ width: '100%', height: 168, objectFit: 'cover', borderRadius: 10, marginBottom: 14 }} />
              : <div style={{ width: '100%', height: 120, background: '#f1f5f9', borderRadius: 10, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#cbd5e1', letterSpacing: 2 }}>
                    {[panelVehicle.make?.[0], panelVehicle.model?.[0]].filter(Boolean).join('').toUpperCase()}
                  </span>
                </div>
            }
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>
              {[panelVehicle.year, panelVehicle.make, panelVehicle.model].filter(Boolean).join(' ') || 'Unknown Vehicle'}
            </div>
            {panelVehicle.trim && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{panelVehicle.trim}</div>}
            {(() => {
              const parts = [panelVehicle.color, panelVehicle.condition, panelVehicle.mileage != null ? `${parseInt(panelVehicle.mileage).toLocaleString()} mi` : null].filter(Boolean);
              return parts.length > 0 ? <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{parts.join(' · ')}</div> : null;
            })()}
            {panelVehicle.vin && (
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#c4c9d3', marginTop: 3 }}>···{panelVehicle.vin.slice(-6).toUpperCase()}</div>
            )}

            {/* Stat boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
              {[
                { label: 'Recon Total', value: panelTotal > 0 ? `$${panelTotal.toLocaleString()}` : '—', color: '#0d2550' },
                { label: 'Orders',      value: panelRos.length, color: '#374151' },
                { label: 'Open',        value: panelOpenCount, color: panelOpenCount > 0 ? '#92400e' : '#065f46', bg: panelOpenCount > 0 ? '#fef3c7' : '#d1fae5' },
              ].map(box => (
                <div key={box.label} style={{ background: box.bg || '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{box.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: box.color, lineHeight: 1 }}>{box.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9' }} />

          {/* RO list */}
          <div style={{ flex: 1, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em' }}>Repair Orders</div>
              {!addingRo && (
                <button onClick={() => setAddingRo(true)}
                  style={{ background: 'none', border: 'none', color: '#0d2550', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  + Add RO
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {addingRo && (
                <AddRoForm
                  repairVendors={repairVendors}
                  onSave={handleAddRo}
                  onCancel={() => setAddingRo(false)}
                />
              )}

              {panelRos.length === 0 && !addingRo && (
                <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>No repair orders yet</div>
              )}

              {panelRos.map(ro => {
                const vendor    = vendorMap[ro.vendorId];
                const st        = RO_STATUS[ro.status] || RO_STATUS.draft;
                const isEditing = editingRo === ro.id;

                return (
                  <div key={ro.id} style={{ border: `1px solid ${isEditing ? '#0d2550' : '#e5e7eb'}`, borderRadius: 8, overflow: 'hidden' }}>
                    <div
                      onClick={() => setEditingRo(isEditing ? null : ro.id)}
                      style={{ padding: '10px 14px', cursor: 'pointer', background: isEditing ? '#f0f4fb' : '#fff', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}
                      onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = '#f8faff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isEditing ? '#f0f4fb' : '#fff'; }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ro.notes || '—'}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{vendor?.name || 'No vendor'}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{st.label}</span>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0d2550' }}>${(ro.totalCost || 0).toLocaleString()}</div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(ro.id); }}
                        style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 18, padding: '0 0 0 4px', lineHeight: 1, alignSelf: 'flex-start', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                      >×</button>
                    </div>

                    {isEditing && (
                      <EditRoForm
                        ro={ro}
                        repairVendors={repairVendors}
                        onSave={handleSave}
                        onCancel={() => setEditingRo(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
