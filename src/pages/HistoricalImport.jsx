import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ORG_ID = 'bf236d2b-4693-4606-bf3d-ece1767690ab';

// Header text -> internal field name. Keys are normalized (lowercased,
// non-alphanumeric stripped) so small wording differences in the sheet
// don't break matching.
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const HEADER_MAP = {
  [norm('Source')]: 'source',
  [norm('Purchase Date')]: 'datePurchased',
  [norm('Year')]: 'year',
  [norm('Make')]: 'make',
  [norm('Model')]: 'model',
  [norm('Trim')]: 'trim',
  [norm('VIN')]: 'vin',
  [norm('Miles')]: 'mileage',
  [norm('Mileage')]: 'mileage',
  [norm('Color')]: 'color',
  [norm('Purchase Price')]: 'purchasePrice',
  [norm('Wholesale')]: 'soldPrice',
  [norm('Wholesale(sell price)')]: 'soldPrice',
  [norm('Wholesale Sell Price')]: 'soldPrice',
  [norm('Sell Price')]: 'soldPrice',
  [norm('Sale Date')]: 'soldDate',
  [norm('Sold Date')]: 'soldDate',
  [norm('Buyer (internal user)')]: 'buyerInternal',
  [norm('Buyer Internal')]: 'buyerInternal',
  [norm('Buyer (external store/transfer store)')]: 'buyerExternal',
  [norm('Buyer External')]: 'buyerExternal',
  [norm('Transfer Store')]: 'buyerExternal',
};

