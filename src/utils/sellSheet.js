// Buyer Release Form / Sell Sheet generator.
//
// Produces a single-page, print-ready document that summarizes everything the
// manager receiving a sold vehicle at the new location needs: vehicle identity,
// the sale, where it's coming from and going to, title status, reconditioning,
// notes, transport progress, and a sign-off line.
//
// It is dependency-free: the document is rendered as standalone HTML in a new
// window and the browser's print dialog is opened, where the user chooses
// "Save as PDF" to get a downloadable file. The print stylesheet pins it to one
// Letter page.
//
// Privacy: this sheet is handed to the buyer's store, so it shows the agreed
// sale price (what they paid) but never TRI-STATE's internal cost basis, recon
// spend, floor price, or margin — matching the rule applied everywhere a store
// can see a vehicle.

const TITLE_LABELS = {
  pending: 'Pending',
  in_transit: 'Title in Transit',
  on_hand: 'On Hand',
  lien: 'Lien — Payoff Needed',
  missing: 'Missing / Issue',
  transferred: 'Transferred Out',
};

const OUT_STEPS = [
  { key: 'awarded', label: 'Awarded' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'inTransit', label: 'In Transit' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'titleReceived', label: 'Title Received' },
];

const ORIGIN = 'Arbor Plaza';

