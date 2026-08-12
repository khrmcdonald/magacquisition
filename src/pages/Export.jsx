import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

function fmt(val) { return val ? parseFloat(val) : 0; }
function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Export() {
  const { user } = useAuth();
  const { data } = useData();
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  if (user.role !== 'wholesale' && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const vehicles = data.vehicles;
  const sold = vehicles.filter(v => v.status === 'sold');
  const noSale = vehicles.filter(v => v.status === 'no_sale');
  const active = vehicles.filter(v => v.status !== 'sold');

  const totalInvested = vehicles.reduce((s, v) => s + fmt(v.totalCost), 0);
  const totalRecovered = sold.reduce((s, v) => s + fmt(v.soldPrice), 0);
  const totalMargin = sold.reduce((s, v) => s + fmt(v.soldGross), 0);

  const handleExport = () => {
    const XLSX = window.XLSX;
    if (!XLSX) { alert('Spreadsheet engine not loaded. Refresh and try again.'); return; }
    setExporting(true);

    const wb = XLSX.utils.book_new();
    const navy = '1a3d76', gold = 'f1bb25', white = 'FFFFFF';

    const headerStyle = { font: { bold: true, color: { rgb: white }, sz: 11 }, fill: { fgColor: { rgb: navy } }, alignment: { horizontal: 'center' }, border: { bottom: { style: 'thin' } } };
    const subHeaderStyle = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: 'f0f4fb' } } };

    // ── Sheet 1: Current Inventory ──
    const invRows = [
      ['MAG ACQUISITION — CURRENT INVENTORY', '', '', '', '', '', '', '', '', '', '', ''],
      [`Exported: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, '', '', '', '', '', '', '', '', '', '', ''],
      [],
      ['VIN', 'Year', 'Make', 'Model', 'Trim', 'Color', 'Mileage', 'Source', 'Condition', 'Purchase Price', 'Overhead', 'Recon Costs', 'Total Cost Basis', 'Floor Price', 'Status', 'Location', 'Title Status', 'Title Notes', 'Notes', 'Date Added'],
      ...active.map(v => [
        v.vin || '', v.year || '', v.make || '', v.model || '', v.trim || '', v.color || '',
        v.mileage ? parseInt(v.mileage) : '',
        v.source || '', v.condition || '',
        fmt(v.purchasePrice), fmt(v.overheadCosts),
        Object.values(v.reconCosts || {}).reduce((s, c) => s + fmt(c), 0),
        fmt(v.totalCost), fmt(v.floorPrice),
        v.status || '', v.currentLocation || '',
        v.titleStatus || '', v.titleNotes || '', v.notes || '',
        fmtDate(v.createdAt),
      ]),
      [],
      ['', '', '', '', '', '', '', '', 'TOTALS →', active.reduce((s,v)=>s+fmt(v.purchasePrice),0), active.reduce((s,v)=>s+fmt(v.overheadCosts),0), active.reduce((s,v)=>s+Object.values(v.reconCosts||{}).reduce((ss,c)=>ss+fmt(c),0),0), active.reduce((s,v)=>s+fmt(v.totalCost),0)],
    ];
    const wsInv = XLSX.utils.aoa_to_sheet(invRows);
    wsInv['!cols'] = [22,6,10,14,10,10,10,14,12,14,12,12,16,12,14,14,14,20,30,14].map(w => ({ wch: w }));
    wsInv['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }];
    XLSX.utils.book_append_sheet(wb, wsInv, '1. Current Inventory');

    // ── Sheet 2: Sold Vehicles ──
    const soldCostTotal = sold.reduce((s,v)=>s+fmt(v.totalCost),0);
    const soldRows = [
      ['STOCKYARD — SOLD VEHICLES', '', '', '', '', '', '', '', '', ''],
      [`Exported: ${fmtDate(new Date().toISOString())}`, '', '', '', '', '', '', '', '', ''],
      [],
      ['VIN', 'Year', 'Make', 'Model', 'Color', 'Mileage', 'Total Cost Basis', 'Sale Price', 'Buyer', 'Gross Margin $', 'Margin %', 'Sale Date', 'Title Status'],
      ...sold.map(v => {
        const margin = fmt(v.soldGross);
        const marginPct = fmt(v.totalCost) > 0 ? Math.round((margin / fmt(v.totalCost)) * 100) : 0;
        return [
          v.vin || '', v.year || '', v.make || '', v.model || '', v.color || '',
          v.mileage ? parseInt(v.mileage) : '',
          fmt(v.totalCost), fmt(v.soldPrice),
          v.soldTo || '', margin, `${marginPct}%`,
          fmtDate(v.soldDate), v.titleStatus || '',
        ];
      }),
      [],
      ['', '', '', '', '', 'TOTALS →',
        soldCostTotal, totalRecovered, '',
        totalMargin, `${soldCostTotal > 0 ? Math.round((totalMargin / soldCostTotal) * 100) : 0}%`,
      ],
    ];
    const wsSold = XLSX.utils.aoa_to_sheet(soldRows);
    wsSold['!cols'] = [22,6,10,14,10,10,16,14,14,14,10,14,14].map(w => ({ wch: w }));
    wsSold['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
    XLSX.utils.book_append_sheet(wb, wsSold, '2. Sold Vehicles');

    // ── Sheet 3: No Sales ──
    const noSaleRows = [
      ['MAG ACQUISITION — NO SALES', '', '', '', '', '', ''],
      [],
      ['VIN', 'Year', 'Make', 'Model', 'Color', 'Mileage', 'Total Cost Basis', 'Floor Price', 'Notes'],
      ...noSale.map(v => [
        v.vin || '', v.year || '', v.make || '', v.model || '', v.color || '',
        v.mileage ? parseInt(v.mileage) : '',
        fmt(v.totalCost), fmt(v.floorPrice), v.notes || '',
      ]),
    ];
    const wsNoSale = XLSX.utils.aoa_to_sheet(noSaleRows);
    wsNoSale['!cols'] = [22,6,10,14,10,10,16,12,30].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsNoSale, '3. No Sales');

    // ── Sheet 4: Title Status ──
    const titleRows = [
      ['MAG ACQUISITION — TITLE LEDGER', '', '', '', '', '', ''],
      [],
      ['VIN', 'Year', 'Make', 'Model', 'Title Status', 'Title Notes', 'Vehicle Status', 'Buyer', 'Date Added'],
      ...vehicles.map(v => [
        v.vin || '', v.year || '', v.make || '', v.model || '',
        v.titleStatus || 'pending', v.titleNotes || '',
        v.status || '', v.soldTo || '',
        fmtDate(v.createdAt),
      ]),
    ];
    const wsTitle = XLSX.utils.aoa_to_sheet(titleRows);
    wsTitle['!cols'] = [22,6,10,14,16,24,14,14,14].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsTitle, '4. Title Ledger');

    // ── Sheet 5: Transport Log ──
    const transRows = [
      ['MAG ACQUISITION — TRANSPORT LOG', '', '', '', '', '', '', ''],
      [],
      ['Vehicle', 'VIN', 'Destination', 'Awarded', 'Dispatched', 'In Transit', 'Arrived', 'Title Received', 'Notes'],
      ...data.transport.map(t => {
        const v = vehicles.find(vv => vv.id === t.vehicleId);
        return [
          t.vehicleName || '', v?.vin || '', t.storeName || '',
          fmtDate(t.steps?.awarded), fmtDate(t.steps?.dispatched),
          fmtDate(t.steps?.inTransit), fmtDate(t.steps?.arrived),
          fmtDate(t.steps?.titleReceived), t.notes || '',
        ];
      }),
    ];
    const wsTrans = XLSX.utils.aoa_to_sheet(transRows);
    wsTrans['!cols'] = [24,22,16,14,14,14,14,14,30].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsTrans, '5. Transport Log');

    // ── Sheet 6: P&L Summary ──
    const plRows = [
      ['MAG ACQUISITION — P&L SUMMARY', ''],
      [`As of ${fmtDate(new Date().toISOString())}`, ''],
      [],
      ['INVENTORY SUMMARY', ''],
      ['Total vehicles acquired', vehicles.length],
      ['Currently in stock', active.length],
      ['Sold', sold.length],
      ['No sale', noSale.length],
      [],
      ['FINANCIALS', ''],
      ['Total cost invested (all vehicles)', totalInvested],
      ['Total cost (sold only)', soldCostTotal],
      ['Total sale price received', totalRecovered],
      ['Gross margin $', totalMargin],
      ['Gross margin %', soldCostTotal > 0 ? `${Math.round((totalMargin / soldCostTotal) * 100)}%` : '0%'],
    ];

    const wsPL = XLSX.utils.aoa_to_sheet(plRows);
    wsPL['!cols'] = [32, 20, 16, 14].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsPL, '6. P&L Summary');

    // Export
    XLSX.writeFile(wb, `MAG_Accounting_Export_${new Date().toISOString().substring(0,10)}.xlsx`);
    setExporting(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Accounting Export</h1>
        <p>Generate a complete Excel workbook for your accounting department</p>
      </div>

      {/* Summary cards */}
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Total vehicles</div>
          <div className="stat-value">{vehicles.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In stock</div>
          <div className="stat-value">{active.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Sold</div>
          <div className="stat-value" style={{ color: '#065f46' }}>{sold.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total cost invested</div>
          <div className="stat-value">${totalInvested.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total recovered</div>
          <div className="stat-value">${totalRecovered.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Gross margin</div>
          <div className="stat-value" style={{ color: totalMargin >= 0 ? '#065f46' : '#991b1b' }}>${totalMargin.toLocaleString()}</div>
        </div>
      </div>

      {/* What's included */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>What's included in the export</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {[
            ['1. Current Inventory', 'All vehicles in stock — VIN, specs, cost basis, floor price, status, location, title'],
            ['2. Sold Vehicles', 'Every sold vehicle — sale price, buyer, margin, sale date'],
            ['3. No Sales', 'Vehicles that didn\'t sell — cost basis and floor for reference'],
            ['4. Title Ledger', 'Title status on every vehicle — pending, in transit, on hand, liens'],
            ['5. Transport Log', 'Full delivery timeline — dispatched, in transit, arrived, title received dates'],
            ['6. P&L Summary', 'Total invested, recovered, and gross margin across all sold vehicles'],
          ].map(([title, desc]) => (
            <div key={title} style={{ background: '#f5f6f8', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0d2550', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Export button */}
      <div style={{ textAlign: 'center', padding: '32px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Ready to export</h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
          Downloads as <strong>MAG_Accounting_Export_{new Date().toISOString().substring(0,10)}.xlsx</strong>
        </p>
        <button
          onClick={handleExport}
          disabled={exporting || vehicles.length === 0}
          className="btn-navy"
          style={{ padding: '14px 40px', fontSize: 16, fontWeight: 700, opacity: vehicles.length === 0 ? 0.5 : 1 }}
        >
          {exporting ? 'Generating...' : done ? '✅ Downloaded!' : '📥 Download Excel export'}
        </button>
        {vehicles.length === 0 && (
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 12 }}>Add vehicles to acquisitions first</p>
        )}
      </div>
    </div>
  );
}
