import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';

const STATUSES = [
  { value: 'intake',      label: 'Intake',             bg: '#f3f4f6', color: '#6b7280' },
  { value: 'arbitration', label: 'Arbitration',         bg: '#fff7ed', color: '#c2410c' },
  { value: 'inspection',  label: 'Inspection',          bg: '#fef3c7', color: '#92400e' },
  { value: 'recon',       label: 'In Recon',            bg: '#fef3c7', color: '#92400e' },
  { value: 'ready',       label: 'Ready to List',       bg: '#d1fae5', color: '#065f46' },
  { value: 'in_auction',  label: 'Live in Auction',     bg: '#dbeafe', color: '#1e40af' },
  { value: 'awarded',     label: 'Awarded',             bg: '#d1fae5', color: '#065f46' },
  { value: 'no_sale',     label: 'No Sale',             bg: '#fee2e2', color: '#991b1b' },
];

const TITLE_STATUSES = [
  { value: 'clear',   label: 'Title IN'  },
  { value: 'pending', label: 'Title OUT' },
];

const KEYS_OPTIONS = [
  { value: '2/2', label: '2/2 — Both keys' },
  { value: '1/2', label: '1/2 — One key' },
  { value: '0/2', label: '0/2 — No keys' },
  { value: '1/1', label: '1/1 — Single key' },
  { value: '0/1', label: '0/1 — No key' },
];

const CONDITIONS = [
  { value: '',          label: '—'        },
  { value: 'Excellent', label: 'Excellent' },
  { value: 'Good',      label: 'Good'     },
  { value: 'Fair',      label: 'Fair'     },
  { value: 'Poor',      label: 'Poor'     },
];

const BULK_FIELDS = [
  { value: 'status',    label: 'Status'    },
  { value: 'buyer',     label: 'Buyer'     },
  { value: 'sourceId',  label: 'Source'    },
  { value: 'condition', label: 'Condition' },
  { value: 'titleStatus', label: 'Title'  },
  { value: 'keys',      label: 'Key fobs' },
];

const statusStyle = (val) => {
  const s = STATUSES.find(x => x.value === val);
  return s ? { background: s.bg, color: s.color } : { background: '#f3f4f6', color: '#6b7280' };
};