function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtMoney(n) {
  const num = Number(n);
  if (!isFinite(num) || !num) return '—';
  return '$' + num.toLocaleString();
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function row(label, value) {
  return `<tr><th>${esc(label)}</th><td>${value || '—'}</td></tr>`;
}

function buildSellSheetHTML(vehicle, transport) {
  const v = vehicle || {};
  const t = transport || null;
  const title = v.year && v.make ? `${v.year} ${v.make} ${v.model || ''}`.trim() : (v.model || 'Vehicle');
  const subtitle = [v.trim, v.color].filter(Boolean).join(' · ');
  const photo = v.photos && v.photos[0];

  const saleType = v.saleType === 'direct' ? 'Direct Sale' : 'Auction';
  const titleLabel = TITLE_LABELS[v.titleStatus || 'pending'] || TITLE_LABELS.pending;
  const awaitingTitle = t ? !t.steps?.titleReceived : !['on_hand', 'transferred'].includes(v.titleStatus || 'pending');

  const recon = (v.reconItems || []).map(r => `<span class="chip">${esc(r)}</span>`).join('');

  // Transport progress — show each step and the date it was reached.
  const currentIdx = t ? OUT_STEPS.findIndex(s => s.key === t.status) : -1;
  const steps = OUT_STEPS.map((s, i) => {
    const done = t && i <= currentIdx;
    const stamp = t && t.steps && t.steps[s.key] ? fmtDate(t.steps[s.key]) : '';
    return `<div class="step ${done ? 'done' : ''}">
      <div class="dot">${done ? '✓' : ''}</div>
      <div class="step-label">${esc(s.label)}</div>
      <div class="step-date">${esc(stamp)}</div>
    </div>`;
  }).join('<div class="step-line"></div>');

  const generated = fmtDate(new Date().toISOString());
  const docTitle = `Sell Sheet — ${title}${v.vin ? ' (' + v.vin + ')' : ''}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(docTitle)}</title>
<style>
  @page { size: letter portrait; margin: 0.5in; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #111827; font-size: 12px; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { max-width: 7.5in; margin: 0 auto; padding: 4px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a3d76; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #1a3d76; }
  .doc-type { font-size: 19px; font-weight: 800; color: #111827; margin: 2px 0 0; }
  .meta { text-align: right; font-size: 10.5px; color: #6b7280; }
  .meta .badge { display: inline-block; background: #d1fae5; color: #065f46; font-weight: 700; padding: 3px 10px; border-radius: 20px; font-size: 11px; }
  .vehicle { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
  .vehicle img { width: 150px; height: 108px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; flex-shrink: 0; }
  .vehicle .ph { width: 150px; height: 108px; border-radius: 8px; background: #f0f4f8; display: flex; align-items: center; justify-content: center; font-size: 40px; flex-shrink: 0; }
  .vehicle h1 { font-size: 22px; margin: 0; }
  .vehicle .sub { color: #6b7280; font-size: 13px; margin-top: 2px; }
  .vehicle .vin { font-family: monospace; font-size: 12px; background: #e8eef5; color: #1a3d76; padding: 3px 10px; border-radius: 6px; display: inline-block; margin-top: 6px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; break-inside: avoid; }
  .card h2 { font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: #1a3d76; margin: 0 0 8px; font-weight: 800; }
  table.kv { width: 100%; border-collapse: collapse; }
  table.kv th { text-align: left; font-weight: 600; color: #6b7280; padding: 2px 8px 2px 0; vertical-align: top; white-space: nowrap; width: 38%; }
  table.kv td { padding: 2px 0; font-weight: 600; color: #111827; }
  .price { font-size: 20px; font-weight: 800; color: #1a3d76; }
  .pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .pill.warn { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
  .pill.title { background: #dbeafe; color: #1e40af; }
  .chip { display: inline-block; background: #eef2f6; color: #374151; border: 1px solid #e5e7eb; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; margin: 0 5px 5px 0; }
  .full { grid-column: 1 / -1; }
  .notes { font-size: 12px; color: #374151; }
  .track { display: flex; align-items: flex-start; margin: 4px 0; }
  .step { display: flex; flex-direction: column; align-items: center; width: 84px; text-align: center; }
  .step .dot { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #e5e7eb; background: #f3f4f6; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
  .step.done .dot { background: #1a3d76; border-color: #1a3d76; }
  .step-label { font-size: 10px; font-weight: 600; color: #6b7280; margin-top: 4px; }
  .step.done .step-label { color: #1a3d76; }
  .step-date { font-size: 9px; color: #9ca3af; margin-top: 1px; min-height: 11px; }
  .step-line { flex: 1; height: 2px; background: #e5e7eb; margin-top: 11px; }
  .signoff { display: flex; gap: 40px; margin-top: 22px; padding-top: 14px; border-top: 1px solid #e5e7eb; break-inside: avoid; }
  .sig { flex: 1; }
  .sig .line { border-bottom: 1px solid #111827; height: 26px; }
  .sig .cap { font-size: 10px; color: #6b7280; margin-top: 4px; }
  .footer { margin-top: 18px; font-size: 9.5px; color: #9ca3af; text-align: center; }
  .toolbar { text-align: center; margin: 10px 0 18px; }
  .toolbar button { background: #1a3d76; color: #fff; border: none; padding: 9px 22px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
  @media print { .toolbar { display: none; } }
</style>
</head>
<body>
<div class="sheet">
  <div class="toolbar"><button onclick="window.print()">⬇ Download / Print PDF</button></div>

  <div class="head">
    <div>
      <div class="brand">MAG Acquisition</div>
      <div class="doc-type">Buyer Release Form &middot; Sell Sheet</div>
    </div>
    <div class="meta">
      <div class="badge">SOLD &middot; ${esc(saleType)}</div>
      <div style="margin-top:6px;">Generated ${esc(generated)}</div>
    </div>
  </div>

  <div class="vehicle">
    ${photo ? `<img src="${esc(photo)}" alt="" />` : `<div class="ph">🚗</div>`}
    <div>
      <h1>${esc(title)}</h1>
      ${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ''}
      ${v.vin ? `<div class="vin">VIN ${esc(v.vin)}</div>` : ''}
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Vehicle Details</h2>
      <table class="kv">
        ${row('Year', esc(v.year))}
        ${row('Make', esc(v.make))}
        ${row('Model', esc(v.model))}
        ${row('Trim', esc(v.trim))}
        ${row('Mileage', v.mileage ? esc(parseInt(v.mileage, 10).toLocaleString()) + ' mi' : '')}
        ${row('Color', esc(v.color))}
        ${row('Condition', esc(v.condition))}
      </table>
    </div>

    <div class="card">
      <h2>Sale &amp; Delivery</h2>
      <table class="kv">
        ${row('Sale type', esc(saleType))}
        ${row('Buyer', `<strong>${esc(v.winnerName || (t && t.storeName) || '—')}</strong>`)}
        ${row('Sale date', esc(fmtDate(v.awardedAt)))}
        ${row('From', esc(ORIGIN))}
        ${row('To', esc(v.winnerName || (t && t.storeName) || ''))}
      </table>
      <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:baseline;">
        <span style="font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; font-weight:700;">Sale price</span>
        <span class="price">${fmtMoney(v.winningBid)}</span>
      </div>
    </div>

    <div class="card">
      <h2>Title</h2>
      <div>
        <span class="pill title">${esc(titleLabel)}</span>
        ${awaitingTitle ? `<span class="pill warn" style="margin-left:6px;">⏳ Awaiting title</span>` : ''}
      </div>
      ${v.titleNotes ? `<div class="notes" style="margin-top:8px;">${esc(v.titleNotes)}</div>` : ''}
    </div>

    <div class="card">
      <h2>Reconditioning &amp; Repairs</h2>
      ${recon || v.reconNotes
        ? `${recon ? `<div>${recon}</div>` : ''}${v.reconNotes ? `<div class="notes" style="margin-top:6px;">${esc(v.reconNotes)}</div>` : ''}`
        : `<div class="notes" style="color:#9ca3af;">None recorded.</div>`}
    </div>

    ${v.notes ? `<div class="card full"><h2>Notes</h2><div class="notes">${esc(v.notes)}</div></div>` : ''}

    <div class="card full">
      <h2>Transport Progress</h2>
      <div class="track">${steps}</div>
      ${t && t.notes ? `<div class="notes" style="margin-top:8px;">📝 ${esc(t.notes)}</div>` : ''}
    </div>
  </div>

  <div class="signoff">
    <div class="sig"><div class="line"></div><div class="cap">Received by (print name &amp; sign)</div></div>
    <div class="sig"><div class="line"></div><div class="cap">Date received</div></div>
    <div class="sig"><div class="line"></div><div class="cap">Odometer on arrival</div></div>
  </div>

  <div class="footer">
    This Buyer Release Form confirms the above vehicle has been sold and released for delivery. Verify VIN, mileage, and condition on receipt.
  </div>
</div>
<script>
  window.addEventListener('load', function () { setTimeout(function () { try { window.print(); } catch (e) {} }, 350); });
</script>
</body>
</html>`;
}

// Open the sell sheet in a new window and trigger the print/save dialog.
export function openSellSheet(vehicle, transport) {
  const html = buildSellSheetHTML(vehicle, transport);
  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow pop-ups for this site to download the sell sheet.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
