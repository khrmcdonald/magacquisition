import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { supabase, uploadVehiclePhoto } from '../lib/supabase';
import { VehicleCard } from '../components/VehicleCard';
import RepairOrdersModal from '../components/RepairOrdersModal';
import ArbitrationResolveModal from '../components/ArbitrationResolveModal';
import VehicleDetailModal from '../components/VehicleDetailModal';
import { useToast } from '../components/Toast';

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];


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


const TITLE_CUSTODY_STEPS = [
  { key: 'pending',         label: 'Pending',         short: 'Pending'  },
  { key: 'awaiting_pickup', label: 'Awaiting Pickup', short: 'Awaiting' },
  { key: 'in_hand',         label: 'In Hand',         short: 'In Hand'  },
  { key: 'sent',            label: 'Sent to Store',   short: 'Sent'     },
  { key: 'delivered',       label: 'Delivered',       short: 'Done'     },
];

function TitleCustodyTracker({ vehicle, onUpdate, canUpdate }) {
  const tracker = vehicle.title_tracker || { status: 'pending', steps: {} };
  const stepKeys = TITLE_CUSTODY_STEPS.map(s => s.key);
  const currentIdx = Math.max(0, stepKeys.indexOf(tracker.status));
  const nextStep = currentIdx < TITLE_CUSTODY_STEPS.length - 1 ? TITLE_CUSTODY_STEPS[currentIdx + 1] : null;

  const setStep = (stepKey, idx) => {
    if (!canUpdate) return;
    const now = new Date().toISOString();
    const newSteps = { ...tracker.steps };
    for (let i = 0; i <= idx; i++) {
      if (!newSteps[TITLE_CUSTODY_STEPS[i].key]) newSteps[TITLE_CUSTODY_STEPS[i].key] = now;
    }
    onUpdate({ ...tracker, status: stepKey, steps: newSteps });
  };

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Title Custody</div>

      {/* Step circles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 5 }}>
        {TITLE_CUSTODY_STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          const date = tracker.steps?.[step.key];
          return (
            <React.Fragment key={step.key}>
              <div
                onClick={e => { e.stopPropagation(); setStep(step.key, i); }}
                title={step.label + (date ? ' · ' + new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')}
                style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: done ? '#0d2550' : '#f3f4f6',
                  border: active ? '2.5px solid #e8b84b' : done ? '2.5px solid #0d2550' : '2.5px solid #e5e7eb',
                  cursor: canUpdate ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: done ? '#fff' : '#9ca3af',
                  transition: 'transform 0.12s',
                }}
                onMouseEnter={e => { if (canUpdate) e.currentTarget.style.transform = 'scale(1.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
              >
                {i < currentIdx ? '✓' : i + 1}
              </div>
              {i < TITLE_CUSTODY_STEPS.length - 1 && (
                <div style={{ width: 10, height: 2, background: i < currentIdx ? '#0d2550' : '#e5e7eb', flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current label + date */}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{TITLE_CUSTODY_STEPS[currentIdx]?.label}</div>
      {tracker.steps?.[tracker.status] && (
        <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>
          {new Date(tracker.steps[tracker.status]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}

      {/* Advance button */}
      {canUpdate && nextStep && (
        <button
          onClick={e => { e.stopPropagation(); setStep(nextStep.key, currentIdx + 1); }}
          style={{ marginTop: 6, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          → {nextStep.short}
        </button>
      )}
      {!nextStep && (
        <div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: '#10b981' }}>✓ Complete</div>
      )}
    </div>
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
    'purchase date': 'datePurchased', 'date purchased': 'datePurchased',
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

      const VALID_CONDITIONS = ['excellent','good','fair','poor','needs_repair'];
      const VALID_TITLE_STATUSES = ['pending','received','clear','issue'];

      const parsed = dataRows
        .filter(row => row.some(c => c !== ''))
        .map(row => {
          const obj = {};
          headers.forEach((h, i) => {
            const key = FIELD_MAP[h];
            if (key) obj[key] = String(row[i] || '').trim();
          });
          // Normalize types
          if (obj.year) obj.year = parseInt(obj.year) || null;
          // Normalize condition to lowercase; strip if not a valid value
          if (obj.condition) {
            const c = obj.condition.toLowerCase().replace(/\s+/g, '_');
            obj.condition = VALID_CONDITIONS.includes(c) ? c : null;
          }
          // Default title status to pending if missing or unrecognized
          if (!obj.titleStatus || !VALID_TITLE_STATUSES.includes(obj.titleStatus.toLowerCase())) {
            obj.titleStatus = 'pending';
          } else {
            obj.titleStatus = obj.titleStatus.toLowerCase();
          }
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
        .filter(obj => obj.vin && obj.vin.length === 17 && obj.make && obj.model);

      const totalRows = dataRows.filter(row => row.some(c => c !== '')).length;
      const skipped = totalRows - parsed.length;
      if (parsed.length === 0) { setError('No valid vehicle rows found. VINs must be exactly 17 characters. Check that VIN, Make, and Model columns are filled in.'); return; }
      if (skipped > 0) setError(`${skipped} row${skipped > 1 ? 's' : ''} skipped — VIN missing or not 17 characters.`);
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
              <div className="alert alert-info" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span>Use the template for best results. VIN, Make, and Model are required.</span>
                <button
                  onClick={() => {
                    const XLSX = window.XLSX;
                    if (!XLSX) return;
                    const headers = ['VIN','Year','Make','Model','Trim','Mileage','Color','Condition','Source','Purchase Date','Purchase Price','Overhead Costs','Floor Price','Title Status','Title Notes','Notes'];
                    const sample = ['1HGBH41JXMN109186','2022','Honda','Accord','Sport','34000','Silver','Good','Private Seller','2024-06-15','18500','350','21000','pending','',''];
                    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
                    ws['!cols'] = headers.map(() => ({ wch: 16 }));
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Vehicles');
                    XLSX.writeFile(wb, 'MAG_Inventory_Template.xlsx');
                  }}
                  style={{ whiteSpace: 'nowrap', flexShrink: 0, padding: '6px 12px', borderRadius: 7, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  ⬇ Download Template
                </button>
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
function VehicleForm({ initial, onSave, onCancel, sources = [], locations = [], addLocation, pickupAddresses = [], addPickupAddress, buyers = [], vehicles = [], editingId = null, existingTransport = null }) {
  const [form, setForm] = useState(initial ? {
    ...initial,
    photos: Array.isArray(initial.photos) ? initial.photos : [],
    source_id: initial.sourceId || sources.find(s => s.label === initial.source)?.value || '',
    interior_color: initial.interior_color || '',
    engine: initial.engine || '',
    // deal fields default empty on edit
    seller_name: '', buyer_id: initial.buyer_id || '', purchase_amount: '',
    lienholder: '', payoff_amount: '', cashiers_check: false,
    title_electronic: false, pickup_address: '',
    needsTransport: false, transportScheduledAt: '',
    datePurchased: initial.datePurchased || '',
  } : {
    vin: '', year: '', make: '', model: '', trim: '', mileage: '', color: '',
    interior_color: '', engine: '',
    source_id: '', purchasePrice: '', condition: 'Good', notes: '',
    overheadCosts: '', floorPrice: '', photos: [],
    titleStatus: 'pending', currentLocation: '',
    datePurchased: '',
    // deal record fields
    seller_name: '', buyer_id: '', purchase_amount: '',
    lienholder: '', payoff_amount: '', cashiers_check: false,
    title_electronic: false, pickup_address: '',
    needsTransport: false, transportScheduledAt: '',
  });
  const [dupVehicle, setDupVehicle] = useState(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [addingLocation, setAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  const handleAddLocation = async () => {
    if (!newLocationName.trim() || !addLocation) return;
    setSavingLocation(true);
    try {
      const loc = await addLocation(newLocationName.trim());
      set('currentLocation', loc.id);
      setAddingLocation(false);
      setNewLocationName('');
    } catch (_) {}
    setSavingLocation(false);
  };

  const handleAddAddress = async () => {
    if (!newAddress.trim() || !addPickupAddress) return;
    setSavingAddress(true);
    try {
      const row = await addPickupAddress(newAddress.trim());
      set('pickup_address', row.address);
      setAddingAddress(false);
      setNewAddress('');
    } catch (_) {}
    setSavingAddress(false);
  };

  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const totalCost = () => {
    const purchase = parseFloat(form.purchasePrice) || 0;
    const overhead = parseFloat(form.overheadCosts) || 0;
    return purchase + overhead;
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
              showToast('Photo upload failed — saved locally as fallback.', 'info');
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
    onSave({ ...form, totalCost: totalCost(), source: sourceObj?.label || form.source || '' });
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
          <VinInput
            value={form.vin}
            onChange={v => {
              set('vin', v);
              if (v.length === 17) {
                const dup = vehicles.find(ex => ex.vin && ex.vin.toUpperCase() === v.toUpperCase() && ex.id !== editingId);
                setDupVehicle(dup || null);
              } else {
                setDupVehicle(null);
              }
            }}
          />
          {dupVehicle && (
            <div style={{ marginTop: 8, background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b' }}>
              <strong>Duplicate VIN</strong> — this VIN already exists in inventory:
              <span style={{ fontWeight: 700, marginLeft: 5 }}>{dupVehicle.year} {dupVehicle.make} {dupVehicle.model}</span>
              <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>({STATUS_LABELS[dupVehicle.status]?.label || dupVehicle.status})</span>
              <div style={{ fontSize: 12, marginTop: 3 }}>Update the VIN or locate the existing record before saving.</div>
            </div>
          )}
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
          <label>Engine</label>
          <input type="text" value={form.engine || ''} onChange={e => set('engine', e.target.value)} placeholder="5.7L V8" />
        </div>
        <div className="form-group">
          <label>Mileage</label>
          <input type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="42100" />
        </div>
        <div className="form-group">
          <label>Exterior color</label>
          <input type="text" value={form.color} onChange={e => set('color', e.target.value)} placeholder="White" />
        </div>
        <div className="form-group">
          <label>Interior color</label>
          <input type="text" value={form.interior_color || ''} onChange={e => set('interior_color', e.target.value)} placeholder="Black" />
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
        <div className="form-group">
          <label>Date purchased</label>
          <input type="date" value={form.datePurchased || ''} onChange={e => set('datePurchased', e.target.value)} />
        </div>
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

      {/* Location */}
      <div className="form-group">
        <label>Current location</label>
        {addingLocation ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              value={newLocationName}
              onChange={e => setNewLocationName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleAddLocation(); }
                if (e.key === 'Escape') { setAddingLocation(false); setNewLocationName(''); }
              }}
              placeholder="Location name…"
              style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
            />
            <button type="button" onClick={handleAddLocation} disabled={!newLocationName.trim() || savingLocation}
              style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {savingLocation ? '…' : 'Save'}
            </button>
            <button type="button" onClick={() => { setAddingLocation(false); setNewLocationName(''); }}
              style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#6b7280' }}>
              Cancel
            </button>
          </div>
        ) : (
          <select value={form.currentLocation || ''} onChange={e => {
            if (e.target.value === '__add_new__') { setAddingLocation(true); }
            else set('currentLocation', e.target.value);
          }}>
            <option value="">Select location…</option>
            {locations.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            <option value="__add_new__">+ New location…</option>
          </select>
        )}
      </div>

      {/* ── Deal Record Fields ─────────────────────────────────────────────── */}
      {sectionLabel('Deal Record')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Seller name</label>
          <input type="text" value={form.seller_name} onChange={e => set('seller_name', e.target.value)} placeholder="John Smith" />
        </div>
        <div className="form-group">
          <label>Buyer</label>
          <select value={form.buyer_id} onChange={e => set('buyer_id', e.target.value)}>
            <option value="">— Unassigned —</option>
            {buyers.map(b => (
              <option key={b.id} value={b.id}>
                {b.buyer_number ? `#${b.buyer_number} — ${b.name}` : b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Lienholder</label>
          <input type="text" value={form.lienholder} onChange={e => set('lienholder', e.target.value)} placeholder="Bank or lender name" />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Cashier's Check</div>
          <YesNoToggle value={form.cashiers_check} onChange={v => set('cashiers_check', v)} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Electronic Title</div>
          <YesNoToggle value={form.title_electronic} onChange={v => set('title_electronic', v)} />
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
      </div>

      {/* ── Transport ─────────────────────────────────────────────────────── */}
      {sectionLabel('Transport')}
      {existingTransport ? (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #6ee7b7', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#065f46' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Transport already scheduled</div>
          {existingTransport.scheduledDate && <div>Pickup: {new Date(existingTransport.scheduledDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</div>}
          {existingTransport.notes && <div>Address: {existingTransport.notes}</div>}
          <div style={{ marginTop: 4, color: '#047857' }}>Status: {existingTransport.status}</div>
        </div>
      ) : (
      <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Does this vehicle need transport to arrive?</div>
        <YesNoToggle value={form.needsTransport} onChange={v => set('needsTransport', v)} />
      </div>
      {form.needsTransport && (
        <>
        <div className="form-group">
          <label>Scheduled pickup date &amp; time</label>
          <input type="datetime-local" value={form.transportScheduledAt || ''} onChange={e => set('transportScheduledAt', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Pickup address</label>
          {addingAddress ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddAddress(); }
                  if (e.key === 'Escape') { setAddingAddress(false); setNewAddress(''); }
                }}
                placeholder="Full pickup address…"
                style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
              />
              <button type="button" onClick={handleAddAddress} disabled={!newAddress.trim() || savingAddress}
                style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {savingAddress ? '…' : 'Save'}
              </button>
              <button type="button" onClick={() => { setAddingAddress(false); setNewAddress(''); }}
                style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#6b7280' }}>
                Cancel
              </button>
            </div>
          ) : (
            <select value={form.pickup_address || ''} onChange={e => {
              if (e.target.value === '__add_new__') { setAddingAddress(true); }
              else set('pickup_address', e.target.value);
            }}>
              <option value="">Select address…</option>
              {pickupAddresses.map(a => <option key={a.id} value={a.address}>{a.address}</option>)}
              <option value="__add_new__">+ Add new address…</option>
            </select>
          )}
        </div>
        </>
      )}
      </>
      )}

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
        <button type="submit" className="btn-navy" disabled={!!dupVehicle} style={{ opacity: dupVehicle ? 0.4 : 1, cursor: dupVehicle ? 'not-allowed' : 'pointer' }}>Save vehicle</button>
      </div>
    </form>
  );
}

const STATUS_LABELS = {
  intake:      { label: 'Intake',      color: '#6b7280', bg: '#f3f4f6', accent: '#9ca3af' },
  inspection:  { label: 'Inspection',  color: '#92400e', bg: '#fef3c7', accent: '#f59e0b' },
  recon:       { label: 'In Recon',    color: '#92400e', bg: '#fef3c7', accent: '#e8b84b' },
  ready:      { label: 'Ready to List',   color: '#065f46', bg: '#d1fae5', accent: '#10b981' },
  in_auction: { label: 'Live in Auction', color: '#1e40af', bg: '#dbeafe', accent: '#3b82f6' },
  awarded:    { label: 'Awarded',         color: '#065f46', bg: '#d1fae5', accent: '#0d2550' },
  no_sale:    { label: 'No Sale',         color: '#991b1b', bg: '#fee2e2', accent: '#ef4444' },
  sold:       { label: 'Sold',            color: '#374151', bg: '#f3f4f6', accent: '#6b7280' },
};

// ── Inspection ────────────────────────────────────────────────────────────────
const INSPECTION_CATS = [
  { key: 'exterior',   label: 'Exterior / Body',      sub: 'Dents, scratches, rust, paint' },
  { key: 'glass',      label: 'Glass',                sub: 'Windshield, windows, mirrors' },
  { key: 'tires',      label: 'Tires & Wheels',       sub: 'Tread depth, sidewalls, rims' },
  { key: 'interior',   label: 'Interior',             sub: 'Seats, carpet, dash, headliner' },
  { key: 'mechanical', label: 'Mechanical',           sub: 'Engine, fluids, unusual sounds' },
  { key: 'lights',     label: 'Lights & Electronics', sub: 'All lights, A/C, heat, windows' },
];

function printInspectionChecklist(vehicle) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const w = window.open('', '_blank', 'width=820,height=750');
  w.document.write(`<!DOCTYPE html><html><head><title>PSI — ${vehicle.year} ${vehicle.make} ${vehicle.model}</title>
<style>
  *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;margin:22px 38px;font-size:13px;color:#111}
  h1{font-size:19px;margin:0 0 2px}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #0d2550;padding-bottom:10px;margin-bottom:13px}
  .org-sub{font-size:12px;color:#444}.vinfo{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #bbb;margin-bottom:13px}
  .vf{padding:6px 10px;border-right:1px solid #ddd}.vf:nth-child(3n){border-right:none}.vf:nth-child(n+4){border-top:1px solid #ddd}
  .vl{font-size:9px;font-weight:700;text-transform:uppercase;color:#666;letter-spacing:.04em;margin-bottom:1px}.vv{font-size:14px;font-weight:700;min-height:18px}
  table{width:100%;border-collapse:collapse;margin-bottom:13px;font-size:13px}th{background:#f3f4f6;font-size:10px;font-weight:700;text-transform:uppercase;padding:6px 10px;text-align:left;border:1px solid #ccc;letter-spacing:.04em}
  td{border:1px solid #ddd;padding:8px 10px;vertical-align:middle}.cat{font-weight:700}.csub{font-size:11px;color:#777;margin-top:1px}
  .chk{text-align:center;width:68px}.box{width:17px;height:17px;border:1.5px solid #555;display:inline-block}
  .nlbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#555;margin-bottom:4px}
  .narea{border:1px solid #ccc;min-height:50px;padding:8px;margin-bottom:13px}
  .res{display:flex;align-items:center;gap:26px;border:2px solid #0d2550;padding:9px 14px;margin-bottom:13px;border-radius:3px}
  .rslbl{font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#0d2550;min-width:90px}
  .rsopt{display:flex;align-items:center;gap:7px;font-size:13px}
  .sigs{display:flex;gap:28px;border-top:1px solid #ccc;padding-top:13px}
  .sig{flex:1}.sline{border-bottom:1px solid #888;margin-top:22px}.slbl{font-size:10px;color:#666;margin-top:3px}
  @media print{body{margin:10px 20px}}
</style></head><body>
<div class="hdr"><div><h1>${(JSON.parse(localStorage.getItem('orgSettings') || '{}')).dealerName || 'Tri-State Auto'}</h1><div class="org-sub">Post-Sale Vehicle Inspection Checklist</div></div><div style="text-align:right;font-size:11px;color:#666">PSI Form</div></div>
<div class="vinfo">
  <div class="vf"><div class="vl">Year / Make / Model</div><div class="vv">${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ' ' + vehicle.trim : ''}</div></div>
  <div class="vf"><div class="vl">VIN</div><div class="vv">${vehicle.vin || '&nbsp;'}</div></div>
  <div class="vf"><div class="vl">Mileage</div><div class="vv">${vehicle.mileage ? Number(vehicle.mileage).toLocaleString() + ' mi' : '&nbsp;'}</div></div>
  <div class="vf"><div class="vl">Color (Ext / Int)</div><div class="vv">${vehicle.color || ''}${vehicle.interior_color ? ' / ' + vehicle.interior_color : ''}</div></div>
  <div class="vf"><div class="vl">Acquisition Source</div><div class="vv">${vehicle.acquisitionSource || '&nbsp;'}</div></div>
  <div class="vf"><div class="vl">Inspection Date</div><div class="vv">${today}</div></div>
</div>
<table>
  <thead><tr><th style="width:38%">Category / Check</th><th class="chk">Good</th><th class="chk">Fair</th><th class="chk">Needs Work</th><th>Notes / Details</th></tr></thead>
  <tbody>${INSPECTION_CATS.map(c => `<tr><td><div class="cat">${c.label}</div><div class="csub">${c.sub}</div></td><td class="chk"><div class="box"></div></td><td class="chk"><div class="box"></div></td><td class="chk"><div class="box"></div></td><td></td></tr>`).join('')}</tbody>
</table>
<div class="nlbl">Overall Notes / Additional Findings</div>
<div class="narea"></div>
<div class="res">
  <div class="rslbl">Result:</div>
  <div class="rsopt"><div class="box"></div>&nbsp;Pass — No recon needed</div>
  <div class="rsopt"><div class="box"></div>&nbsp;Recon Required</div>
  <div class="rsopt"><div class="box"></div>&nbsp;Further Review Needed</div>
</div>
<div class="sigs">
  <div class="sig"><div class="sline"></div><div class="slbl">Inspector Name (Print)</div></div>
  <div class="sig"><div class="sline"></div><div class="slbl">Signature</div></div>
  <div class="sig"><div class="sline"></div><div class="slbl">Date</div></div>
</div>
<script>window.onload=function(){window.print();};</script>
</body></html>`);
  w.document.close();
}

function InspectionModal({ vehicle, inspectors, addInspector, onSave, onClose }) {
  const emptyItems = Object.fromEntries(INSPECTION_CATS.map(c => [c.key, { rating: '', notes: '' }]));
  const [items, setItems] = React.useState(emptyItems);
  const [overallNotes, setOverallNotes] = React.useState('');
  const [inspectorId, setInspectorId] = React.useState('');
  const [addingInspector, setAddingInspector] = React.useState(false);
  const [newInspectorName, setNewInspectorName] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState(null);

  const setRating = (key, rating) => setItems(prev => ({ ...prev, [key]: { ...prev[key], rating } }));
  const setNotes  = (key, notes)  => setItems(prev => ({ ...prev, [key]: { ...prev[key], notes } }));

  const hasNeedsWork = Object.values(items).some(i => i.rating === 'needs_work');
  const allRated = Object.values(items).every(i => i.rating !== '');

  const handleAddInspector = async () => {
    if (!newInspectorName.trim()) return;
    try {
      const row = await addInspector(newInspectorName.trim());
      setInspectorId(row.id);
      setAddingInspector(false);
      setNewInspectorName('');
    } catch (e) {
      setSaveError('Could not save inspector: ' + e.message);
    }
  };

  const handleSubmit = async (nextStatus) => {
    setSaving(true);
    setSaveError(null);
    const selectedInspector = inspectors.find(i => i.id === inspectorId);
    const insp = {
      status: 'complete',
      completed_by: selectedInspector?.name || '',
      inspector_id: inspectorId || null,
      completed_at: new Date().toISOString(),
      result: hasNeedsWork ? 'recon_needed' : 'pass',
      items,
      overall_notes: overallNotes,
    };
    try {
      await onSave(vehicle.id, insp, nextStatus);
      onClose();
    } catch (err) {
      setSaving(false);
      setSaveError(err.message || 'Save failed. Please try again.');
    }
  };

  const RATINGS = [
    { value: 'good',       label: 'Good',        color: '#065f46', bg: '#d1fae5' },
    { value: 'fair',       label: 'Fair',         color: '#92400e', bg: '#fef3c7' },
    { value: 'needs_work', label: 'Needs Work',   color: '#991b1b', bg: '#fee2e2' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h2>Post-Sale Inspection — {vehicle.year} {vehicle.make} {vehicle.model}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '0 24px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Inspector</label>
            {addingInspector ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  autoFocus
                  value={newInspectorName}
                  onChange={e => setNewInspectorName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddInspector(); if (e.key === 'Escape') { setAddingInspector(false); setNewInspectorName(''); } }}
                  placeholder="Inspector name…"
                  style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}
                />
                <button onClick={handleAddInspector} style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add</button>
                <button onClick={() => { setAddingInspector(false); setNewInspectorName(''); }} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
            ) : (
              <select
                value={inspectorId}
                onChange={e => { if (e.target.value === '__new__') { setAddingInspector(true); setInspectorId(''); } else setInspectorId(e.target.value); }}
                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff' }}
              >
                <option value="">— Select inspector —</option>
                {(inspectors || []).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                <option value="__new__">+ Add new inspector…</option>
              </select>
            )}
          </div>

          {INSPECTION_CATS.map(cat => (
            <div key={cat.key} style={{ marginBottom: 10, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: items[cat.key].rating ? 6 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{cat.label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{cat.sub}</div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {RATINGS.map(r => (
                    <button key={r.value} onClick={() => setRating(cat.key, r.value)} style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      border: items[cat.key].rating === r.value ? `2px solid ${r.color}` : '1.5px solid #e5e7eb',
                      background: items[cat.key].rating === r.value ? r.bg : '#fff',
                      color: items[cat.key].rating === r.value ? r.color : '#6b7280',
                    }}>{r.label}</button>
                  ))}
                </div>
              </div>
              {(items[cat.key].rating === 'needs_work' || items[cat.key].rating === 'fair') && (
                <input
                  value={items[cat.key].notes}
                  onChange={e => setNotes(cat.key, e.target.value)}
                  placeholder={items[cat.key].rating === 'needs_work' ? 'Describe the issue…' : 'Optional note…'}
                  style={{ width: '100%', padding: '6px 10px', border: `1px solid ${items[cat.key].rating === 'needs_work' ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 6, fontSize: 12, background: '#fff', marginTop: 2 }}
                />
              )}
            </div>
          ))}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Overall Notes</label>
            <textarea value={overallNotes} onChange={e => setOverallNotes(e.target.value)} rows={3} placeholder="Any additional findings…" style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, resize: 'vertical' }} />
          </div>

          {allRated && (
            <div style={{ background: hasNeedsWork ? '#fee2e2' : '#d1fae5', border: `1.5px solid ${hasNeedsWork ? '#fca5a5' : '#6ee7b7'}`, borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 13, fontWeight: 600, color: hasNeedsWork ? '#991b1b' : '#065f46' }}>
              {hasNeedsWork ? '⚠ Recon required — one or more items need attention' : '✓ Pass — vehicle looks good'}
            </div>
          )}

          {saveError && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#991b1b' }}>
              {saveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => handleSubmit('recon')} disabled={saving || !allRated} style={{ opacity: allRated ? 1 : 0.4, background: '#fffbeb', color: '#92400e', border: '1.5px solid #fcd34d', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Complete → Recon'}
            </button>
            <button onClick={() => handleSubmit('ready')} disabled={saving || !allRated} style={{ opacity: allRated ? 1 : 0.4, background: '#d1fae5', color: '#065f46', border: '1.5px solid #6ee7b7', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Complete → Ready'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Acquisitions() {
  const { user } = useAuth();
  const { data, addVehicle, updateVehicle, deleteVehicle, listVehicle, unlistVehicle, addLocation, addInspector, addRepairOrder, addPickupAddress, logMileage, addTransport } = useData();
  const buyers = (data.profiles || []).filter(p => p.buyer_number);
  const { showToast } = useToast();
  const [resolveModal, setResolveModal] = useState(null);
  const [repairModal, setRepairModal] = useState(null);
  const [inspectionModal, setInspectionModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewVehicle, setViewVehicle] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [myBuysOnly, setMyBuysOnly] = useState(false);
  const [buyerFilter, setBuyerFilter] = useState('');
  const [dateRange, setDateRange] = useState('all'); // 'all' | 'week' | 'month' | 'custom'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ageFilter, setAgeFilter] = useState('all'); // 'all' | '<30' | '30-60' | '60-90' | '90+'
  const [sourceFilter, setSourceFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [mileageMap, setMileageMap] = useState({});
  const [viewMode, setViewMode] = useState('grid');

  // ── Sell modal ───────────────────────────────────────────────────────────────
  const [sellModal, setSellModal] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState('');
  const [sellTo, setSellTo] = useState('');
  const [sellGross, setSellGross] = useState('');
  const [sellSaving, setSellSaving] = useState(false);

  // ── Add transport modal ──────────────────────────────────────────────────────
  const [addTransportModal, setAddTransportModal] = useState(null);
  const [tType, setTType] = useState('inbound');
  const [tStore, setTStore] = useState('');
  const [tDate, setTDate] = useState('');
  const [tNotes, setTNotes] = useState('');
  const [tSaving, setTSaving] = useState(false);

  // ── Detail panel ────────────────────────────────────────────────────────────
  const [panelVehicle, setPanelVehicle] = useState(null);
  const [panelDeal, setPanelDeal] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelPhotoIdx, setPanelPhotoIdx] = useState(0);

  const openPanel = async (v) => {
    setPanelVehicle(v);
    setPanelPhotoIdx(0);
    setPanelDeal(null);
    setPanelLoading(true);
    const { data: deal } = await supabase
      .from('deal_records').select('*').eq('vehicle_id', v.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    setPanelDeal(deal || null);
    setPanelLoading(false);
  };

  const closePanel = () => { setPanelVehicle(null); setPanelDeal(null); };

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const vehicleId = searchParams.get('v');
    if (!vehicleId || !data.vehicles.length) return;
    const target = data.vehicles.find(v => v.id === vehicleId);
    if (target) {
      openPanel(target);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, data.vehicles]);

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
  const pickupAddresses = data.pickupAddresses || [];

  const allVehicles = data.vehicles.filter(v => v.status !== 'sold');
  const filtered = allVehicles
    .filter(v => statusFilter === 'all' || v.status === statusFilter)
    .filter(v => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (v.make||'').toLowerCase().includes(q)
        || (v.model||'').toLowerCase().includes(q)
        || (v.vin||'').toLowerCase().includes(q)
        || (v.color||'').toLowerCase().includes(q)
        || (v.engine||'').toLowerCase().includes(q)
        || (String(v.year||'')).includes(q);
    })
    .filter(v => !myBuysOnly || v.buyer_id === user?.id)
    .filter(v => !buyerFilter || v.buyer_id === buyerFilter)
    .filter(v => !sourceFilter || v.sourceId === sourceFilter)
    .filter(v => {
      if (dateRange === 'all') return true;
      if (!v.datePurchased) return false;
      const d = new Date(v.datePurchased + 'T12:00:00');
      const now = new Date();
      if (dateRange === 'week') { const cut = new Date(now); cut.setDate(now.getDate() - 7); return d >= cut; }
      if (dateRange === 'month') { const cut = new Date(now); cut.setDate(now.getDate() - 30); return d >= cut; }
      if (dateRange === 'custom') {
        if (dateFrom && d < new Date(dateFrom + 'T00:00:00')) return false;
        if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      }
      return true;
    })
    .filter(v => {
      if (ageFilter === 'all') return true;
      const ref = v.datePurchased ? new Date(v.datePurchased + 'T12:00:00') : v.createdAt ? new Date(v.createdAt) : null;
      const days = ref ? Math.floor((Date.now() - ref) / 86400000) : 0;
      if (ageFilter === '<30')   return days < 30;
      if (ageFilter === '30-60') return days >= 30 && days < 60;
      if (ageFilter === '60-90') return days >= 60 && days < 90;
      if (ageFilter === '90+')   return days >= 90;
      return true;
    });

  const fmtErr = (e) => e?.message ?? e?.details ?? JSON.stringify(e);

  const handleSave = async (vehicleData) => {
    setSaveError(null);
    // Separate deal record fields from vehicle fields
    const {
      seller_name, buyer_id: formBuyerId, purchase_amount, lienholder, payoff_amount,
      cashiers_check, title_electronic, pickup_address, source_id,
      needsTransport, transportScheduledAt, vendorNotes,
      ...vehicleFields
    } = vehicleData;

    const orgId = user?.org_id || 'bf236d2b-4693-4606-bf3d-ece1767690ab';
    const selectedBuyer = buyers.find(b => b.id === formBuyerId);

    const saveFields = { ...vehicleFields };
    saveFields.buyer_id = formBuyerId || null;
    saveFields.buyer_name = formBuyerId ? (selectedBuyer?.name || null) : null;

    if (editing) {
      try { await updateVehicle(editing.id, { ...saveFields, source_id, status: editing.status }); }
      catch (err) { showToast(`Update failed: ${fmtErr(err)}`, 'error'); setSaveError(`Update failed: ${fmtErr(err)}`); return; }
      if (vehicleData.mileage) {
        try {
          await logMileage(editing.id, vehicleData.mileage, (vehicleData.vin || editing.vin || '').slice(-6), 'edit');
        } catch (_) {}
      }
    } else {
      let newVehicle;
      try {
        newVehicle = await addVehicle({ ...saveFields, source_id, status: 'intake' });
      } catch (err) {
        showToast(`Vehicle insert failed: ${fmtErr(err)}`, 'error');
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
            buyer_rep: selectedBuyer?.name || null,
            purchase_amount: purchase_amount ? parseFloat(purchase_amount) : null,
            lienholder: lienholder || null,
            payoff_amount: lienholder && payoff_amount ? parseFloat(payoff_amount) : null,
            cashiers_check: cashiers_check || false,
            title_electronic: title_electronic || false,
            pickup_address: pickup_address || null,
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
            await logMileage(newVehicle.id, vehicleFields.mileage, (vehicleFields.vin || '').slice(-6), 'intake');
          } catch (err) {
            errors.push(`Mileage log: ${fmtErr(err)}`);
          }
        }

        if (needsTransport) {
          try {
            const { error: tErr } = await supabase.from('transport').insert({
              id: crypto.randomUUID(),
              org_id: orgId,
              vehicle_id: newVehicle.id,
              vehicle_name: `${vehicleFields.year || ''} ${vehicleFields.make || ''} ${vehicleFields.model || ''}`.trim(),
              store_id: null,
              store_name: 'Intake',
              winning_bid: null,
              status: 'awarded',
              notes: pickup_address || null,
              scheduled_date: transportScheduledAt ? new Date(transportScheduledAt).toISOString() : null,
              steps: { awarded: new Date().toISOString() },
            });
            if (tErr) showToast(`Vehicle saved. Transport request failed: ${tErr.message}`, 'info');
          } catch (err) { showToast(`Vehicle saved. Transport request failed: ${err.message}`, 'info'); }
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

  const handleBulkImport = async (vehicles) => {
    const results = await Promise.allSettled(vehicles.map(v => addVehicle(v)));
    const failures = results
      .map((r, i) => r.status === 'rejected' ? `${vehicles[i].year} ${vehicles[i].make} ${vehicles[i].model} (${vehicles[i].vin}): ${r.reason?.message || r.reason}` : null)
      .filter(Boolean);
    if (failures.length) {
      console.error('Import failures:', failures);
      showToast(`${failures.length} of ${vehicles.length} failed. First error: ${failures[0]}`, 'error');
    } else {
      showToast(`Imported ${vehicles.length} vehicles.`, 'success');
    }
  };

  const [listModal, setListModal] = useState(null); // vehicle to list
  const [openingBidInput, setOpeningBidInput] = useState('');

  const handleList = (v) => {
    setOpeningBidInput(v.openingBid ? String(v.openingBid) : '');
    setListModal(v);
  };

  const handleListConfirm = async () => {
    const amt = parseFloat(openingBidInput);
    if (!amt || amt < 100) return;
    try {
      await listVehicle(listModal.id, amt);
      showToast('Vehicle listed in auction.', 'success');
      setListModal(null);
    } catch (err) {
      showToast('Failed to list: ' + (err.message || JSON.stringify(err)), 'error');
    }
  };

  const handleStatusChange = async (v, status) => {
    try { await updateVehicle(v.id, { status }); }
    catch (err) { showToast('Status update failed: ' + err.message, 'error'); }
  };

  const openSellModal = (v) => {
    setSellModal(v);
    setSellPrice('');
    setSellDate(new Date().toISOString().slice(0, 10));
    setSellTo('');
    setSellGross('');
  };

  const handleSellConfirm = async () => {
    if (!sellPrice || !sellDate || !sellTo.trim()) return;
    setSellSaving(true);
    const price = parseFloat(sellPrice);
    const cost = sellModal.totalCost ? parseFloat(sellModal.totalCost) : null;
    const gross = cost != null ? price - cost : null;
    try {
      await updateVehicle(sellModal.id, {
        status: 'sold',
        soldPrice: price,
        soldDate: sellDate,
        soldTo: sellTo.trim(),
        soldGross: gross,
      });
      showToast('Vehicle marked as sold.', 'success');
      const soldId = sellModal.id;
      setSellModal(null);
      if (panelVehicle?.id === soldId) closePanel();
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    }
    setSellSaving(false);
  };

  const openAddTransport = (v) => {
    setAddTransportModal(v);
    setTType('inbound');
    setTStore('');
    setTDate('');
    setTNotes('');
  };

  const handleAddTransportConfirm = async () => {
    if (tType === 'outbound' && !tStore.trim()) return;
    setTSaving(true);
    try {
      await addTransport(addTransportModal, { type: tType, storeName: tStore.trim(), scheduledDate: tDate, notes: tNotes.trim() });
      showToast('Transport record created.', 'success');
      setAddTransportModal(null);
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    }
    setTSaving(false);
  };

  const handleInspectionSave = async (vehicleId, inspectionData, nextStatus) => {
    await updateVehicle(vehicleId, { inspection: inspectionData, status: nextStatus });
    if (inspectionData.result === 'recon_needed') {
      const needsWorkLabels = Object.entries(inspectionData.items || {})
        .filter(([, val]) => val.rating === 'needs_work')
        .map(([key]) => INSPECTION_CATS.find(c => c.key === key)?.label || key);
      const notes = `PSI recon needed: ${needsWorkLabels.join(', ')}`;
      const vin6 = (data.vehicles.find(v => v.id === vehicleId)?.vin || '').slice(-6) || null;
      try { await addRepairOrder(vehicleId, vin6, null, notes, 0); } catch (_) {}
    }
    showToast('Inspection saved.', 'success');
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0, whiteSpace: 'nowrap' }}>
          Acquisitions {isReadOnly ? '(GM View)' : ''}
        </h1>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by make, model, VIN, color, engine…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>
        {user?.role === 'wholesale' && (
          <button onClick={() => setMyBuysOnly(p => !p)} style={{
            padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${myBuysOnly ? '#0d2550' : '#e5e7eb'}`,
            background: myBuysOnly ? '#0d2550' : '#fff', color: myBuysOnly ? '#fff' : '#6b7280',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>My Buys</button>
        )}
        <div style={{ display: 'flex', border: '1.5px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
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
          <>
            <button onClick={() => setShowUpload(true)} style={{ whiteSpace: 'nowrap', flexShrink: 0, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              ⬆ Import
            </button>
            <button className="btn-navy" onClick={() => { setEditing(null); setSaveError(null); setShowForm(true); }} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              + Add vehicle
            </button>
          </>
        )}
      </div>

      {/* Filter row */}
      {(() => {
        const pill = (active) => ({
          appearance: 'none', WebkitAppearance: 'none',
          width: 'auto', flexShrink: 0,
          padding: '6px 24px 6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          border: `1.5px solid ${active ? '#0d2550' : '#e5e7eb'}`,
          background: `${active ? '#0d2550' : '#fff'} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='${active ? '%23fff' : '%239ca3af'}'/%3E%3C/svg%3E") no-repeat right 10px center`,
          backgroundSize: '8px 5px',
          color: active ? '#fff' : '#374151',
          cursor: 'pointer',
        });
        const anyActive = statusFilter !== 'all' || buyerFilter || sourceFilter || dateRange !== 'all' || ageFilter !== 'all' || search;
        return (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={pill(statusFilter !== 'all')}>
                <option value="all">All statuses</option>
                {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'no_sale').map(([k, { label }]) => (
                  <option key={k} value={k}>{label} ({statusCounts[k] || 0})</option>
                ))}
              </select>
              <select value={ageFilter} onChange={e => setAgeFilter(e.target.value)} style={pill(ageFilter !== 'all')}>
                <option value="all">Any age</option>
                <option value="<30">{'< 30 days'}</option>
                <option value="30-60">Aging 30–60d</option>
                <option value="60-90">At Risk 60–90d</option>
                <option value="90+">Liquidate 90d+</option>
              </select>
              <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={pill(dateRange !== 'all')}>
                <option value="all">All time</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="custom">Custom…</option>
              </select>
              <select value={buyerFilter} onChange={e => setBuyerFilter(e.target.value)} style={pill(!!buyerFilter)}>
                <option value="">All buyers</option>
                {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={pill(!!sourceFilter)}>
                <option value="">All sources</option>
                {sourceOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', marginLeft: 4 }}>{filtered.length} vehicles</span>
              {anyActive && (
                <button onClick={() => { setStatusFilter('all'); setBuyerFilter(''); setSourceFilter(''); setDateRange('all'); setDateFrom(''); setDateTo(''); setAgeFilter('all'); setSearch(''); }}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '0 4px' }}>
                  ✕ Clear
                </button>
              )}
            </div>
            {dateRange === 'custom' && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '5px 8px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: 12, background: '#fff' }} />
                <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '5px 8px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: 12, background: '#fff' }} />
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ marginBottom: 10 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, transition: 'padding-right 0.3s', paddingRight: panelVehicle ? 460 : 0 }}>
          {filtered.map(v => {
            const st = STATUS_LABELS[v.status] || STATUS_LABELS.intake;
            const margin = v.floorPrice && v.totalCost ? (parseFloat(v.floorPrice) - parseFloat(v.totalCost)) : null;
            const iconBtn = { background: '#F8F9FA', border: '1px solid #e5e7eb', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 };
            return (
              <VehicleCard
                key={v.id}
                vehicle={v}
                showAge={['wholesale', 'gm', 'admin'].includes(user.role)}
                showTitleStatus={true}
                mileage={v.mileage ?? mileageMap[v.id] ?? null}
                showCostBasis={!!v.totalCost}
                costBasis={v.totalCost}
                badge={
                  <span style={{ background: st.bg, color: st.color, padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: '.02em' }}>
                    {st.label}
                  </span>
                }
                pricePill={null}
                highlighted={panelVehicle?.id === v.id}
                actionButton={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {!isReadOnly && (
                      <>
                        {(v.status === 'intake' || v.status === 'no_sale') && (
                          <>
                            <button onClick={() => handleStatusChange(v, 'inspection')} style={{ width: '100%', background: '#fff7ed', color: '#9a3412', border: '1.5px solid #fdba74', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>→ Inspection</button>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                              <button onClick={() => handleStatusChange(v, 'recon')} style={{ background: 'none', border: 'none', fontSize: 10, color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, padding: '1px 0' }}>Skip to Recon</button>
                              <button onClick={() => handleStatusChange(v, 'ready')} style={{ background: 'none', border: 'none', fontSize: 10, color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, padding: '1px 0' }}>Skip to Ready</button>
                            </div>
                          </>
                        )}
                        {v.status === 'inspection' && (
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button onClick={() => printInspectionChecklist(v)} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Print</button>
                            <button onClick={() => setInspectionModal(v)} style={{ flex: 1, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Enter Results</button>
                          </div>
                        )}
                        {v.status === 'recon' && (
                          <button onClick={() => handleStatusChange(v, 'ready')} style={{ width: '100%', background: '#f0fdf4', color: '#15803d', border: '1.5px solid #86efac', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Mark Ready</button>
                        )}
                        {v.status === 'ready' && data.auction.isOpen && (
                          <button onClick={() => handleList(v)} style={{ width: '100%', background: '#0d2550', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>List in Auction</button>
                        )}
                        {v.status === 'in_auction' && (
                          <button onClick={async () => { try { await unlistVehicle(v.id); } catch (err) { showToast('Failed: ' + err.message, 'error'); } }} style={{ width: '100%', background: '#fefce8', color: '#854d0e', border: '1.5px solid #fde047', borderRadius: 7, padding: '8px 0', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Remove from Auction</button>
                        )}
                        {['intake','inspection','recon','ready','no_sale'].includes(v.status) && (
                          <button onClick={() => openSellModal(v)} style={{ width: '100%', background: '#f9fafb', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 7, padding: '6px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Mark as Sold</button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => openPanel(v)}
                      style={{ width: '100%', background: panelVehicle?.id === v.id ? '#0d2550' : '#fff', color: panelVehicle?.id === v.id ? '#fff' : '#0d2550', border: '1.5px solid #0d2550', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                    >
                      {panelVehicle?.id === v.id ? '← Viewing' : 'View Listing'}
                    </button>
                  </div>
                }
              />
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
                showAge={['wholesale', 'gm', 'admin'].includes(user.role)}
                showDatePurchased={true}
                showTitleStatus={true}
                sourceName={sourceOptions.find(s => s.value === v.sourceId)?.label || null}
                vehicle={v}
                mileage={v.mileage ?? mileageMap[v.id] ?? null}
                badge={
                  <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {st.label}
                  </span>
                }
                pricePill={null}
              >
                {/* Operational strip */}
                <div style={{ padding: '12px 16px 14px', borderTop: '1px solid #f3f4f6', background: '#f9fafb', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

                  {/* Financials — 2×2 grid */}
                  {(v.purchasePrice || v.floorPrice || v.totalCost) && (
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Financials</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                      {v.purchasePrice && <div><span style={{ fontSize: 10, color: '#9ca3af', display: 'block' }}>Purchase</span><span style={{ fontSize: 12, fontWeight: 700 }}>${parseFloat(v.purchasePrice).toLocaleString()}</span></div>}
                      {v.totalCost && <div><span style={{ fontSize: 10, color: '#9ca3af', display: 'block' }}>Total Cost</span><span style={{ fontSize: 12, fontWeight: 700, color: '#0d2550' }}>${parseFloat(v.totalCost).toLocaleString()}</span></div>}
                      {v.floorPrice && <div style={{ marginTop: 4 }}><span style={{ fontSize: 10, color: '#9ca3af', display: 'block' }}>Floor</span><span style={{ fontSize: 12, fontWeight: 700 }}>${parseFloat(v.floorPrice).toLocaleString()}</span></div>}
                      {margin !== null && <div style={{ marginTop: 4 }}><span style={{ fontSize: 10, color: '#9ca3af', display: 'block' }}>Margin</span><span style={{ fontSize: 12, fontWeight: 700, color: margin >= 0 ? '#065f46' : '#991b1b' }}>${margin.toLocaleString()}</span></div>}
                    </div>
                    {v.totalRepairCosts > 0 && <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', gap: 16 }}><span style={{ fontSize: 10, color: '#9ca3af' }}>Recon</span><span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>${parseFloat(v.totalRepairCosts).toLocaleString()}</span></div>}
                  </div>
                  )}

                  {/* Stage */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Stage</div>
                    {!isReadOnly
                      ? <VehicleStatusDropdown vehicle={v} onChange={async (val) => { try { await updateVehicle(v.id, { status: val }); } catch (err) { showToast('Status update failed: ' + err.message, 'error'); } }} />
                      : <span style={{ background: st.bg, color: st.color, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>{st.label}</span>
                    }
                  </div>

                  {/* Title Custody */}
                  <TitleCustodyTracker
                    vehicle={v}
                    canUpdate={!isReadOnly}
                    onUpdate={async (newTracker) => {
                      try { await updateVehicle(v.id, { title_tracker: newTracker }); }
                      catch (err) { showToast('Title update failed: ' + err.message, 'error'); }
                    }}
                  />

                  {/* Inspection */}
                  {(v.status === 'inspection' || v.inspection?.status === 'complete') && (
                    <div style={{ minWidth: 170 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Inspection</div>
                      {v.inspection?.status === 'complete' ? (
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: v.inspection.result === 'pass' ? '#d1fae5' : '#fee2e2', color: v.inspection.result === 'pass' ? '#065f46' : '#991b1b', display: 'inline-block', marginBottom: 4 }}>
                            {v.inspection.result === 'pass' ? '✓ Pass' : '⚠ Recon needed'}
                          </span>
                          {v.inspection.completed_by && <div style={{ fontSize: 11, color: '#6b7280' }}>by {v.inspection.completed_by}</div>}
                          {Object.entries(v.inspection.items || {}).filter(([,val]) => val.rating === 'needs_work').map(([k]) => {
                            const cat = INSPECTION_CATS.find(c => c.key === k);
                            return <div key={k} style={{ fontSize: 10, color: '#dc2626', marginTop: 1 }}>• {cat?.label}</div>;
                          })}
                        </div>
                      ) : (
                        !isReadOnly && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <button onClick={() => printInspectionChecklist(v)} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                              Print checklist
                            </button>
                            <button onClick={() => setInspectionModal(v)} style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                              Enter results
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Location */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Location</div>
                    {!isReadOnly ? (
                      <select
                        value={v.currentLocation || ''}
                        onChange={async e => { try { await updateVehicle(v.id, { currentLocation: e.target.value }); } catch (err) { showToast('Location update failed: ' + err.message, 'error'); } }}
                        style={{ fontSize: 13, padding: '8px 12px', border: '2px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', minWidth: 150 }}
                      >
                        <option value="">Select location…</option>
                        {locationOptions.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 13, color: '#374151' }}>{locationOptions.find(l => l.value === v.currentLocation)?.label || '—'}</span>
                    )}
                  </div>

                  {/* Keys */}

                  {/* Actions */}
                  {!isReadOnly && (
                    <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      {/* Stage advancement */}
                      {(v.status === 'intake' || v.status === 'no_sale') && (
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => handleStatusChange(v, 'inspection')} style={{ background: '#fef3c7', color: '#92400e', border: '1.5px solid #fcd34d', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>→ Inspect</button>
                          <button onClick={() => handleStatusChange(v, 'recon')} style={{ background: '#fffbeb', color: '#92400e', border: '1.5px solid #fcd34d', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>→ Recon</button>
                          <button onClick={() => handleStatusChange(v, 'ready')} style={{ background: '#d1fae5', color: '#065f46', border: '1.5px solid #6ee7b7', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>→ Ready</button>
                        </div>
                      )}
                      {v.status === 'inspection' && (
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => handleStatusChange(v, 'recon')} style={{ background: '#fffbeb', color: '#92400e', border: '1.5px solid #fcd34d', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>→ Recon</button>
                          <button onClick={() => handleStatusChange(v, 'ready')} style={{ background: '#d1fae5', color: '#065f46', border: '1.5px solid #6ee7b7', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>→ Ready</button>
                        </div>
                      )}
                      {v.status === 'recon' && (
                        <button onClick={() => handleStatusChange(v, 'ready')} style={{ background: '#d1fae5', color: '#065f46', border: '1.5px solid #6ee7b7', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>✓ Mark Ready</button>
                      )}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {v.status === 'ready' && data.auction.isOpen && (
                          <button onClick={() => handleList(v)} style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>List now</button>
                        )}
                        {v.status === 'in_auction' && (
                          <button onClick={async () => { try { await unlistVehicle(v.id); } catch (err) { showToast('Failed to remove: ' + err.message, 'error'); } }} style={{ background: '#fef3c7', color: '#92400e', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                        )}
                        <button onClick={() => setDetailModal(v)} data-tooltip="Details" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 }}>🔍</button>
                        <button onClick={() => { setEditing(v); setSaveError(null); setShowForm(true); }} data-tooltip="Edit" style={{ background: '#F8F9FA', border: '1px solid #e5e7eb', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                        {['intake', 'inspection', 'recon', 'ready', 'no_sale'].includes(v.status) && (
                          <button onClick={() => setRepairModal(v)} data-tooltip="Repairs" style={{ background: '#F8F9FA', border: '1px solid #e5e7eb', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 }}>🔧</button>
                        )}
                        <button onClick={() => handlePrintBuySheet(v)} data-tooltip="Buy sheet" style={{ background: '#F8F9FA', border: '1px solid #e5e7eb', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 }}>🧾</button>
                        <button onClick={() => setConfirmDelete(v)} data-tooltip="Delete" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                      </div>
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
              <h2>{editing ? 'Edit vehicle' : 'New Vehicle'}</h2>
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
                addLocation={addLocation}
                pickupAddresses={pickupAddresses}
                addPickupAddress={addPickupAddress}
                buyers={buyers}
                vehicles={data.vehicles}
                editingId={editing?.id || null}
                existingTransport={editing ? (data.transport || []).find(t => t.vehicleId === editing.id) || null : null}
              />
            </div>
          </div>
        </div>
      )}

      {/* Repair orders modal */}
      {repairModal && <RepairOrdersModal vehicle={repairModal} onClose={() => setRepairModal(null)} />}

      {/* Inspection modal */}
      {inspectionModal && <InspectionModal vehicle={inspectionModal} inspectors={data.inspectors || []} addInspector={addInspector} onSave={handleInspectionSave} onClose={() => setInspectionModal(null)} />}

      {detailModal && <VehicleDetailModal vehicle={detailModal} onClose={() => setDetailModal(null)} />}

      {/* Resolve arbitration modal */}
      {resolveModal && (
        <ArbitrationResolveModal vehicle={resolveModal} onClose={() => setResolveModal(null)} />
      )}

      {/* Upload modal */}
      {showUpload && (
        <ExcelUploadModal
          onClose={() => setShowUpload(false)}
          onImport={(vehicles) => { handleBulkImport(vehicles); }}
        />
      )}

      {/* List for Auction modal */}
      {listModal && (
        <div className="modal-overlay" onClick={() => setListModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header" style={{ background: '#0d2550', borderRadius: '12px 12px 0 0' }}>
              <div>
                <h2 style={{ color: '#fff', fontSize: 17 }}>List for Auction</h2>
                <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 13, marginTop: 2 }}>
                  {listModal.year} {listModal.make} {listModal.model}
                </p>
              </div>
              <button onClick={() => setListModal(null)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Opening bid *</label>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: -4, marginBottom: 8 }}>
                  The minimum first bid. Bidders will see this — floor price stays hidden.
                </p>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#374151' }}>$</span>
                  <input
                    type="number"
                    value={openingBidInput}
                    onChange={e => setOpeningBidInput(e.target.value)}
                    placeholder="e.g. 14000"
                    min="100"
                    autoFocus
                    style={{ paddingLeft: 26, width: '100%', boxSizing: 'border-box' }}
                    onKeyDown={e => e.key === 'Enter' && handleListConfirm()}
                  />
                </div>
                {listModal.floorPrice && (
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                    Floor price: ${parseFloat(listModal.floorPrice).toLocaleString()} (hidden from bidders)
                  </p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setListModal(null)}>Cancel</button>
              <button
                className="btn-navy"
                onClick={handleListConfirm}
                disabled={!openingBidInput || parseFloat(openingBidInput) < 100}
              >
                List Vehicle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail panel ──────────────────────────────────────────────────────── */}
      {panelVehicle && (() => {
        const pv = data.vehicles.find(vv => vv.id === panelVehicle.id) || panelVehicle;
        const photos = Array.isArray(pv.photos) ? pv.photos : [];
        const pvMargin = pv.floorPrice && pv.totalCost ? parseFloat(pv.floorPrice) - parseFloat(pv.totalCost) : null;
        const pvTransport = (data.transport || []).find(t => t.vehicleId === pv.id);
        const pvSource = sourceOptions.find(s => s.value === pv.sourceId)?.label || null;
        const pvMileage = pv.mileage ?? mileageMap[pv.id] ?? null;
        const st = STATUS_LABELS[pv.status] || STATUS_LABELS.intake;
        const fmt$ = (n) => n != null ? `$${parseFloat(n).toLocaleString()}` : '—';
        const fmtBool = (b) => b === true ? 'Yes' : b === false ? 'No' : '—';
        const sectionHdr = (label) => (
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid #f3f4f6', paddingBottom: 6, marginBottom: 10, marginTop: 18 }}>{label}</div>
        );
        const row = (label, value, valueStyle = {}) => value ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', textAlign: 'right', maxWidth: '60%', ...valueStyle }}>{value}</span>
          </div>
        ) : null;

        return (
          <div style={{
            position: 'fixed', top: 0, right: 0, width: 440, height: '100vh',
            background: '#fff', boxShadow: '-6px 0 32px rgba(0,0,0,0.12)',
            zIndex: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Panel header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: '#0d2550' }}>
              <button onClick={closePanel} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {pv.year} {pv.make} {pv.model}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 1 }}>{pv.trim || pv.vin || ''}</div>
              </div>
              <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{st.label}</span>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 100px' }}>
              {/* Photo gallery */}
              <div style={{ position: 'relative', background: '#f5f7fa', height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {photos.length > 0 ? (
                  <img src={photos[panelPhotoIdx] || photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 56, opacity: 0.1 }}>🚗</span>
                )}
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setPanelPhotoIdx(i => Math.max(0, i - 1))} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                    <button onClick={() => setPanelPhotoIdx(i => Math.min(photos.length - 1, i + 1))} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                    <div style={{ position: 'absolute', bottom: 8, right: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{panelPhotoIdx + 1} / {photos.length}</div>
                  </>
                )}
              </div>

              <div style={{ padding: '0 18px' }}>
                {/* Vehicle details */}
                {sectionHdr('Vehicle')}
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '4px 8px', borderRadius: 4, display: 'inline-block', marginBottom: 10, letterSpacing: '.04em' }}>{pv.vin || '—'}</div>
                {row('Condition', pv.condition)}
                {row('Color', pv.color && pv.interior_color ? `${pv.color} / ${pv.interior_color}` : (pv.color || pv.interior_color))}
                {pv.engine && row('Engine', pv.engine)}
                {row('Mileage', pvMileage != null ? `${parseInt(pvMileage).toLocaleString()} mi` : null)}

                {/* Financials */}
                {(pv.purchasePrice || pv.totalCost || pv.floorPrice || pvSource || pv.datePurchased || pv.buyer_name) && (
                  <>
                    {sectionHdr('Acquisition')}
                    {pv.datePurchased && row('Date Purchased', new Date(pv.datePurchased + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))}
                    {pvSource && row('Source', pvSource)}
                    {pv.buyer_name && row('Buyer', pv.buyer_name)}

                    {/* Key numbers — 3 stat boxes */}
                    {(pv.totalCost || pv.floorPrice) && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, margin: '14px 0 10px' }}>
                        {[
                          { label: 'Cost Basis', value: fmt$(pv.totalCost) },
                          { label: 'Floor', value: fmt$(pv.floorPrice) },
                          {
                            label: 'Margin',
                            value: pvMargin !== null ? fmt$(pvMargin) : '—',
                            color: pvMargin !== null ? (pvMargin >= 0 ? '#15803d' : '#b91c1c') : '#9ca3af',
                            bg: pvMargin !== null ? (pvMargin >= 0 ? '#f0fdf4' : '#fef2f2') : '#f9fafb',
                            border: pvMargin !== null ? (pvMargin >= 0 ? '#bbf7d0' : '#fecaca') : '#e5e7eb',
                          },
                        ].map(({ label, value, color, bg, border }) => (
                          <div key={label} style={{ background: bg || '#f8faff', border: `1px solid ${border || '#e2e8f0'}`, borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: color || '#0d2550', lineHeight: 1 }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Breakdown */}
                    {sectionHdr('Breakdown')}
                    {row('Purchase Price', fmt$(pv.purchasePrice))}
                    {pv.overheadCosts > 0 && row('Overhead / Fees', fmt$(pv.overheadCosts))}
                    {pv.totalRepairCosts > 0 && row('Recon Costs', fmt$(pv.totalRepairCosts), { color: '#92400e' })}
                    {row('Floor Price', fmt$(pv.floorPrice))}
                  </>
                )}

                {/* Title */}
                {pv.titleStatus && (
                  <>
                    {sectionHdr('Title')}
                    {row('Status', pv.titleStatus.charAt(0).toUpperCase() + pv.titleStatus.slice(1))}
                    {row('Electronic', fmtBool(pv.titleElectronic))}
                    {pv.titleNotes && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{pv.titleNotes}</div>}
                  </>
                )}

                {/* Transport */}
                {sectionHdr('Transport')}
                {pvTransport ? (
                  <>
                    {row('Status', pvTransport.status.charAt(0).toUpperCase() + pvTransport.status.slice(1))}
                    {row('Type', pvTransport.storeName === 'Intake' ? 'Inbound Pickup' : 'Outbound Delivery')}
                    {pvTransport.scheduledDate && row('Scheduled', new Date(pvTransport.scheduledDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}
                    {pvTransport.storeName !== 'Intake' && row('Destination', pvTransport.storeName)}
                  </>
                ) : (
                  !isReadOnly && (
                    <button
                      onClick={() => openAddTransport(pv)}
                      style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left' }}
                    >
                      + Add Transport Record
                    </button>
                  )
                )}

                {/* Notes */}
                {pv.notes && (
                  <>
                    {sectionHdr('Disclosure Notes')}
                    <div style={{ fontSize: 13, color: '#374151', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px', lineHeight: 1.5 }}>{pv.notes}</div>
                  </>
                )}

                {/* Arbitration */}
                {pv.arbitration?.status === 'open' && (
                  <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#991b1b', marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚠ Arbitration filed</span>
                    {!isReadOnly && <button onClick={() => { setResolveModal(pv); closePanel(); }} style={{ background: '#991b1b', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Resolve</button>}
                  </div>
                )}
              </div>
            </div>

            {/* Panel footer actions */}
            {!isReadOnly && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, flexShrink: 0, background: '#fff', flexWrap: 'wrap' }}>
                <button onClick={() => { setEditing(pv); setSaveError(null); setShowForm(true); }} style={{ flex: 1, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 60 }}>Edit</button>
                {['intake', 'inspection', 'recon', 'ready', 'no_sale'].includes(pv.status) && (
                  <>
                    <button onClick={() => setRepairModal(pv)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', minWidth: 60 }}>🔧 Repairs</button>
                    <button onClick={() => { openSellModal(pv); closePanel(); }} style={{ flex: 1, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', minWidth: 60 }}>Mark Sold</button>
                  </>
                )}
                <button onClick={() => handlePrintBuySheet(pv)} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, cursor: 'pointer' }}>🧾</button>
                <button onClick={() => { setConfirmDelete(pv); closePanel(); }} style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: '9px 12px', fontSize: 13, cursor: 'pointer' }}>🗑️</button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Add Transport modal */}
      {addTransportModal && (
        <div className="modal-overlay" onClick={() => setAddTransportModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Add Transport Record</h2>
              <button onClick={() => setAddTransportModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{addTransportModal.year} {addTransportModal.make} {addTransportModal.model}</div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['inbound','Inbound (Pickup)'],['outbound','Outbound (Delivery)']].map(([val, lbl]) => (
                    <button key={val} onClick={() => setTType(val)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `2px solid ${tType === val ? '#0d2550' : '#e5e7eb'}`, background: tType === val ? '#0d2550' : '#fff', color: tType === val ? '#fff' : '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{lbl}</button>
                  ))}
                </div>
              </div>
              {tType === 'outbound' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Destination Store *</label>
                  <input type="text" value={tStore} onChange={e => setTStore(e.target.value)} placeholder="e.g. Cherry Hill CDJR" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              )}
              <div className="form-group" style={{ margin: 0 }}>
                <label>Scheduled Date <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
                <input type="datetime-local" value={tDate} onChange={e => setTDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Notes <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
                <input type="text" value={tNotes} onChange={e => setTNotes(e.target.value)} placeholder="Pickup address, contact, etc." style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setAddTransportModal(null)}>Cancel</button>
              <button className="btn-navy" onClick={handleAddTransportConfirm} disabled={tSaving || (tType === 'outbound' && !tStore.trim())}>
                {tSaving ? 'Saving…' : 'Create Transport'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Sold modal */}
      {sellModal && (
        <div className="modal-overlay" onClick={() => setSellModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header" style={{ background: '#0d2550', borderRadius: '12px 12px 0 0' }}>
              <div>
                <h2 style={{ color: '#fff', fontSize: 17 }}>Record Outside Sale</h2>
                <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 13, marginTop: 2 }}>
                  {sellModal.year} {sellModal.make} {sellModal.model}
                </p>
              </div>
              <button onClick={() => setSellModal(null)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Sale Price *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#374151' }}>$</span>
                  <input type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="e.g. 18500" min="0" autoFocus style={{ paddingLeft: 26, width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Sale Date *</label>
                <input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Sold To * <span style={{ fontWeight: 400, color: '#9ca3af' }}>(store name or auction)</span></label>
                <input type="text" value={sellTo} onChange={e => setSellTo(e.target.value)} placeholder="e.g. Cherry Hill CDJR or ADESA Detroit" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              {(() => {
                const price = parseFloat(sellPrice);
                const cost = sellModal?.totalCost ? parseFloat(sellModal.totalCost) : null;
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
              <button className="btn-secondary" onClick={() => setSellModal(null)}>Cancel</button>
              <button
                className="btn-navy"
                onClick={handleSellConfirm}
                disabled={sellSaving || !sellPrice || !sellDate || !sellTo.trim()}
                style={{ opacity: (!sellPrice || !sellDate || !sellTo.trim()) ? 0.45 : 1 }}
              >
                {sellSaving ? 'Saving…' : 'Mark as Sold'}
              </button>
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
              <h2 style={{ fontSize: 17, marginBottom: 8 }}>Remove vehicle?</h2>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: confirmDelete.status === 'awarded' ? 8 : 24 }}>
                {confirmDelete.year} {confirmDelete.make} {confirmDelete.model} will be permanently removed.
              </p>
              {confirmDelete.status === 'awarded' && (
                <div className="alert alert-warning" style={{ marginBottom: 16, textAlign: 'left' }}>
                  ⚠ This vehicle is <strong>awarded to {confirmDelete.winnerName}</strong>. Deleting it will also remove the transport record. Only do this to correct a data entry error.
                </div>
              )}
              {confirmDelete.status === 'in_auction' && (
                <div className="alert alert-warning" style={{ marginBottom: 16, textAlign: 'left' }}>
                  ⚠ This vehicle is <strong>live in the auction</strong>. Deleting it will remove all bids placed on it.
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="btn-danger" onClick={async () => { try { await deleteVehicle(confirmDelete.id); setConfirmDelete(null); showToast('Vehicle removed.', 'success'); } catch (err) { showToast('Delete failed: ' + err.message, 'error'); } }}>Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