function parseExcelDate(raw) {
  if (raw === '' || raw == null) return null;
  if (typeof raw === 'number') {
    const d = new Date((raw - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

export default function HistoricalImport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, addAcquisitionSource } = useData();

  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  if (user.role !== 'wholesale' && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const findSourceId = (name) => {
    if (!name) return null;
    const hit = (data.acquisition_sources || []).find(s => s.name?.toLowerCase().trim() === name.toLowerCase().trim());
    return hit?.id || null;
  };
  const findBuyer = (name) => {
    if (!name) return null;
    const n = name.toLowerCase().trim();
    const buyers = data.buyers || [];
    return buyers.find(b => b.name?.toLowerCase().trim() === n)
      || buyers.find(b => b.name && (b.name.toLowerCase().includes(n) || n.includes(b.name.toLowerCase())))
      || null;
  };
  const findVehicleByVin = (vin) => {
    if (!vin) return null;
    const v = vin.toUpperCase().trim();
    return (data.vehicles || []).find(veh => veh.vin && veh.vin.toUpperCase().trim() === v) || null;
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setRows([]);
    setResult(null);
    try {
      const XLSX = window.XLSX;
      if (!XLSX) { setError('Spreadsheet parser not loaded yet. Please refresh the page and try again.'); return; }
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      const headerRowIdx = raw.findIndex(r => r.some(c => norm(c) === norm('VIN')));
      if (headerRowIdx === -1) { setError('Could not find a header row with a VIN column.'); return; }

      const headers = raw[headerRowIdx].map(h => HEADER_MAP[norm(h)] || null);
      const dataRows = raw.slice(headerRowIdx + 1).filter(r => r.some(c => c !== ''));

      const parsed = dataRows.map((row, i) => {
        const obj = {};
        headers.forEach((field, idx) => { if (field) obj[field] = row[idx]; });

        const vin = String(obj.vin || '').toUpperCase().trim();
        const purchasePrice = obj.purchasePrice !== '' && obj.purchasePrice != null ? parseFloat(obj.purchasePrice) : null;
        const soldPrice = obj.soldPrice !== '' && obj.soldPrice != null ? parseFloat(obj.soldPrice) : null;
        const datePurchased = parseExcelDate(obj.datePurchased);
        const soldDate = parseExcelDate(obj.soldDate);
        const sourceName = String(obj.source || '').trim();
        const buyerInternalName = String(obj.buyerInternal || '').trim();
        const buyerExternalName = String(obj.buyerExternal || '').trim();

        const matchedVehicle = findVehicleByVin(vin);
        const matchedBuyer = findBuyer(buyerInternalName);
        const existingSourceId = findSourceId(sourceName);

        const warnings = [];
        if (!vin || vin.length !== 17) warnings.push('VIN missing/invalid — will always create a new record, can\'t match to an existing one');
        if (purchasePrice == null) warnings.push('No purchase price');
        if (soldPrice != null && !soldDate) warnings.push('Has a sale price but no sale date — won\'t appear on the pace chart or count toward days-to-turn');
        if (buyerInternalName && !matchedBuyer) warnings.push(`Buyer "${buyerInternalName}" doesn't match an existing account — will still count in totals, won't show on a buyer scorecard`);
        if (!obj.year || !obj.make || !obj.model) warnings.push('Missing year/make/model');

        return {
          rowNum: headerRowIdx + 2 + i,
          vin, year: obj.year || null, make: String(obj.make || '').trim(), model: String(obj.model || '').trim(),
          trim: String(obj.trim || '').trim() || null, color: String(obj.color || '').trim() || null,
          mileage: obj.mileage !== '' && obj.mileage != null ? parseInt(obj.mileage) : null,
          purchasePrice, datePurchased, soldPrice, soldDate,
          soldGross: soldPrice != null && purchasePrice != null ? soldPrice - purchasePrice : null,
          sourceName, existingSourceId,
          buyerInternalName, matchedBuyerId: matchedBuyer?.id || null, matchedBuyerName: matchedBuyer?.name || null,
          buyerExternalName,
          matchedVehicleId: matchedVehicle?.id || null,
          warnings,
        };
      });

      if (parsed.length === 0) { setError('No data rows found below the header.'); return; }
      setRows(parsed);
    } catch (err) {
      setError('Could not read file: ' + err.message);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError('');
    try {
      // 1. Create any sources that don't exist yet.
      const newSourceNames = [...new Set(
        rows.filter(r => r.sourceName && !r.existingSourceId).map(r => r.sourceName)
      )];
      const createdSources = {};
      for (const name of newSourceNames) {
        const row = await addAcquisitionSource(name);
        createdSources[name.toLowerCase().trim()] = row.id;
      }
      const resolveSourceId = (r) => r.existingSourceId || createdSources[r.sourceName.toLowerCase().trim()] || null;

      // 2. Split into inserts (no VIN match) vs updates (VIN matched an existing vehicle).
      const toInsert = rows.filter(r => !r.matchedVehicleId);
      const toUpdate = rows.filter(r => r.matchedVehicleId);

      const basePayload = (r) => ({
        org_id: ORG_ID,
        status: r.soldPrice != null ? 'sold' : 'ready',
        vin: r.vin || null,
        year: r.year ? parseInt(r.year) : null,
        make: r.make || null,
        model: r.model || null,
        trim: r.trim,
        color: r.color,
        purchase_price: r.purchasePrice,
        date_purchased: r.datePurchased,
        source_id: resolveSourceId(r),
        buyer_id: r.matchedBuyerId,
        buyer_name: r.matchedBuyerName || r.buyerInternalName || null,
        sold_price: r.soldPrice,
        sold_date: r.soldDate,
        sold_to: r.buyerExternalName || null,
        sold_gross: r.soldGross,
      });

      let insertedRows = [];
      if (toInsert.length) {
        const payload = toInsert.map(r => ({ ...basePayload(r), intake_at: new Date().toISOString() }));
        const { data: rowsBack, error: insErr } = await supabase.from('vehicles').insert(payload).select('id, vin');
        if (insErr) throw insErr;
        insertedRows = rowsBack;
      }

      let updatedRows = [];
      if (toUpdate.length) {
        const payload = toUpdate.map(r => ({ ...basePayload(r), id: r.matchedVehicleId }));
        const { data: rowsBack, error: updErr } = await supabase.from('vehicles').upsert(payload, { onConflict: 'id' }).select('id, vin');
        if (updErr) throw updErr;
        updatedRows = rowsBack;
      }

      // 3. Mileage — separate table, keyed by the vehicle id we now have for every row.
      const idByVin = {};
      [...insertedRows, ...updatedRows].forEach(r => { if (r.vin) idByVin[r.vin.toUpperCase().trim()] = r.id; });
      const mileagePayload = rows
        .filter(r => r.mileage && idByVin[r.vin])
        .map(r => ({
          vehicle_id: idByVin[r.vin], org_id: ORG_ID, reading: r.mileage,
          vin6: r.vin.slice(-6), reason: 'historical_import',
        }));
      if (mileagePayload.length) {
        const { error: mErr } = await supabase.from('mileage_log').insert(mileagePayload);
        if (mErr) throw mErr;
      }

      setResult({ inserted: insertedRows.length, updated: updatedRows.length, mileage: mileagePayload.length, sourcesCreated: newSourceNames.length });
    } catch (err) {
      setError('Import failed partway through: ' + err.message + '. Whatever completed before the error is already saved — check Acquisitions/Sold before re-running to avoid duplicates.');
    } finally {
      setImporting(false);
    }
  };

  const newCount = rows.filter(r => !r.matchedVehicleId).length;
  const updateCount = rows.filter(r => r.matchedVehicleId).length;
  const warnCount = rows.filter(r => r.warnings.length > 0).length;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate('/performance')} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          ← Desk performance
        </button>
      </div>
      <div className="page-header">
        <h1>Import historical sales data</h1>
        <p>Backfill purchase and sale records from a spreadsheet — matches by VIN, updates cars already in the system, creates the rest</p>
      </div>

      {result ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#065f46', marginBottom: 8 }}>Import complete</div>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
            {result.updated} existing vehicle{result.updated === 1 ? '' : 's'} updated · {result.inserted} new vehicle{result.inserted === 1 ? '' : 's'} created
            {result.sourcesCreated > 0 && ` · ${result.sourcesCreated} new source${result.sourcesCreated === 1 ? '' : 's'} added`}
            {' · '}{result.mileage} mileage reading{result.mileage === 1 ? '' : 's'} logged
          </p>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Reloading picks up everything on the dashboard and buyer scorecards.</p>
          <button className="btn-navy" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>Reload app</button>
        </div>
      ) : (
        <>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />

          {rows.length === 0 && (
            <div
              onClick={() => fileRef.current.click()}
              style={{ border: '2px dashed #c7d6ef', borderRadius: 12, padding: '48px 20px', textAlign: 'center', cursor: 'pointer', background: '#f0f4fb' }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
              <p style={{ fontWeight: 600, color: '#1a3d76', fontSize: 15, margin: 0 }}>Click to choose your .xlsx file</p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                Source · Purchase Date · Year · Make · Model · Trim · VIN · Miles · Color · Purchase Price · Wholesale (sell price) · Sale Date · Buyer (internal) · Buyer (external)
              </p>
            </div>
          )}

          {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

          {rows.length > 0 && (
            <>
              <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span><strong>{rows.length}</strong> rows read</span>
                <span><strong>{updateCount}</strong> match an existing vehicle by VIN — will update</span>
                <span><strong>{newCount}</strong> no VIN match — will create new</span>
                {warnCount > 0 && <span style={{ color: '#92400e' }}><strong>{warnCount}</strong> row{warnCount === 1 ? '' : 's'} with warnings — still importable, just flagged below</span>}
              </div>

              <div className="card table-wrap" style={{ padding: 0, marginBottom: 16, maxHeight: 420, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Row</th><th>Vehicle</th><th>VIN</th><th>Match</th>
                      <th>Purchase</th><th>Sold</th><th>Gross</th><th>Buyer</th><th>Warnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.rowNum}</td>
                        <td style={{ fontWeight: 600 }}>{r.year} {r.make} {r.model}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.vin || '—'}</td>
                        <td>
                          <span className="badge" style={r.matchedVehicleId ? { background: '#dbeafe', color: '#1e40af' } : { background: '#dcfce7', color: '#065f46' }}>
                            {r.matchedVehicleId ? 'Update' : 'New'}
                          </span>
                        </td>
                        <td>{r.purchasePrice != null ? `$${r.purchasePrice.toLocaleString()}` : '—'}</td>
                        <td>{r.soldPrice != null ? `$${r.soldPrice.toLocaleString()}` : '—'}</td>
                        <td style={{ color: r.soldGross == null ? undefined : r.soldGross < 0 ? '#991b1b' : '#065f46', fontWeight: 700 }}>
                          {r.soldGross != null ? `$${r.soldGross.toLocaleString()}` : '—'}
                        </td>
                        <td>{r.matchedBuyerName || r.buyerInternalName || '—'}</td>
                        <td style={{ fontSize: 11, color: '#92400e', maxWidth: 260 }}>{r.warnings.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => { setRows([]); setError(''); }} disabled={importing}>Choose different file</button>
                <button className="btn-navy" onClick={handleImport} disabled={importing}>
                  {importing ? 'Importing…' : `Import ${rows.length} rows`}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