export default function BulkEdit() {
  const navigate = useNavigate();
  const { data, updateVehicle } = useData();
  const { showToast } = useToast();

  const buyers = useMemo(() => (data.profiles || []).filter(p => p.buyer_number), [data.profiles]);
  const sources = useMemo(() => data.acquisition_sources || [], [data.acquisition_sources]);

  // Local staged copy
  const [rows, setRows] = useState(() =>
    (data.vehicles || []).filter(v => v.status !== 'sold').map(v => ({ ...v }))
  );
  const [dirty, setDirty] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Bulk apply state
  const [bulkField, setBulkField] = useState('status');
  const [bulkValue, setBulkValue] = useState('');

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        `${r.year} ${r.make} ${r.model}`.toLowerCase().includes(q) ||
        (r.vin || '').toLowerCase().includes(q) ||
        (r.buyer_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, search, statusFilter]);

  const allVisibleSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(r => next.add(r.id));
        return next;
      });
    }
  };

  const toggleRow = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const changeRow = (id, field, value, extra = {}) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value, ...extra } : r));
    setDirty(prev => new Set([...prev, id]));
  };

  const applyBulk = () => {
    if (!bulkField || !bulkValue || selected.size === 0) return;
    setRows(prev => prev.map(r => {
      if (!selected.has(r.id)) return r;
      if (bulkField === 'buyer') {
        const b = buyers.find(p => p.id === bulkValue);
        return { ...r, buyer_id: b?.id || null, buyer_name: b?.name || '' };
      }
      if (bulkField === 'keys') {
        const [available, total] = bulkValue.split('/').map(Number);
        return { ...r, keys: { available, total } };
      }
      return { ...r, [bulkField]: bulkValue };
    }));
    setDirty(prev => {
      const next = new Set(prev);
      selected.forEach(id => next.add(id));
      return next;
    });
    showToast(`Applied to ${selected.size} vehicles`, 'success');
  };

  const handleSave = async () => {
    if (dirty.size === 0) return;
    setSaving(true);
    const dirtyRows = rows.filter(r => dirty.has(r.id));
    const results = await Promise.allSettled(
      dirtyRows.map(r =>
        updateVehicle(r.id, {
          status: r.status,
          buyer_id: r.buyer_id || null,
          buyer_name: r.buyer_name || null,
          sourceId: r.sourceId || null,
          floorPrice: r.floorPrice || null,
          titleStatus: r.titleStatus || null,
          condition: r.condition || null,
          keys: r.keys || null,
        })
      )
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    setSaving(false);
    if (failed) {
      showToast(`${failed} of ${dirtyRows.length} failed to save`, 'error');
    } else {
      setDirty(new Set());
      showToast(`Saved ${dirtyRows.length} vehicles`, 'success');
    }
  };

  const cell = {
    padding: '0 10px',
    height: 54,
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
    fontSize: 13,
    color: '#111827',
    whiteSpace: 'nowrap',
  };

  const inputStyle = {
    border: '1.5px solid #e5e7eb',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 12,
    color: '#111827',
    background: '#fff',
    cursor: 'pointer',
    width: '100%',
    minWidth: 110,
    outline: 'none',
  };

  const getBulkOptions = () => {
    if (bulkField === 'status') return STATUSES.map(s => ({ value: s.value, label: s.label }));
    if (bulkField === 'buyer') return buyers.map(b => ({ value: b.id, label: `${b.name}${b.buyer_number ? ` #${b.buyer_number}` : ''}` }));
    if (bulkField === 'sourceId') return sources.map(s => ({ value: s.id, label: s.name }));
    if (bulkField === 'condition') return CONDITIONS.filter(c => c.value);
    if (bulkField === 'titleStatus') return TITLE_STATUSES;
    if (bulkField === 'keys') return KEYS_OPTIONS;
    return [];
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: '#0d2550', padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 16, height: 58,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}>
        <button
          onClick={() => navigate('/acquisitions')}
          style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
        >
          ← Acquisitions
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ color: '#f1bb25', fontWeight: 900, fontSize: 16, letterSpacing: '.04em' }}>MASS UPDATE</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 }}>
            {rows.length} vehicles · edit rows, then save all at once
          </div>
        </div>

        {dirty.size > 0 && (
          <div style={{ background: '#f1bb25', color: '#0d2550', fontWeight: 800, fontSize: 12, padding: '4px 12px', borderRadius: 20, flexShrink: 0 }}>
            {dirty.size} unsaved
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={dirty.size === 0 || saving}
          style={{
            background: dirty.size > 0 ? '#f1bb25' : 'rgba(255,255,255,0.1)',
            color: dirty.size > 0 ? '#0d2550' : 'rgba(255,255,255,0.3)',
            border: 'none', padding: '8px 20px', borderRadius: 8,
            fontSize: 13, fontWeight: 800, cursor: dirty.size > 0 ? 'pointer' : 'not-allowed',
            flexShrink: 0, transition: 'all 0.15s',
          }}
        >
          {saving ? 'Saving…' : `Save Changes${dirty.size > 0 ? ` (${dirty.size})` : ''}`}
        </button>
      </div>

      {/* Bulk action bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search year, make, model, VIN…"
          style={{ ...inputStyle, minWidth: 220, width: 'auto', padding: '7px 12px', fontSize: 13 }}
        />

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 130, padding: '7px 10px', fontSize: 13 }}>
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <div style={{ width: 1, height: 28, background: '#e5e7eb', flexShrink: 0 }} />

        {/* Bulk apply — only shown when rows selected */}
        {selected.size > 0 ? (
          <>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0d2550', flexShrink: 0 }}>
              {selected.size} selected →
            </span>
            <select value={bulkField} onChange={e => { setBulkField(e.target.value); setBulkValue(''); }} style={{ ...inputStyle, width: 'auto', minWidth: 110, padding: '7px 10px', fontSize: 13 }}>
              {BULK_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 140, padding: '7px 10px', fontSize: 13 }}>
              <option value="">— pick value —</option>
              {getBulkOptions().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              onClick={applyBulk}
              disabled={!bulkValue}
              style={{ background: '#0d2550', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: bulkValue ? 'pointer' : 'not-allowed', opacity: bulkValue ? 1 : 0.4, flexShrink: 0 }}
            >
              Apply to {selected.size}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              style={{ background: 'none', border: '1.5px solid #e5e7eb', color: '#6b7280', padding: '6px 14px', borderRadius: 7, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
            >
              Clear
            </button>
          </>
        ) : (
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            Check rows below to bulk-apply a field to multiple vehicles at once
          </span>
        )}

        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>
          {filtered.length} of {rows.length} showing
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ ...cell, width: 44, textAlign: 'center', padding: '0 6px' }}>
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} style={{ cursor: 'pointer', width: 15, height: 15 }} />
              </th>
              <th style={{ ...cell, width: 68, fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>Photo</th>
              <th style={{ ...cell, minWidth: 200, fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left' }}>Vehicle</th>
              <th style={{ ...cell, minWidth: 130, fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left' }}>Status</th>
              <th style={{ ...cell, minWidth: 150, fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left' }}>Buyer</th>
              <th style={{ ...cell, minWidth: 140, fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left' }}>Source</th>
              <th style={{ ...cell, minWidth: 110, fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left' }}>Floor Price</th>
              <th style={{ ...cell, minWidth: 120, fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left' }}>Title</th>
              <th style={{ ...cell, minWidth: 100, fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left' }}>Keys</th>
              <th style={{ ...cell, minWidth: 110, fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left' }}>Condition</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 14 }}>
                  No vehicles match your filter
                </td>
              </tr>
            )}
            {filtered.map(row => {
              const isDirty = dirty.has(row.id);
              const isSelected = selected.has(row.id);
              const thumb = Array.isArray(row.photos) && row.photos[0];
              const srcObj = sources.find(s => s.id === row.sourceId);
              const buyerObj = buyers.find(b => b.id === row.buyer_id);

              return (
                <tr
                  key={row.id}
                  onClick={() => toggleRow(row.id)}
                  style={{
                    background: isSelected ? '#eff6ff' : isDirty ? '#fffbeb' : '#fff',
                    borderLeft: isDirty ? '3px solid #f1bb25' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Checkbox */}
                  <td style={{ ...cell, width: 44, textAlign: 'center', padding: '0 6px' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleRow(row.id)} style={{ cursor: 'pointer', width: 15, height: 15 }} />
                  </td>

                  {/* Thumb */}
                  <td style={{ ...cell, width: 68, padding: '0 8px' }} onClick={e => e.stopPropagation()}>
                    {thumb ? (
                      <img src={thumb} alt="" style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 5, display: 'block' }} />
                    ) : (
                      <div style={{ width: 60, height: 44, background: '#f3f4f6', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#d1d5db' }}>🚗</div>
                    )}
                  </td>

                  {/* Vehicle */}
                  <td style={{ ...cell, minWidth: 200, padding: '0 12px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                      {row.year} {row.make} {row.model}
                    </div>
                    {row.trim && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{row.trim}</div>}
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{row.vin ? row.vin.slice(-6) : '—'}</div>
                  </td>

                  {/* Status */}
                  <td style={{ ...cell, minWidth: 130, padding: '0 10px' }} onClick={e => e.stopPropagation()}>
                    <select
                      value={row.status || 'intake'}
                      onChange={e => changeRow(row.id, 'status', e.target.value)}
                      style={{ ...inputStyle, ...statusStyle(row.status), fontWeight: 700, fontSize: 11, border: 'none', padding: '4px 8px', borderRadius: 20 }}
                    >
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>

                  {/* Buyer */}
                  <td style={{ ...cell, minWidth: 150, padding: '0 10px' }} onClick={e => e.stopPropagation()}>
                    <select
                      value={row.buyer_id || ''}
                      onChange={e => {
                        const b = buyers.find(p => p.id === e.target.value);
                        changeRow(row.id, 'buyer_id', e.target.value || null, { buyer_name: b?.name || null });
                      }}
                      style={{ ...inputStyle }}
                    >
                      <option value="">— No buyer —</option>
                      {buyers.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name}{b.buyer_number ? ` #${b.buyer_number}` : ''}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Source */}
                  <td style={{ ...cell, minWidth: 140, padding: '0 10px' }} onClick={e => e.stopPropagation()}>
                    <select
                      value={row.sourceId || ''}
                      onChange={e => changeRow(row.id, 'sourceId', e.target.value || null)}
                      style={{ ...inputStyle }}
                    >
                      <option value="">— No source —</option>
                      {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>

                  {/* Floor Price */}
                  <td style={{ ...cell, minWidth: 110, padding: '0 10px' }} onClick={e => e.stopPropagation()}>
                    <input
                      type="number"
                      value={row.floorPrice || ''}
                      onChange={e => changeRow(row.id, 'floorPrice', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="—"
                      style={{ ...inputStyle, minWidth: 90 }}
                    />
                  </td>

                  {/* Title Status */}
                  <td style={{ ...cell, minWidth: 120, padding: '0 10px' }} onClick={e => e.stopPropagation()}>
                    <select
                      value={row.titleStatus === 'in' || row.titleStatus === 'clear' ? 'clear' : 'pending'}
                      onChange={e => changeRow(row.id, 'titleStatus', e.target.value)}
                      style={{ ...inputStyle }}
                    >
                      {TITLE_STATUSES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </td>

                  {/* Keys */}
                  <td style={{ ...cell, minWidth: 100, padding: '0 10px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number" min={0}
                        value={row.keys?.available ?? ''}
                        onChange={e => changeRow(row.id, 'keys', { total: row.keys?.total ?? 2, available: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                        placeholder="0" style={{ ...inputStyle, width: 40, minWidth: 40, padding: '4px 4px', textAlign: 'center' }}
                      />
                      <span style={{ color: '#9ca3af' }}>/</span>
                      <input
                        type="number" min={0}
                        value={row.keys?.total ?? 2}
                        onChange={e => changeRow(row.id, 'keys', { available: row.keys?.available ?? 0, total: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                        placeholder="2" style={{ ...inputStyle, width: 40, minWidth: 40, padding: '4px 4px', textAlign: 'center' }}
                      />
                    </div>
                  </td>

                  {/* Condition */}
                  <td style={{ ...cell, minWidth: 110, padding: '0 10px' }} onClick={e => e.stopPropagation()}>
                    <select
                      value={row.condition || ''}
                      onChange={e => changeRow(row.id, 'condition', e.target.value || null)}
                      style={{ ...inputStyle }}
                    >
                      {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom save bar — visible when there are unsaved changes */}
      {dirty.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
          background: '#0d2550', padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            You have <strong style={{ color: '#f1bb25' }}>{dirty.size}</strong> unsaved change{dirty.size !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setRows((data.vehicles || []).filter(v => v.status !== 'sold').map(v => ({ ...v }))); setDirty(new Set()); }}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', padding: '8px 16px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ background: '#f1bb25', color: '#0d2550', border: 'none', padding: '8px 24px', borderRadius: 7, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
            >
              {saving ? 'Saving…' : `Save ${dirty.size} Changes`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
