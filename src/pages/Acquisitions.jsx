import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const SOURCES = ['KBB', 'VETTX', 'LBO', 'AutoHub', 'eBlock', 'ADESA', 'Private', 'Trade-in', 'Dealer trade', 'Off-lease', 'Other'];
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

const LOCATIONS = ['Arbor Plaza', 'In Transit', 'Mechanic'];

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
  const isLocked = ['active', 'awarded', 'no_sale'].includes(vehicle.status);
  if (isLocked) {
    const lockedMap = {
      active: { label: 'Live in Auction', bg: '#dbeafe', color: '#1e40af' },
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

      // Find header row (row with "VIN" in it)
      let headerRowIdx = raw.findIndex(r => r.some(c => String(c).toLowerCase() === 'vin'));
      if (headerRowIdx === -1) { setError('Could not find header row. Make sure your file uses the MAG template.'); return; }

      const headers = raw[headerRowIdx].map(h => String(h).toLowerCase().trim());
      const dataRows = raw.slice(headerRowIdx + 2); // skip hint row

      const parsed = dataRows
        .filter(row => row.some(c => c !== ''))
        .map(row => {
          const obj = {};
          headers.forEach((h, i) => {
            const key = FIELD_MAP[h];
            if (key) obj[key] = String(row[i] || '').trim();
          });
          // Calculate total cost
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

function VehicleForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    vin: '', year: '', make: '', model: '', trim: '', mileage: '', color: '',
    source: 'Trade-in', purchasePrice: '', condition: 'Good', notes: '',
    overheadCosts: '', reconItems: [], reconNotes: '', floorPrice: '', photos: [],
    titleStatus: 'pending', titleNotes: '', currentLocation: 'Arbor Plaza', vendorNotes: '',
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
    files.forEach(file => {
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
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          setForm(f => ({ ...f, photos: [...(f.photos || []), compressed] }));
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
    onSave({ ...form, reconCosts, totalCost: totalCost() });
  };

  const toggleRecon = (item) => {
    const items = form.reconItems || [];
    set('reconItems', items.includes(item) ? items.filter(i => i !== item) : [...items, item]);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label>VIN</label>
          <input type="text" value={form.vin} onChange={e => set('vin', e.target.value.toUpperCase())} placeholder="1FTFW1E53MFA00000" maxLength={17} />
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
          <select value={form.source} onChange={e => set('source', e.target.value)}>
            {SOURCES.map(s => <option key={s}>{s}</option>)}
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
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: `1px solid ${active ? '#1a3d76' : '#e5e7eb'}`,
                  background: active ? '#1a3d76' : '#fff',
                  color: active ? '#fff' : '#374151',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
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

      {/* Title status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
      </div>

      {/* Location & vendor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Current location</label>
          <select value={form.currentLocation || 'Arbor Plaza'} onChange={e => set('currentLocation', e.target.value)}>
            {LOCATIONS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Vendor / work notes</label>
          <input type="text" value={form.vendorNotes || ''} onChange={e => set('vendorNotes', e.target.value)} placeholder="e.g. Arbor Auto — brakes, ETA Friday" />
        </div>
      </div>

      {/* Photos */}
      <div className="form-group">
        <label>Photos</label>
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
                >
                  ×
                </button>
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
  active: { label: 'Live in Auction', color: '#1e40af', bg: '#dbeafe' },
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

  if (user.role !== 'wholesale' && user.role !== 'gm' && user.role !== 'admin') {
    return <Navigate to="/auction" replace />;
  }

  const isReadOnly = user.role === 'gm';

  const allVehicles = data.vehicles;
  const filtered = statusFilter === 'all' ? allVehicles : allVehicles.filter(v => v.status === statusFilter);

  const handleSave = (vehicle) => {
    if (editing) {
      updateVehicle(editing.id, { ...vehicle, status: editing.status });
    } else {
      addVehicle({ ...vehicle, status: 'intake' });
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleBulkImport = (vehicles) => {
    vehicles.forEach(v => addVehicle(v));
  };

  const handleList = (v) => {
    if (window.confirm(`List ${v.year} ${v.make} ${v.model} in the active auction?`)) {
      listVehicle(v.id);
    }
  };

  const handleStatusChange = (v, status) => {
    updateVehicle(v.id, { status });
  };

  const statusCounts = {};
  allVehicles.forEach(v => { statusCounts[v.status] = (statusCounts[v.status] || 0) + 1; });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Acquisitions {isReadOnly ? '(GM View)' : ''}</h1>
          <p>All inventory — every vehicle TRI-STATE owns, at every stage. Cost data visible to TRI-STATE and GM only.</p>
        </div>
        {!isReadOnly && (
          <button className="btn-navy" onClick={() => { setEditing(null); setShowForm(true); }}>
            + Add vehicle
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {Object.entries(STATUS_LABELS).map(([key, { label, color, bg }]) => (
          <div key={key} className="stat-card" style={{ cursor: 'pointer', border: statusFilter === key ? '2px solid #1a3d76' : '1px solid #e5e7eb' }} onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}>
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ fontSize: 22, color: '#111827' }}>{statusCounts[key] || 0}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{filtered.length} vehicles</span>
          {statusFilter !== 'all' && (
            <button onClick={() => setStatusFilter('all')} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
              Clear filter
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
            <p>No vehicles yet</p>
            {!isReadOnly && <span>Click "Add vehicle" to intake your first car</span>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map(v => {
              const st = STATUS_LABELS[v.status] || STATUS_LABELS.intake;
              const margin = v.floorPrice && v.totalCost ? (parseFloat(v.floorPrice) - parseFloat(v.totalCost)) : null;
              return (
                <div key={v.id} style={{ borderBottom: '2px solid #e5e7eb', padding: '20px 24px' }}>

                  {/* Row 1: vehicle info + actions */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      {/* Thumbnail */}
                      <div style={{ width: 90, height: 66, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#f0f4f8', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {v.photos && v.photos[0]
                          ? <img src={v.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 28 }}>🚗</span>
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>
                          {v.year} {v.make} {v.model}{v.trim ? ` · ${v.trim}` : ''}
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: '#6b7280' }}>{v.color}</span>
                          {v.mileage && <span style={{ fontSize: 13, color: '#6b7280' }}>· {parseInt(v.mileage).toLocaleString()} mi</span>}
                          {v.source && <span style={{ fontSize: 13, color: '#9ca3af' }}>· {v.source}</span>}
                          {v.vin && <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#e8eef5', color: '#1a3d76', padding: '2px 10px', borderRadius: 6 }}>{v.vin}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      {!isReadOnly && v.status === 'ready' && data.auction.isOpen && (
                        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 14 }} onClick={() => handleList(v)}>List now</button>
                      )}
                      {!isReadOnly && ['intake','recon','ready','active'].includes(v.status) && (
                        <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 14 }} onClick={() => { setEditing(v); setShowForm(true); }}>Edit</button>
                      )}
                      {!isReadOnly && v.status === 'active' && (
                        <button onClick={() => unlistVehicle(v.id)} style={{ background: '#fef3c7', color: '#92400e', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>Remove from auction</button>
                      )}
                      {!isReadOnly && ['intake','recon','ready'].includes(v.status) && (
                        <button onClick={() => setConfirmDelete(v)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '8px 12px', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontWeight: 700 }}>✕</button>
                      )}
                    </div>
                  </div>

                  {/* Row 2: all controls side by side */}
                  <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>

                    {/* Financials */}
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Financials</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 14 }}>
                          <span style={{ color: '#6b7280' }}>Purchase</span>
                          <span style={{ fontWeight: 600 }}>{v.purchasePrice ? `$${parseFloat(v.purchasePrice).toLocaleString()}` : '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 14 }}>
                          <span style={{ color: '#6b7280' }}>Total cost</span>
                          <span style={{ fontWeight: 700, color: '#1a3d76' }}>{v.totalCost ? `$${parseFloat(v.totalCost).toLocaleString()}` : '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 14 }}>
                          <span style={{ color: '#6b7280' }}>Floor</span>
                          <span style={{ fontWeight: 600 }}>{v.floorPrice ? `$${parseFloat(v.floorPrice).toLocaleString()}` : '—'}</span>
                        </div>
                        {margin !== null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 14, borderTop: '1px solid #f3f4f6', paddingTop: 5, marginTop: 2 }}>
                            <span style={{ color: '#6b7280' }}>Margin</span>
                            <span style={{ fontWeight: 700, color: margin >= 0 ? '#065f46' : '#991b1b' }}>${margin.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stage */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Stage</div>
                      {!isReadOnly
                        ? <VehicleStatusDropdown vehicle={v} onChange={(val) => updateVehicle(v.id, { status: val })} />
                        : <span style={{ background: st.bg, color: st.color, padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 700 }}>{st.label}</span>
                      }
                    </div>

                    {/* Title */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Title</div>
                      {!isReadOnly
                        ? <TitleStatusDropdown vehicleId={v.id} current={v.titleStatus || 'pending'} onChange={(val) => updateVehicle(v.id, { titleStatus: val })} />
                        : <TitleStatusBadge value={v.titleStatus || 'pending'} />
                      }
                      {v.titleNotes && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{v.titleNotes}</div>}
                    </div>

                    {/* Location */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Location</div>
                      {!isReadOnly ? (
                        <select
                          value={v.currentLocation || 'Arbor Plaza'}
                          onChange={e => updateVehicle(v.id, { currentLocation: e.target.value })}
                          style={{ fontSize: 14, padding: '8px 12px', border: '2px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', minWidth: 160 }}
                        >
                          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                        </select>
                      ) : (
                        <span style={{ fontSize: 14, color: '#374151' }}>{v.currentLocation || '—'}</span>
                      )}
                      {v.vendorNotes && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{v.vendorNotes}</div>}
                    </div>

                  </div>

                  {/* Row 3: notes if any */}
                  {v.notes && (
                    <div style={{ marginTop: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#374151' }}>
                      <strong>Notes:</strong> {v.notes}
                    </div>
                  )}

                  {/* Row 4: arbitration alert */}
                  {v.arbitration?.status === 'open' && (
                    <div style={{ marginTop: 14, background: '#fee2e2', border: '2px solid #fca5a5', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 14, marginBottom: 4 }}>⚠ Arbitration filed by {v.arbitration.storeName}</div>
                        <div style={{ fontSize: 13, color: '#7f1d1d', marginBottom: 2 }}><strong>Issue:</strong> {v.arbitration.issueType}</div>
                        {v.arbitration.details && <div style={{ fontSize: 13, color: '#7f1d1d' }}><strong>Details:</strong> {v.arbitration.details}</div>}
                        <div style={{ fontSize: 11, color: '#991b1b', marginTop: 6, opacity: 0.7 }}>Filed {new Date(v.arbitration.filedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                      {!isReadOnly && (
                        <button onClick={() => setResolveModal(v)} style={{ background: '#991b1b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                          Resolve
                        </button>
                      )}
                    </div>
                  )}
                  {v.arbitration?.status === 'resolved' && (
                    <div style={{ marginTop: 14, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#065f46' }}>
                      ✓ Arbitration resolved — {v.arbitration.resolution}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h2>{editing ? 'Edit vehicle' : 'Add vehicle to acquisitions'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <VehicleForm
                initial={editing}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditing(null); }}
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
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
                {confirmDelete.year} {confirmDelete.make} {confirmDelete.model} will be permanently removed.
              </p>
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
