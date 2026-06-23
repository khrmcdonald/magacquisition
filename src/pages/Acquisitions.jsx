import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase, uploadVehiclePhoto } from '../lib/supabase';
import { VehicleCard } from '../components/VehicleCard';

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];
const RECON_ITEMS = ['Detail', 'Tires', 'Brakes', 'Body work', 'Mechanical', 'Glass', 'Interior', 'Paint', 'Other'];

const TITLE_STATUSES = [
  { value: 'pending', label: 'Pending', bg: '#fef3c7', color: '#92400e' },
  { value: 'in_transit', label: 'Title in Transit', bg: '#dbeafe', color: '#1e40af' },
  { value: 'on_hand', label: 'On Hand', bg: '#d1fae5', color: '#065f46' },
  { value: 'lien', label: 'Lien – Payoff Needed', bg: '#fee2e2', color: '#991b1b' },
  { value: 'missing', label: 'Missing / Issue', bg: '#fee2e2', color: '#991b1b' },
  { value: 'transferred', label: 'Transferred Out', bg: '#f3f4f6', color: '#6b7280' },
];

const AUCTION_STATUSES = [
  { value: 'intake', label: 'Intake', bg: '#f3f4f6', color: '#6b7280' },
  { value: 'recon', label: 'In Recon', bg: '#fef3c7', color: '#92400e' },
  { value: 'ready', label: 'Ready to List', bg: '#d1fae5', color: '#065f46' },
];

