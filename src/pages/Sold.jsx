import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';

const fmt$ = (n) => n != null ? `$${parseFloat(n).toLocaleString()}` : '—';

export default function Sold() {
  const { data, updateVehicle } = useData();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');

  const [editModal, setEditModal] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTo, setEditTo] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = (v) => {
    setEditModal(v);
    setEditPrice(v.soldPrice != null ? String(v.soldPrice) : '');
    setEditDate(v.soldDate || '');
    setEditTo(v.soldTo || '');
  };

  const handleEditSave = async () => {
    if (!editPrice || !editDate || !editTo.trim()) return;
    setEditSaving(true);
    const price = parseFloat(editPrice);
    const cost = editModal.totalCost ? parseFloat(editModal.totalCost) : null;
    const gross = cost != null ? price - cost : null;
    try {
      await updateVehicle(editModal.id, {
        soldPrice: price,
        soldDate: editDate,
        soldTo: editTo.trim(),
        soldGross: gross,
      });
      showToast('Sale record updated.', 'success');
      setEditModal(null);
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    }
    setEditSaving(false);
  };

  const sold = (data.vehicles || [])
    .filter(v => v.status === 'sold')
    .filter(v => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (v.make||'').toLowerCase().includes(q)
        || (v.model||'').toLowerCase().includes(q)
        || (v.vin||'').toLowerCase().includes(q)
        || (v.soldTo||'').toLowerCase().includes(q)
        || (v.buyer_name||'').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (!a.soldDate && !b.soldDate) return 0;
      if (!a.soldDate) return 1;
      if (!b.soldDate) return -1;
      return new Date(b.soldDate) - new Date(a.soldDate);
    });

  const totalGross = sold.reduce((sum, v) => sum + (parseFloat(v.soldGross) || 0), 0);
  const avgGross = sold.length ? totalGross / sold.length : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Sold Units</h1>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by vehicle, VIN, buyer, or sold-to…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Units Sold', value: sold.length },
          { label: 'Total Gross', value: fmt$(totalGross || null), color: totalGross >= 0 ? '#065f46' : '#991b1b' },
          { label: 'Avg Gross', value: avgGross != null ? fmt$(avgGross) : '—', color: avgGross != null ? (avgGross >= 0 ? '#065f46' : '#991b1b') : '#9ca3af' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: color || '#111827' }}>{value}</div>
          </div>
        ))}
      </div>

      {sold.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🏷️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 4 }}>No sold vehicles yet</div>
          <div style={{ fontSize: 13 }}>Units marked as sold will appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sold.map(v => <SoldCard key={v.id} vehicle={v} onEdit={() => openEdit(v)} />)}
        </div>
      )}

      {/* Edit sale record modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header" style={{ background: '#0d2550', borderRadius: '12px 12px 0 0' }}>
              <div>
                <h2 style={{ color: '#fff', fontSize: 17 }}>Edit Sale Record</h2>
                <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 13, marginTop: 2 }}>
                  {editModal.year} {editModal.make} {editModal.model}
                </p>
              </div>
              <button onClick={() => setEditModal(null)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Sale Price *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#374151' }}>$</span>
                  <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} autoFocus style={{ paddingLeft: 26, width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Sale Date *</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Sold To *</label>
                <input type="text" value={editTo} onChange={e => setEditTo(e.target.value)} placeholder="Store name or auction" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              {(() => {
                const price = parseFloat(editPrice);
                const cost = editModal?.totalCost ? parseFloat(editModal.totalCost) : null;
                const gross = (!isNaN(price) && cost != null) ? price - cost : null;
                if (gross == null) return null;
                return (
                  <div style={{ background: gross >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${gross >= 0 ? '#86efac' : '#fecaca'}`, borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Gross (auto-calculated)</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: gross >= 0 ? '#15803d' : '#b91c1c' }}>{gross >= 0 ? '+' : ''}${gross.toLocaleString()}</span>
                  </div>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
              <button
                className="btn-navy"
                onClick={handleEditSave}
                disabled={editSaving || !editPrice || !editDate || !editTo.trim()}
                style={{ opacity: (!editPrice || !editDate || !editTo.trim()) ? 0.45 : 1 }}
              >
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SoldCard({ vehicle: v, onEdit }) {
  const photos = Array.isArray(v.photos) ? v.photos : [];
  const gross = v.soldGross != null ? parseFloat(v.soldGross) : null;

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}>
      {/* Thumbnail */}
      <div style={{ width: 110, flexShrink: 0, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {photos.length > 0
          ? <img src={photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 32, opacity: 0.15 }}>🚗</span>
        }
        <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center' }}>
          <span style={{ background: '#374151', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>SOLD</span>
        </div>
      </div>

      {/* Main info */}
      <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>
          {v.year} {v.make} {v.model}{v.trim ? ` ${v.trim}` : ''}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', letterSpacing: '.04em' }}>{v.vin || '—'}</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 2 }}>
          {v.buyer_name && <span style={{ fontSize: 12, color: '#6b7280' }}>Buyer: <strong style={{ color: '#111827' }}>{v.buyer_name}</strong></span>}
          {v.color && <span style={{ fontSize: 12, color: '#6b7280' }}>{v.color}</span>}
        </div>
      </div>

      {/* Sale details */}
      <div style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0, borderLeft: '1px solid #f3f4f6' }}>
        {[
          { label: 'Sale Date', value: v.soldDate ? new Date(v.soldDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
          { label: 'Sold To', value: v.soldTo || '—' },
          { label: 'Sale Price', value: fmt$(v.soldPrice) },
          {
            label: 'Gross',
            value: gross != null ? fmt$(gross) : '—',
            valueStyle: { color: gross != null ? (gross >= 0 ? '#065f46' : '#991b1b') : '#9ca3af', fontWeight: 800 },
          },
        ].map(({ label, value, valueStyle }) => (
          <div key={label} style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 100, borderLeft: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', ...valueStyle }}>{value}</div>
          </div>
        ))}

        {/* Edit button */}
        <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', borderLeft: '1px solid #f3f4f6' }}>
          <button
            onClick={onEdit}
            style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            ✏️ Edit
          </button>
        </div>
      </div>
    </div>
  );
}
