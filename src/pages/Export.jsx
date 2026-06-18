import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { USERS } from '../context/AuthContext';

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

  if (user.role !== 'wholesale' && user.role !== 'gm' && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const vehicles = data.vehicles;
  const awarded = vehicles.filter(v => v.status === 'awarded');
  const noSale = vehicles.filter(v => v.status === 'no_sale');
  const active = vehicles.filter(v => !['awarded','no_sale'].includes(v.status));

  const totalInvested = vehicles.reduce((s, v) => s + fmt(v.totalCost), 0);
  const totalRecovered = awarded.reduce((s, v) => s + (v.winningBid || 0), 0);
  const totalMargin = totalRecovered - awarded.reduce((s, v) => s + fmt(v.totalCost), 0);

  const handleExport = () => {
    const XLSX = window.XLSX;
    if (!XLSX) { alert('Spreadsheet engine not loaded. Refresh and try again.'); return; }
    setExporting(true);

    const wb = XLSX.utils.book_new();

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

    // ── Sheet 2: Auction Results (Awarded) ──
    const awardRows = [
      ['MAG ACQUISITION — AUCTION RESULTS (AWARDED)', '', '', '', '', '', '', '', '', ''],
      [`Exported: ${fmtDate(new Date().toISOString())}`, '', '', '', '', '', '', '', '', ''],
      [],
      ['VIN', 'Year', 'Make', 'Model', 'Color', 'Mileage', 'Total Cost Basis', 'Floor Price', 'Winning Bid', 'Winner Store', 'Gross Margin $', 'Margin %', 'Award Date', 'Title Status'],
      ...awarded.map(v => {
        const margin = (v.winningBid || 0) - fmt(v.totalCost);
        const marginPct = fmt(v.totalCost) > 0 ? Math.round((margin / fmt(v.totalCost)) * 100) : 0;
        return [
          v.vin || '', v.year || '', v.make || '', v.model || '', v.color || '',
          v.mileage ? parseInt(v.mileage) : '',
          fmt(v.totalCost), fmt(v.floorPrice), v.winningBid || 0,
          v.winnerName || '', margin, `${marginPct}%`,
          fmtDate(v.awardedAt), v.titleStatus || '',
        ];
      }),
      [],
      ['', '', '', '', '', 'TOTALS →',
        awarded.reduce((s,v)=>s+fmt(v.totalCost),0), '',
        awarded.reduce((s,v)=>s+(v.winningBid||0),0), '',
        totalMargin, `${awarded.length > 0 ? Math.round((totalMargin / awarded.reduce((s,v)=>s+fmt(v.totalCost),0)) * 100) : 0}%`,
      ],
    ];
    const wsAward = XLSX.utils.aoa_to_sheet(awardRows);
    wsAward['!cols'] = [22,6,10,14,10,10,16,12,14,14,14,10,14,14].map(w => ({ wch: w }));
    wsAward['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
    XLSX.utils.book_append_sheet(wb, wsAward, '2. Auction Results');

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
      ['VIN', 'Year', 'Make', 'Model', 'Title Status', 'Title Notes', 'Vehicle Status', 'Winner Store', 'Date Added'],
      ...vehicles.map(v => [
        v.vin || '', v.year || '', v.make || '', v.model || '',
        v.titleStatus || 'pending', v.titleNotes || '',
        v.status || '', v.winnerName || '',
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
      ['Vehicle', 'VIN', 'Destination Store', 'Winning Bid', 'Awarded', 'Dispatched', 'In Transit', 'Arrived', 'Title Received', 'Notes'],
      ...data.transport.map(t => {
        const v = vehicles.find(vv => vv.id === t.vehicleId);
        return [
          t.vehicleName || '', v?.vin || '', t.storeName || '', t.winningBid || 0,
          fmtDate(t.steps?.awarded), fmtDate(t.steps?.dispatched),
          fmtDate(t.steps?.inTransit), fmtDate(t.steps?.arrived),
          fmtDate(t.steps?.titleReceived), t.notes || '',
        ];
      }),
    ];
    const wsTrans = XLSX.utils.aoa_to_sheet(transRows);
    wsTrans['!cols'] = [24,22,16,14,14,14,14,14,14,30].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsTrans, '5. Transport Log');

    // ── Sheet 6: P&L Summary ──
    const plRows = [
      ['MAG ACQUISITION — P&L SUMMARY', ''],
      [`As of ${fmtDate(new Date().toISOString())}`, ''],
      [],
      ['INVENTORY SUMMARY', ''],
      ['Total vehicles acquired', vehicles.length],
      ['Currently in stock', active.length],
      ['Awarded / sold', awarded.length],
      ['No sale', noSale.length],
      [],
      ['FINANCIALS', ''],
      ['Total cost invested (all vehicles)', totalInvested],
      ['Total cost (awarded only)', awarded.reduce((s,v)=>s+fmt(v.totalCost),0)],
      ['Total winning bids received', totalRecovered],
      ['Gross margin $', totalMargin],
      ['Gross margin %', awarded.reduce((s,v)=>s+fmt(v.totalCost),0) > 0 ? `${Math.round((totalMargin / awarded.reduce((s,v)=>s+fmt(v.totalCost),0)) * 100)}%` : '0%'],
      [],
      ['BY STORE', '', '', ''],
      ['Store', 'Cars Won', 'Total Spend', 'Avg Per Car'],
      ...['SAG','KIA','CLR','MIL','MAR'].map(sid => {
        const wins = awarded.filter(v => v.winnerId === sid);
        const spend = wins.reduce((s,v)=>s+(v.winningBid||0),0);
        const store = USERS.find(u => u.id === sid);
        return [store?.name || sid, wins.length, spend, wins.length > 0 ? Math.round(spend/wins.length) : 0];
      }),
      [],
      ['AUCTION HISTORY', ''],
      ['#', 'Label', 'Opened', 'Closed', 'Vehicles', 'Awarded', 'No Sale', 'Volume'],
      ...(data.auctionHistory || []).map((h, i) => [
        i+1, h.label || '', fmtDate(h.openDate), fmtDate(h.closedDate),
        h.vehicleCount || 0, h.awardedCount || 0, h.noSaleCount || 0, h.totalVolume || 0,
      ]),
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
          <div className="stat-label">Awarded</div>
          <div className="stat-value" style={{ color: '#065f46' }}>{awarded.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total cost invested</div>
          <div className="stat-value" style={{ fontSize: 18 }}>${totalInvested.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total recovered</div>
          <div className="stat-value" style={{ fontSize: 18 }}>${totalRecovered.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Gross margin</div>
          <div className="stat-value" style={{ fontSize: 18, color: totalMargin >= 0 ? '#065f46' : '#991b1b' }}>${totalMargin.toLocaleString()}</div>
        </div>
      </div>

      {/* What's included */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>What's included in the export</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {[
            ['1. Current Inventory', 'All vehicles in stock — VIN, specs, cost basis, floor price, status, location, title'],
            ['2. Auction Results', 'Every awarded vehicle — winning bid, store, margin, award date'],
            ['3. No Sales', 'Vehicles that didn\'t sell — cost basis and floor for reference'],
            ['4. Title Ledger', 'Title status on every vehicle — pending, in transit, on hand, liens'],
            ['5. Transport Log', 'Full delivery timeline — dispatched, in transit, arrived, title received dates'],
            ['6. P&L Summary', 'Total invested, recovered, margin by store, auction history'],
          ].map(([title, desc]) => (
            <div key={title} style={{ background: '#f5f6f8', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1a3d76', marginBottom: 4 }}>{title}</div>
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