function InlineSelect({ options, current, onChange, minWidth, label }) {
  const [open, setOpen] = React.useState(false);
  const cur = options.find(o => o.value === current) || options[0];

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 8888, background: 'rgba(0,0,0,0.4)' }}
        />
      )}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
          style={{
            background: cur.bg, color: cur.color,
            border: `2px solid ${cur.color}66`,
            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            minWidth: minWidth || 150, whiteSpace: 'nowrap',
          }}
        >
          <span style={{ flex: 1, textAlign: 'left' }}>{cur.label}</span>
          <span style={{ fontSize: 11 }}>{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', zIndex: 9999,
              background: '#fff', borderRadius: 14,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              border: '1px solid #e5e7eb',
              width: 300,
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              overflow: 'hidden',
            }}
          >
            <div style={{ background: '#1a3d76', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#f1bb25', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {label || 'Select'}
              </span>
              <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
            </div>
            {options.map(opt => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                  color: opt.color,
                  background: current === opt.value ? opt.bg : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  borderBottom: '1px solid #f3f4f6',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = opt.bg}
                onMouseLeave={e => e.currentTarget.style.background = current === opt.value ? opt.bg : '#fff'}
              >
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: current === opt.value ? opt.color : '#e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: '#fff', fontWeight: 800,
                }}>
                  {current === opt.value ? '✓' : ''}
                </span>
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function VehicleStatusDropdown({ vehicle, onChange }) {
  const isLocked = ['in_auction', 'awarded', 'no_sale'].includes(vehicle.status);
  if (isLocked) {
    const lockedMap = {
      in_auction: { label: 'Live in Auction', bg: '#dbeafe', color: '#1e40af' },
      awarded: { label: 'Awarded', bg: '#d1fae5', color: '#065f46' },
      no_sale: { label: 'No Sale', bg: '#fee2e2', color: '#991b1b' },
    };
    const s = lockedMap[vehicle.status];
    return <span style={{ background: s.bg, color: s.color, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.label}</span>;
  }
  return <InlineSelect options={AUCTION_STATUSES} current={vehicle.status} onChange={onChange} minWidth={150} label="Vehicle status" />;
}

function TitleStatusDropdown({ vehicleId, current, onChange }) {
  return <InlineSelect options={TITLE_STATUSES} current={current || 'pending'} onChange={onChange} minWidth={160} label="Title status" />;
}

function TitleStatusBadge({ value }) {
  const ts = TITLE_STATUSES.find(t => t.value === value) || TITLE_STATUSES[0];
  return (
    <span style={{ background: ts.bg, color: ts.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {ts.label}
    </span>
  );
}

function ExcelUploadModal({ onClose, onImport }) {
  const [rows, setRows] = React.useState([]);
  const [error, setError] = React.useState('');
  const [importing, setImporting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const fileRef = React.useRef();

  const FIELD_MAP = {
    'vin': 'vin', 'year': 'year', 'make': 'make', 'model': 'model',
    'trim': 'trim', 'mileage': 'mileage', 'color': 'color', 'source': 'source',
    'condition': 'condition', 'purchase price': 'purchasePrice',
    'overhead costs': 'overheadCosts', 'recon costs': 'reconCosts',
    'floor price': 'floorPrice', 'title status': 'titleStatus',
    'title notes': 'titleNotes', 'notes': 'notes',
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setRows([]);
    try {
      const XLSX = window.XLSX;
      if (!XLSX) { setError('Spreadsheet parser not loaded yet. Please refresh the page and try again.'); return; }
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      let headerRowIdx = raw.findIndex(r => r.some(c => String(c).toLowerCase() === 'vin'));
      if (headerRowIdx === -1) { setError('Could not find header row. Make sure your file uses the MAG template.'); return; }

      const headers = raw[headerRowIdx].map(h => String(h).toLowerCase().trim());
      const dataRows = raw.slice(headerRowIdx + 2);

      const parsed = dataRows
        .filter(row => row.some(c => c !== ''))
        .map(row => {
          const obj = {};
          headers.forEach((h, i) => {
            const key = FIELD_MAP[h];
            if (key) obj[key] = String(row[i] || '').trim();
          });
          const purchase = parseFloat(obj.purchasePrice) || 0;
          const overhead = parseFloat(obj.overheadCosts) || 0;
          const recon = parseFloat(obj.reconCosts) || 0;
          obj.totalCost = purchase + overhead + recon;
          obj.reconItems = [];
          obj.reconCosts = {};
          obj.photos = [];
          obj.status = 'intake';
          return obj;
        })
        .filter(obj => obj.vin && obj.make && obj.model);

      if (parsed.length === 0) { setError('No valid vehicle rows found. Check that VIN, Make, and Model columns are filled in.'); return; }
      setRows(parsed);
    } catch (err) {
      setError('Could not read file. Make sure it is a valid .xlsx file.');
    }
  };

  const handleImport = () => {
    setImporting(true);
    onImport(rows);
    setDone(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2>Upload inventory spreadsheet</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>
        <div className="modal-body">
          {done ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#065f46' }}>{rows.length} vehicles imported!</p>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>All vehicles added to Acquisitions with Intake status.</p>
              <button className="btn-navy" style={{ marginTop: 20 }} onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              <div className="alert alert-info" style={{ marginBottom: 20 }}>
                Use the <strong>MAG Inventory Template</strong> for best results. Download it from the Acquisitions page. VIN, Make, and Model are required for each row.
              </div>

              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />

              {rows.length === 0 && (
                <div
                  onClick={() => fileRef.current.click()}
                  style={{ border: '2px dashed #c7d6ef', borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: '#f0f4fb' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#1a3d76'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#c7d6ef'}
                >
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
                  <p style={{ fontWeight: 600, color: '#1a3d76', fontSize: 15, margin: 0 }}>Click to choose your .xlsx file</p>
                  <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Or drag and drop</p>
                </div>
              )}

              {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

              {rows.length > 0 && (
                <>
                  <div className="alert alert-success" style={{ marginBottom: 16 }}>
                    ✓ Found <strong>{rows.length} vehicles</strong> ready to import. Review below then click Import.
                  </div>
                  <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f5f6f8', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '8px 12px', fontSize: 11, color: '#6b7280', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase' }}>Vehicle</th>
                          <th style={{ padding: '8px 12px', fontSize: 11, color: '#6b7280', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase' }}>VIN</th>
                          <th style={{ padding: '8px 12px', fontSize: 11, color: '#6b7280', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase' }}>Miles</th>
                          <th style={{ padding: '8px 12px', fontSize: 11, color: '#6b7280', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase' }}>Cost</th>
                          <th style={{ padding: '8px 12px', fontSize: 11, color: '#6b7280', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase' }}>Title</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{r.year} {r.make} {r.model}</td>
                            <td style={{ padding: '10px 12px', fontSize: 11, fontFamily: 'monospace', color: '#6b7280' }}>{r.vin}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12 }}>{r.mileage ? parseInt(r.mileage).toLocaleString() : '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#1a3d76' }}>{r.totalCost ? `$${r.totalCost.toLocaleString()}` : '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12 }}>{r.titleStatus || 'pending'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={() => { setRows([]); setError(''); }}>Choose different file</button>
                    <button className="btn-navy" onClick={handleImport} disabled={importing}>
                      {importing ? 'Importing...' : `Import ${rows.length} vehicles`}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── VinInput ─────────────────────────────────────────────────────────────────
function VinInput({ value, onChange }) {
  const CELLS = 17;
  const refs = React.useRef([]);
  const chars = ((value || '').padEnd(CELLS)).split('').slice(0, CELLS);

  const handleChange = (i, e) => {
    const ch = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(-1);
    const next = [...chars];
    next[i] = ch;
    onChange(next.join('').trimEnd());
    if (ch && i < CELLS - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (!chars[i] && i > 0) {
        const next = [...chars];
        next[i - 1] = '';
        onChange(next.join('').trimEnd());
        refs.current[i - 1]?.focus();
      }
    }
  };

  const handlePaste = (i, e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, CELLS - i);
    const next = [...chars];
    [...pasted].forEach((ch, j) => { if (i + j < CELLS) next[i + j] = ch; });
    onChange(next.join('').trimEnd());
    refs.current[Math.min(i + pasted.length, CELLS - 1)]?.focus();
  };

  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {Array.from({ length: CELLS }).map((_, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          maxLength={2}
          value={chars[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={e => handlePaste(i, e)}
          style={{
            width: 28, height: 36, textAlign: 'center', padding: 0,
            border: '1px solid #d1d5db', borderRadius: 4,
            fontSize: 13, fontFamily: 'monospace', fontWeight: 700,
            textTransform: 'uppercase',
          }}
        />
      ))}
    </div>
  );
}

// ── YesNoToggle ───────────────────────────────────────────────────────────────
function YesNoToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid #d1d5db', width: 'fit-content' }}>
      <button
        type="button"
        onClick={() => onChange(true)}
        style={{
          padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
          background: value === true ? '#065f46' : '#f9fafb',
          color: value === true ? '#fff' : '#374151',
        }}
      >Yes</button>
      <button
        type="button"
        onClick={() => onChange(false)}
        style={{
          padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
          borderLeft: '1px solid #d1d5db',
          background: value === false ? '#991b1b' : '#f9fafb',
          color: value === false ? '#fff' : '#374151',
        }}
      >No</button>
    </div>
  );
}

// ── VehicleForm ───────────────────────────────────────────────────────────────
function VehicleForm({ initial, onSave, onCancel, sources = [], locations = [] }) {
  const [form, setForm] = useState(initial ? {
    ...initial,
    photos: Array.isArray(initial.photos) ? initial.photos : [],
    source_id: sources.find(s => s.label === initial.source)?.value || '',
    // deal fields default empty on edit (deal_record already exists)
    seller_name: '', buyer_rep: '', purchase_amount: '',
    lienholder: '', payoff_amount: '', cashiers_check: false,
    title_electronic: false, pickup_address: '', pickup_scheduled_at: '',
    driver_id: '',
  } : {
    vin: '', year: '', make: '', model: '', trim: '', mileage: '', color: '',
    source_id: '', purchasePrice: '', condition: 'Good', notes: '',
    overheadCosts: '', reconItems: [], reconNotes: '', floorPrice: '', photos: [],
    titleStatus: 'pending', titleNotes: '', currentLocation: '', vendorNotes: '',
    // deal record fields
    seller_name: '', buyer_rep: '', purchase_amount: '',
    lienholder: '', payoff_amount: '', cashiers_check: false,
    title_electronic: false, pickup_address: '', pickup_scheduled_at: '',
    driver_id: '',
  });
  const [reconCosts, setReconCosts] = useState(initial?.reconCosts || {});
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const totalCost = () => {
    const purchase = parseFloat(form.purchasePrice) || 0;
    const overhead = parseFloat(form.overheadCosts) || 0;
    const recon = Object.values(reconCosts).reduce((a, b) => a + (parseFloat(b) || 0), 0);
    return purchase + overhead + recon;
  };

  const handlePhoto = (e) => {
    const files = Array.from(e.target.files);
    const vin6 = (form.vin || '').slice(-6) || 'unknown';
    files.forEach((file, fileIdx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
            else { w = Math.round(w * MAX / h); h = MAX; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const currentIndex = (form.photos || []).length + fileIdx;
          canvas.toBlob(async (blob) => {
            try {
              const url = await uploadVehiclePhoto(blob, vin6, currentIndex);
              setForm(f => ({ ...f, photos: [...(f.photos || []), url] }));
            } catch (err) {
              console.log('Photo upload error:', JSON.stringify(err, null, 2));
              // Fallback: store as data URL so the photo isn't lost
              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
              setForm(f => ({ ...f, photos: [...(f.photos || []), dataUrl] }));
            }
          }, 'image/jpeg', 0.7);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Derive source name from source_id for backward-compat display elsewhere
    const sourceObj = sources.find(s => s.value === form.source_id);
    onSave({ ...form, reconCosts, totalCost: totalCost(), source: sourceObj?.label || form.source || '' });
  };

  const toggleRecon = (item) => {
    const items = form.reconItems || [];
    set('reconItems', items.includes(item) ? items.filter(i => i !== item) : [...items, item]);
  };

  const sectionLabel = (text) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#1a3d76', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12, marginTop: 20, borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>
      {text}
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>

      {sectionLabel('Vehicle Details')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label>VIN</label>
          <VinInput value={form.vin} onChange={v => set('vin', v)} />
        </div>
        <div className="form-group">
          <label>Year</label>
          <input type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2023" min={1990} max={2030} />
        </div>
        <div className="form-group">
          <label>Make</label>
          <input type="text" value={form.make} onChange={e => set('make', e.target.value)} placeholder="GMC" />
        </div>
        <div className="form-group">
          <label>Model</label>
          <input type="text" value={form.model} onChange={e => set('model', e.target.value)} placeholder="Sierra 1500" />
        </div>
        <div className="form-group">
          <label>Trim</label>
          <input type="text" value={form.trim} onChange={e => set('trim', e.target.value)} placeholder="SLT" />
        </div>
        <div className="form-group">
          <label>Mileage</label>
          <input type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="42100" />
        </div>
        <div className="form-group">
          <label>Color</label>
          <input type="text" value={form.color} onChange={e => set('color', e.target.value)} placeholder="White" />
        </div>
        <div className="form-group">
          <label>Source</label>
          <select value={form.source_id} onChange={e => set('source_id', e.target.value)}>
            <option value="">Select source…</option>
            {sources.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Condition</label>
          <select value={form.condition} onChange={e => set('condition', e.target.value)}>
            {CONDITIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Purchase price</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
            <input type="number" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} placeholder="0" style={{ paddingLeft: 24 }} />
          </div>
        </div>
        <div className="form-group">
          <label>Overhead / transport / fees</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
            <input type="number" value={form.overheadCosts} onChange={e => set('overheadCosts', e.target.value)} placeholder="0" style={{ paddingLeft: 24 }} />
          </div>
        </div>
      </div>

      {/* Recon */}
      <div style={{ margin: '8px 0 16px' }}>
        <label style={{ marginBottom: 10, display: 'block' }}>Reconditioning needed</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {RECON_ITEMS.map(item => {
            const active = (form.reconItems || []).includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleRecon(item)}
                style={{
                  padding: '6px 12px', borderRadius: 20,
                  border: `1px solid ${active ? '#1a3d76' : '#e5e7eb'}`,
                  background: active ? '#1a3d76' : '#fff',
                  color: active ? '#fff' : '#374151',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                {item}
              </button>
            );
          })}
        </div>
        {(form.reconItems || []).length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {form.reconItems.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#374151', minWidth: 80 }}>{item}</span>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 13 }}>$</span>
                  <input
                    type="number"
                    value={reconCosts[item] || ''}
                    onChange={e => setReconCosts(c => ({ ...c, [item]: e.target.value }))}
                    placeholder="0"
                    style={{ paddingLeft: 22, fontSize: 13, padding: '7px 8px 7px 22px' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Notes (recon details, issues, etc.)</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="E.g. Needs front bumper clip, driver seat wear..." />
      </div>

      <div className="form-group">
        <label>Suggested floor price for auction</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
          <input type="number" value={form.floorPrice} onChange={e => set('floorPrice', e.target.value)} placeholder="0" style={{ paddingLeft: 24 }} />
        </div>
      </div>

      {/* Cost summary */}
      {(parseFloat(form.purchasePrice) > 0) && (
        <div style={{ background: '#f0f4fb', borderRadius: 8, padding: '14px 16px', marginBottom: 16, border: '1px solid #c7d6ef' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a3d76', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Cost summary (private)</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 4 }}>
            <span>Purchase price</span>
            <span>${(parseFloat(form.purchasePrice) || 0).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 4 }}>
            <span>Overhead / fees</span>
            <span>${(parseFloat(form.overheadCosts) || 0).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 4 }}>
            <span>Recon costs</span>
            <span>${Object.values(reconCosts).reduce((a, b) => a + (parseFloat(b) || 0), 0).toLocaleString()}</span>
          </div>
          <div style={{ height: 1, background: '#c7d6ef', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#1a3d76' }}>
            <span>Total cost basis</span>
            <span>${totalCost().toLocaleString()}</span>
          </div>
          {form.floorPrice && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: totalCost() < parseFloat(form.floorPrice) ? '#065f46' : '#991b1b', marginTop: 6 }}>
              <span>Margin at floor</span>
              <span>${(parseFloat(form.floorPrice) - totalCost()).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Location & vendor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Current location</label>
          <select value={form.currentLocation || ''} onChange={e => set('currentLocation', e.target.value)}>
            <option value="">Select location…</option>
            {locations.map(l => <option key={l.value} value={l.label}>{l.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Vendor / work notes</label>
          <input type="text" value={form.vendorNotes || ''} onChange={e => set('vendorNotes', e.target.value)} placeholder="e.g. Arbor Auto — brakes, ETA Friday" />
        </div>
      </div>

      {/* ── Deal Record Fields ─────────────────────────────────────────────── */}
      {sectionLabel('Deal Record')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Seller name</label>
          <input type="text" value={form.seller_name} onChange={e => set('seller_name', e.target.value)} placeholder="John Smith" />
        </div>
        <div className="form-group">
          <label>Buyer rep (who found the deal)</label>
          <input type="text" value={form.buyer_rep} onChange={e => set('buyer_rep', e.target.value)} placeholder="Team member name" />
        </div>
        <div className="form-group">
          <label>Lienholder</label>
          <input type="text" value={form.lienholder} onChange={e => set('lienholder', e.target.value)} placeholder="Bank or lender name" />
        </div>
        {form.lienholder && (
          <>
            <div className="form-group">
              <label>Payoff amount</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
                <input type="number" value={form.payoff_amount} onChange={e => set('payoff_amount', e.target.value)} placeholder="0" style={{ paddingLeft: 24 }} />
              </div>
            </div>
            {form.purchasePrice && form.payoff_amount && (
              <div className="form-group">
                <label>Equity (purchase − payoff)</label>
                <div style={{
                  padding: '9px 12px', borderRadius: 6, fontWeight: 700, fontSize: 14,
                  background: (parseFloat(form.purchasePrice) - parseFloat(form.payoff_amount)) >= 0 ? '#d1fae5' : '#fee2e2',
                  color: (parseFloat(form.purchasePrice) - parseFloat(form.payoff_amount)) >= 0 ? '#065f46' : '#991b1b',
                }}>
                  ${(parseFloat(form.purchasePrice) - parseFloat(form.payoff_amount)).toLocaleString()}
                </div>
              </div>
            )}
          </>
        )}
        <div className="form-group">
          <label>Title status</label>
          <select value={form.titleStatus || 'pending'} onChange={e => set('titleStatus', e.target.value)}>
            {TITLE_STATUSES.map(ts => <option key={ts.value} value={ts.value}>{ts.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Title notes</label>
          <input type="text" value={form.titleNotes || ''} onChange={e => set('titleNotes', e.target.value)} placeholder="Lien holder, ETA, reference #..." />
        </div>
        <div className="form-group">
          <label>Pickup address</label>
          <input type="text" value={form.pickup_address} onChange={e => set('pickup_address', e.target.value)} placeholder="123 Main St, City, State" />
        </div>
        <div className="form-group">
          <label>Pickup scheduled</label>
          <input type="datetime-local" value={form.pickup_scheduled_at} onChange={e => set('pickup_scheduled_at', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Driver</label>
          <input type="text" value={form.driver_id} onChange={e => set('driver_id', e.target.value)} placeholder="Driver name or ID" />
        </div>
      </div>

      {/* Yes/No toggles */}
      <div style={{ display: 'flex', gap: 32, marginTop: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Cashier's Check</div>
          <YesNoToggle value={form.cashiers_check} onChange={v => set('cashiers_check', v)} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Electronic Title</div>
          <YesNoToggle value={form.title_electronic} onChange={v => set('title_electronic', v)} />
        </div>
      </div>

      {/* ── Photos ────────────────────────────────────────────────────────── */}
      {sectionLabel('Photos')}
      <div className="form-group">
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} style={{ display: 'none' }} />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => fileRef.current.click()}
          disabled={(form.photos || []).length >= 6}
          style={{ marginBottom: 10, opacity: (form.photos || []).length >= 6 ? 0.5 : 1 }}
        >
          + Add photos {(form.photos || []).length > 0 ? `(${(form.photos || []).length}/6)` : ''}
        </button>
        {(form.photos || []).length >= 6 && (
          <div style={{ fontSize: 12, color: '#92400e', marginBottom: 8 }}>Max 6 photos per vehicle</div>
        )}
        {form.photos && form.photos.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {form.photos.map((p, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={p} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: 'none' }}>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-navy">Save vehicle</button>
      </div>
    </form>
  );
}

const STATUS_LABELS = {
  intake: { label: 'Intake', color: '#6b7280', bg: '#f3f4f6' },
  recon: { label: 'In Recon', color: '#92400e', bg: '#fef3c7' },
  ready: { label: 'Ready to List', color: '#065f46', bg: '#d1fae5' },
  in_auction: { label: 'Live in Auction', color: '#1e40af', bg: '#dbeafe' },
  awarded: { label: 'Awarded', color: '#065f46', bg: '#d1fae5' },
  no_sale: { label: 'No Sale', color: '#991b1b', bg: '#fee2e2' },
};

export default function Acquisitions() {
  const { user } = useAuth();
  const { data, addVehicle, updateVehicle, deleteVehicle, listVehicle, unlistVehicle, resolveArbitration } = useData();
  const [resolveModal, setResolveModal] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewVehicle, setViewVehicle] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [mileageMap, setMileageMap] = useState({});
  const [viewMode, setViewMode] = useState('list');

  useEffect(() => {
    if (!data.vehicles.length) return;
    const ids = data.vehicles.map(v => v.id);
    supabase
      .from('mileage_log')
      .select('vehicle_id, reading, logged_at')
      .in('vehicle_id', ids)
      .order('logged_at', { ascending: false })
      .then(({ data: rows }) => {
        const map = {};
        rows?.forEach(r => { if (!map[r.vehicle_id]) map[r.vehicle_id] = r.reading; });
        setMileageMap(map);
      });
  }, [data.vehicles]);

  if (user.role !== 'wholesale' && user.role !== 'gm' && user.role !== 'admin') {
    return <Navigate to="/auction" replace />;
  }

  const isReadOnly = user.role === 'gm';

  // Map DB tables to option arrays
  const sourceOptions = (data.acquisition_sources || []).map(s => ({ value: s.id, label: s.name }));
  const locationOptions = (data.locations || []).map(l => ({ value: l.id, label: l.name }));

  const allVehicles = data.vehicles;
  const filtered = statusFilter === 'all' ? allVehicles : allVehicles.filter(v => v.status === statusFilter);

  const fmtErr = (e) => e?.message ?? e?.details ?? JSON.stringify(e);

  const handleSave = async (vehicleData) => {
    setSaveError(null);
    // Separate deal record fields from vehicle fields
    const {
      seller_name, buyer_rep, purchase_amount, lienholder, payoff_amount,
      cashiers_check, title_electronic, pickup_address, pickup_scheduled_at,
      driver_id, source_id,
      ...vehicleFields
    } = vehicleData;

    const orgId = user?.org_id || 'bf236d2b-4693-4606-bf3d-ece1767690ab';

    if (editing) {
      try { await updateVehicle(editing.id, { ...vehicleFields, status: editing.status }); }
      catch (err) { console.log('updateVehicle (edit save) error:', JSON.stringify(err, null, 2)); setSaveError(`Update failed: ${fmtErr(err)}`); return; }
    } else {
      let newVehicle;
      try {
        newVehicle = await addVehicle({ ...vehicleFields, status: 'intake' });
      } catch (err) {
        console.log('addVehicle error:', JSON.stringify(err, null, 2));
        setSaveError(`Vehicle insert failed: ${fmtErr(err)}`);
        return;
      }

      if (newVehicle?.id) {
        const errors = [];

        try {
          const dealRes = await supabase.from('deal_records').insert({
            vehicle_id: newVehicle.id,
            org_id: orgId,
            seller_name: seller_name || null,
            buyer_rep: buyer_rep || null,
            purchase_amount: purchase_amount ? parseFloat(purchase_amount) : null,
            lienholder: lienholder || null,
            payoff_amount: lienholder && payoff_amount ? parseFloat(payoff_amount) : null,
            cashiers_check: cashiers_check || false,
            title_electronic: title_electronic || false,
            pickup_address: pickup_address || null,
            pickup_scheduled_at: pickup_scheduled_at || null,
            driver_id: driver_id || null,
            source_id: source_id || null,
          });
          if (dealRes.error) {
            console.log('Deal record insert error:', JSON.stringify(dealRes.error, null, 2));
            errors.push(`Deal record: ${fmtErr(dealRes.error)}`);
          }
        } catch (err) {
          console.log('Deal record insert threw:', JSON.stringify(err, null, 2));
          errors.push(`Deal record: ${fmtErr(err)}`);
        }

        if (vehicleFields.mileage) {
          try {
            const mileageRes = await supabase.from('mileage_log').insert({
              vehicle_id: newVehicle.id,
              org_id: orgId,
              vin6: (vehicleFields.vin || '').slice(-6),
              reading: parseInt(vehicleFields.mileage),
              reason: 'intake',
            });
            if (mileageRes.error) {
              console.log('Mileage log insert error:', JSON.stringify(mileageRes.error, null, 2));
              errors.push(`Mileage log: ${fmtErr(mileageRes.error)}`);
            }
          } catch (err) {
            console.log('Mileage log insert threw:', JSON.stringify(err, null, 2));
            errors.push(`Mileage log: ${fmtErr(err)}`);
          }
        }

        if (errors.length > 0) {
          setSaveError(errors.join(' | '));
          return; // keep form open so user can see the error
        }
      }
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleBulkImport = (vehicles) => {
    vehicles.forEach(v => addVehicle(v));
  };

  const handleList = async (v) => {
    if (window.confirm(`List ${v.year} ${v.make} ${v.model} in the active auction?`)) {
      try { await listVehicle(v.id); }
      catch (err) { alert('Failed to list vehicle: ' + (err.message || JSON.stringify(err))); }
    }
  };

  const handleStatusChange = async (v, status) => {
    try { await updateVehicle(v.id, { status }); }
    catch (err) { console.log('updateVehicle (status) error:', JSON.stringify(err, null, 2)); }
  };

  const statusCounts = {};
  allVehicles.forEach(v => { statusCounts[v.status] = (statusCounts[v.status] || 0) + 1; });

  const handlePrintBuySheet = async (v) => {
    const orgId = user?.org_id || 'bf236d2b-4693-4606-bf3d-ece1767690ab';
    const { data: deal } = await supabase
      .from('deal_records')
      .select('*')
      .eq('vehicle_id', v.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const mileage = mileageMap[v.id];
    const equity = deal?.purchase_amount && deal?.payoff_amount
      ? parseFloat(deal.purchase_amount) - parseFloat(deal.payoff_amount)
      : null;

    const fmt$ = (n) => n != null ? `$${parseFloat(n).toLocaleString()}` : '—';
    const fmtBool = (b) => b === true ? 'Yes' : b === false ? 'No' : '—';

    const html = `<!DOCTYPE html>
<html>
<head>
<title>Buy Sheet – ${v.year || ''} ${v.make || ''} ${v.model || ''}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 40px; }
  .header { text-align: center; border-bottom: 2px solid #1a3d76; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #1a3d76; letter-spacing: .05em; }
  .header .sub { font-size: 12px; color: #666; margin-top: 4px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #1a3d76; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .field { display: flex; flex-direction: column; }
  .field .lbl { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 2px; }
  .field .val { font-weight: 600; font-size: 13px; }
  .vin { font-family: monospace; font-size: 15px; font-weight: 700; letter-spacing: .08em; }
  .footer { margin-top: 32px; font-size: 11px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="header">
  <h1>BUY SHEET</h1>
  <div class="sub">Tri-State LLC &nbsp;·&nbsp; Printed ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
</div>

<div class="section">
  <div class="section-title">Vehicle</div>
  <div class="grid">
    <div class="field" style="grid-column:1/-1"><div class="lbl">VIN</div><div class="val vin">${v.vin || '—'}</div></div>
    <div class="field"><div class="lbl">Year</div><div class="val">${v.year || '—'}</div></div>
    <div class="field"><div class="lbl">Make</div><div class="val">${v.make || '—'}</div></div>
    <div class="field"><div class="lbl">Model</div><div class="val">${v.model || '—'}</div></div>
    <div class="field"><div class="lbl">Trim</div><div class="val">${v.trim || '—'}</div></div>
    <div class="field"><div class="lbl">Color</div><div class="val">${v.color || '—'}</div></div>
    <div class="field"><div class="lbl">Mileage</div><div class="val">${mileage != null ? parseInt(mileage).toLocaleString() + ' mi' : '—'}</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Deal</div>
  <div class="grid">
    <div class="field"><div class="lbl">Seller</div><div class="val">${deal?.seller_name || '—'}</div></div>
    <div class="field"><div class="lbl">Buyer Rep</div><div class="val">${deal?.buyer_rep || '—'}</div></div>
    <div class="field"><div class="lbl">Purchase Price</div><div class="val">${fmt$(v.purchasePrice || deal?.purchase_amount)}</div></div>
    <div class="field"><div class="lbl">Lienholder</div><div class="val">${deal?.lienholder || '—'}</div></div>
    <div class="field"><div class="lbl">Payoff Amount</div><div class="val">${fmt$(deal?.payoff_amount)}</div></div>
    <div class="field"><div class="lbl">Equity</div><div class="val">${equity != null ? fmt$(equity) : '—'}</div></div>
    <div class="field"><div class="lbl">Cashier's Check</div><div class="val">${fmtBool(deal?.cashiers_check)}</div></div>
    <div class="field"><div class="lbl">Electronic Title</div><div class="val">${fmtBool(deal?.title_electronic)}</div></div>
    <div class="field" style="grid-column:1/-1"><div class="lbl">Pickup Address</div><div class="val">${deal?.pickup_address || '—'}</div></div>
    <div class="field"><div class="lbl">Pickup Date</div><div class="val">${deal?.pickup_scheduled_at ? new Date(deal.pickup_scheduled_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</div></div>
  </div>
</div>

<div class="footer">
  <span>Tri-State LLC — Internal Use Only</span>
  <span>Printed ${new Date().toLocaleDateString()}</span>
</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=820,height=1000');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Acquisitions {isReadOnly ? '(GM View)' : ''}</h1>
          <p>All inventory — every vehicle TRI-STATE owns, at every stage. Cost data visible to TRI-STATE and GM only.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1.5px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            {[['grid','⊞'],['list','☰']].map(([mode, icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 14,
                background: viewMode === mode ? '#0d2550' : '#fff',
                color: viewMode === mode ? '#fff' : '#6b7280',
                borderRight: mode === 'grid' ? '1px solid #e5e7eb' : 'none',
              }}>{icon}</button>
            ))}
          </div>
          {!isReadOnly && (
            <button className="btn-navy" onClick={() => { setEditing(null); setSaveError(null); setShowForm(true); }}>
              + Add vehicle
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABELS).map(([key, { label, color, bg }]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            style={{
              padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', border: '1.5px solid',
              borderColor: statusFilter === key ? color : '#e5e7eb',
              background: statusFilter === key ? bg : '#fff',
              color: statusFilter === key ? color : '#6b7280',
              transition: 'all 0.12s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 14 }}>{statusCounts[key] || 0}</span>
            {label}
          </button>
        ))}
        {statusFilter !== 'all' && (
          <button onClick={() => setStatusFilter('all')} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1.5px solid #e5e7eb', background: '#fff', color: '#9ca3af' }}>
            × Clear
          </button>
        )}
      </div>

      {/* Vehicle count */}
      <div style={{ padding: '0 0 12px 0' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>{filtered.length} vehicles</span>
      </div>

      {/* Grid / List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
          <p>No vehicles yet</p>
          {!isReadOnly && <span>Click "Add vehicle" to intake your first car</span>}
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(v => {
            const st = STATUS_LABELS[v.status] || STATUS_LABELS.intake;
            const margin = v.floorPrice && v.totalCost ? (parseFloat(v.floorPrice) - parseFloat(v.totalCost)) : null;
            const iconBtn = { background: '#F8F9FA', border: '1px solid #e5e7eb', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 };
            return (
              <VehicleCard
                key={v.id}
                vehicle={v}
                showAge
                mileage={mileageMap[v.id] ?? null}
                badge={
                  <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {st.label}
                  </span>
                }
                pricePill={
                  v.totalCost
                    ? <div style={{ background: 'rgba(255,255,255,0.93)', color: '#374151', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.14)' }}>
                        ${parseFloat(v.totalCost).toLocaleString()} cost
                      </div>
                    : null
                }
                actionButton={
                  !isReadOnly ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {v.status === 'ready' && data.auction.isOpen && (
                        <button onClick={() => handleList(v)} style={{ flex: 1, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>List now</button>
                      )}
                      {v.status === 'in_auction' && (
                        <button onClick={() => unlistVehicle(v.id)} style={{ flex: 1, background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                      )}
                      <button onClick={() => { setEditing(v); setSaveError(null); setShowForm(true); }} style={iconBtn} title="Edit">✏️</button>
                      <button onClick={() => handlePrintBuySheet(v)} style={iconBtn} title="Print">🧾</button>
                      <button onClick={() => setConfirmDelete(v)} style={{ ...iconBtn, background: '#FEF2F2', border: '1px solid #FECACA' }} title="Delete">🗑️</button>
                    </div>
                  ) : null
                }
              >
                {/* Compact financials */}
                {(v.purchasePrice || v.floorPrice) && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    {v.purchasePrice && <span>Buy: <strong style={{ color: '#374151' }}>${parseFloat(v.purchasePrice).toLocaleString()}</strong></span>}
                    {v.floorPrice && <span>Floor: <strong style={{ color: '#374151' }}>${parseFloat(v.floorPrice).toLocaleString()}</strong></span>}
                    {margin !== null && <span style={{ color: margin >= 0 ? '#065f46' : '#991b1b' }}>Margin: <strong>${margin.toLocaleString()}</strong></span>}
                  </div>
                )}
                {v.notes && (
                  <div style={{ fontSize: 11, color: '#6b7280', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '5px 8px', lineHeight: 1.4 }}>
                    {v.notes}
                  </div>
                )}
                {v.arbitration?.status === 'open' && (
                  <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚠ Arbitration filed</span>
                    {!isReadOnly && <button onClick={() => setResolveModal(v)} style={{ background: '#991b1b', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>Resolve</button>}
                  </div>
                )}
                {v.arbitration?.status === 'resolved' && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: '#065f46' }}>✓ Arbitration resolved</div>
                )}
              </VehicleCard>
            );
          })}
        </div>
      ) : (
        // List mode
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(v => {
            const st = STATUS_LABELS[v.status] || STATUS_LABELS.intake;
            const margin = v.floorPrice && v.totalCost ? (parseFloat(v.floorPrice) - parseFloat(v.totalCost)) : null;
            return (
              <VehicleCard
                key={v.id}
                variant="list"
                showAge
                vehicle={v}
                mileage={mileageMap[v.id] ?? null}
                badge={
                  <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {st.label}
                  </span>
                }
                pricePill={null}
              >
                {/* Operational strip */}
                <div style={{ padding: '12px 16px 14px', borderTop: '1px solid #f3f4f6', background: '#f9fafb', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

                  {/* Financials */}
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Financials</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {v.purchasePrice && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Purchase</span><span style={{ fontSize: 12, fontWeight: 700 }}>${parseFloat(v.purchasePrice).toLocaleString()}</span></div>}
                      {v.totalCost && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Total cost</span><span style={{ fontSize: 12, fontWeight: 700, color: '#0d2550' }}>${parseFloat(v.totalCost).toLocaleString()}</span></div>}
                      {v.floorPrice && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Floor</span><span style={{ fontSize: 12, fontWeight: 700 }}>${parseFloat(v.floorPrice).toLocaleString()}</span></div>}
                      {margin !== null && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderTop: '1px solid #e5e7eb', paddingTop: 4 }}><span style={{ fontSize: 11, color: '#9ca3af' }}>Margin</span><span style={{ fontSize: 12, fontWeight: 700, color: margin >= 0 ? '#065f46' : '#991b1b' }}>${margin.toLocaleString()}</span></div>}
                    </div>
                  </div>

                  {/* Stage */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Stage</div>
                    {!isReadOnly
                      ? <VehicleStatusDropdown vehicle={v} onChange={async (val) => { try { await updateVehicle(v.id, { status: val }); } catch (err) { console.log('updateVehicle (status dropdown) error:', JSON.stringify(err, null, 2)); } }} />
                      : <span style={{ background: st.bg, color: st.color, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>{st.label}</span>
                    }
                  </div>

                  {/* Title */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Title</div>
                    {!isReadOnly
                      ? <TitleStatusDropdown vehicleId={v.id} current={v.titleStatus || 'pending'} onChange={async (val) => { try { await updateVehicle(v.id, { titleStatus: val }); } catch (err) { console.log('updateVehicle (title) error:', JSON.stringify(err, null, 2)); } }} />
                      : <TitleStatusBadge value={v.titleStatus || 'pending'} />
                    }
                    {v.titleNotes && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{v.titleNotes}</div>}
                  </div>

                  {/* Location */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Location</div>
                    {!isReadOnly ? (
                      <select
                        value={v.currentLocation || ''}
                        onChange={async e => { try { await updateVehicle(v.id, { currentLocation: e.target.value }); } catch (err) { console.log('updateVehicle (location) error:', JSON.stringify(err, null, 2)); } }}
                        style={{ fontSize: 13, padding: '8px 12px', border: '2px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', minWidth: 150 }}
                      >
                        <option value="">Select location…</option>
                        {locationOptions.map(l => <option key={l.value} value={l.label}>{l.label}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 13, color: '#374151' }}>{v.currentLocation || '—'}</span>
                    )}
                    {v.vendorNotes && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{v.vendorNotes}</div>}
                  </div>

                  {/* Actions */}
                  {!isReadOnly && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      {v.status === 'ready' && data.auction.isOpen && (
                        <button onClick={() => handleList(v)} style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>List now</button>
                      )}
                      {v.status === 'in_auction' && (
                        <button onClick={() => unlistVehicle(v.id)} style={{ background: '#fef3c7', color: '#92400e', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                      )}
                      <button onClick={() => { setEditing(v); setSaveError(null); setShowForm(true); }} title="Edit" style={{ background: '#F8F9FA', border: '1px solid #e5e7eb', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                      <button onClick={() => handlePrintBuySheet(v)} title="Print" style={{ background: '#F8F9FA', border: '1px solid #e5e7eb', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 }}>🧾</button>
                      <button onClick={() => setConfirmDelete(v)} title="Delete" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                    </div>
                  )}
                </div>

                {/* Notes / arbitration */}
                {(v.notes || v.arbitration?.status === 'open' || v.arbitration?.status === 'resolved') && (
                  <div style={{ padding: '0 16px 12px' }}>
                    {v.notes && (
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#374151', marginBottom: (v.arbitration?.status) ? 8 : 0 }}>
                        <strong>Notes:</strong> {v.notes}
                      </div>
                    )}
                    {v.arbitration?.status === 'open' && (
                      <div style={{ background: '#fee2e2', border: '2px solid #fca5a5', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 13, marginBottom: 2 }}>⚠ Arbitration filed by {v.arbitration.storeName}</div>
                          <div style={{ fontSize: 12, color: '#7f1d1d' }}>{v.arbitration.issueType}{v.arbitration.details ? ` — ${v.arbitration.details}` : ''}</div>
                          <div style={{ fontSize: 10, color: '#991b1b', marginTop: 4, opacity: 0.7 }}>Filed {new Date(v.arbitration.filedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                        {!isReadOnly && (
                          <button onClick={() => setResolveModal(v)} style={{ background: '#991b1b', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Resolve</button>
                        )}
                      </div>
                    )}
                    {v.arbitration?.status === 'resolved' && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#065f46' }}>
                        ✓ Arbitration resolved — {v.arbitration.resolution}
                      </div>
                    )}
                  </div>
                )}
              </VehicleCard>
            );
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h2>{editing ? 'Edit vehicle' : 'Add vehicle to acquisitions'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              {saveError && (
                <div className="alert alert-error" style={{ marginBottom: 16, wordBreak: 'break-word' }}>
                  <strong>Save failed:</strong> {saveError}
                </div>
              )}
              <VehicleForm
                initial={editing}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditing(null); setSaveError(null); }}
                sources={sourceOptions}
                locations={locationOptions}
              />
            </div>
          </div>
        </div>
      )}

      {/* Resolve arbitration modal */}
      {resolveModal && (
        <div className="modal-overlay" onClick={() => setResolveModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>Resolve arbitration</h2>
              <button onClick={() => setResolveModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16, fontSize: 14, color: '#374151' }}>
                <strong>{resolveModal.year} {resolveModal.make} {resolveModal.model}</strong> — {resolveModal.arbitration?.issueType}
              </div>
              <div className="form-group">
                <label>Resolution notes</label>
                <textarea
                  id="resolution-notes"
                  rows={4}
                  placeholder="How was this resolved? (e.g. agreed to $500 allowance, vehicle returned, no action taken...)"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setResolveModal(null)}>Cancel</button>
              <button className="btn-navy" onClick={() => {
                const notes = document.getElementById('resolution-notes').value;
                resolveArbitration(resolveModal.id, notes || 'Resolved by TRI-STATE');
                setResolveModal(null);
              }}>Mark resolved</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <ExcelUploadModal
          onClose={() => setShowUpload(false)}
          onImport={(vehicles) => { handleBulkImport(vehicles); }}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🗑</div>
              <h2 style={{ fontSize: 17, marginBottom: 8 }}>Remove vehicle?</h2>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: confirmDelete.status === 'awarded' ? 8 : 24 }}>
                {confirmDelete.year} {confirmDelete.make} {confirmDelete.model} will be permanently removed.
              </p>
              {confirmDelete.status === 'awarded' && (
                <div className="alert alert-warning" style={{ marginBottom: 16, textAlign: 'left' }}>
                  ⚠ This vehicle is <strong>awarded to {confirmDelete.winnerName}</strong>. Deleting it will also remove the transport record. Only do this to correct a data entry error.
                </div>
              )}
              {confirmDelete.status === 'active' && (
                <div className="alert alert-warning" style={{ marginBottom: 16, textAlign: 'left' }}>
                  ⚠ This vehicle is <strong>live in the auction</strong>. Deleting it will remove all bids placed on it.
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="btn-danger" onClick={() => { deleteVehicle(confirmDelete.id); setConfirmDelete(null); }}>Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
