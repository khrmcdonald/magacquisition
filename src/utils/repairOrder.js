// Repair Order / Work Authorization generator.
//
// Produces a single-page, print-ready work order for a vehicle that has been
// sent out for repair. It pulls together the vehicle, the chosen shop, exactly
// what work is requested, the estimate / PO, and the drop-off & pickup logistics,
// finishing with authorization sign-off lines for both parties.
//
// Like the sell sheet, it is dependency-free: the document is rendered as
// standalone HTML in a new window and the browser's print dialog is opened, where
// the user chooses "Save as PDF". The print stylesheet pins it to one Letter page.
//
// This is an internal shop document, so it freely shows the estimate and PO —
// only ever generated from internal (wholesale/GM/admin) screens.

const REPAIR_STEPS = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'droppedOff', label: 'Dropped off' },
  { key: 'pickedUp', label: 'Picked up' },
  { key: 'returned', label: 'Back at lot' },
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

// A stable-ish RO number derived from the send date + a slice of the vehicle id.
function roNumber(vehicle) {
  const datePart = (vehicle.repair?.sentAt || '').slice(0, 10).replace(/-/g, '');
  const idPart = String(vehicle.id || '').replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase();
  return `RO-${datePart || '00000000'}-${idPart || '0000'}`;
}

function buildRepairOrderHTML(vehicle, vendor, transport) {
  const v = vehicle || {};
  const r = v.repair || {};
  const vn = vendor || {};
  const t = transport || null;

  const title = v.year && v.make ? `${v.year} ${v.make} ${v.model || ''}`.trim() : (v.model || 'Vehicle');
  const subtitle = [v.trim, v.color].filter(Boolean).join(' · ');
  const photo = v.photos && v.photos[0];

  const completed = r.status === 'completed';
  const statusLabel = completed ? 'COMPLETED' : 'IN REPAIR';
  const ro = roNumber(v);
  const generated = fmtDate(new Date().toISOString());

  // Drop-off / pickup logistics from the repair trip, if one exists.
  const droppedOff = t && t.steps ? t.steps.droppedOff : null;
  const pickedUp = t && t.steps ? t.steps.pickedUp : null;

  const poBadge = vn.poRequired
    ? `<span class="pill warn">📋 PO required${r.poNumber ? ` · ${esc(r.poNumber)}` : ''}</span>`
    : (r.poNumber ? `<span class="pill">PO ${esc(r.poNumber)}</span>` : '');

  const docTitle = `Repair Order — ${title}${v.vin ? ' (' + v.vin + ')' : ''}`;

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
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #9a3412; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #9a3412; }
  .doc-type { font-size: 19px; font-weight: 800; color: #111827; margin: 2px 0 0; }
  .meta { text-align: right; font-size: 10.5px; color: #6b7280; }
  .meta .badge { display: inline-block; background: #ffedd5; color: #9a3412; font-weight: 700; padding: 3px 10px; border-radius: 20px; font-size: 11px; }
  .meta .ro { font-family: monospace; font-weight: 700; color: #111827; margin-top: 6px; }
  .vehicle { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
  .vehicle img { width: 150px; height: 108px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; flex-shrink: 0; }
  .vehicle .ph { width: 150px; height: 108px; border-radius: 8px; background: #f0f4f8; display: flex; align-items: center; justify-content: center; font-size: 40px; flex-shrink: 0; }
  .vehicle h1 { font-size: 22px; margin: 0; }
  .vehicle .sub { color: #6b7280; font-size: 13px; margin-top: 2px; }
  .vehicle .vin { font-family: monospace; font-size: 12px; background: #fbeae0; color: #9a3412; padding: 3px 10px; border-radius: 6px; display: inline-block; margin-top: 6px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; break-inside: avoid; }
  .card h2 { font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: #9a3412; margin: 0 0 8px; font-weight: 800; }
  table.kv { width: 100%; border-collapse: collapse; }
  table.kv th { text-align: left; font-weight: 600; color: #6b7280; padding: 2px 8px 2px 0; vertical-align: top; white-space: nowrap; width: 38%; }
  table.kv td { padding: 2px 0; font-weight: 600; color: #111827; }
  .price { font-size: 20px; font-weight: 800; color: #9a3412; }
  .pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #f1f5f9; color: #334155; margin: 0 5px 4px 0; }
  .pill.warn { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
  .full { grid-column: 1 / -1; }
  .work { white-space: pre-wrap; font-size: 13px; color: #111827; }
  .work-summary { font-weight: 700; color: #9a3412; margin-bottom: 6px; font-size: 13px; }
  .notes { font-size: 12px; color: #374151; }
  .muted { color: #9ca3af; }
  .track { display: flex; align-items: flex-start; margin: 4px 0; }
  .step { display: flex; flex-direction: column; align-items: center; width: 96px; text-align: center; }
  .step .dot { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #e5e7eb; background: #f3f4f6; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
  .step.done .dot { background: #9a3412; border-color: #9a3412; }
  .step-label { font-size: 10px; font-weight: 600; color: #6b7280; margin-top: 4px; }
  .step.done .step-label { color: #9a3412; }
  .step-date { font-size: 9px; color: #9ca3af; margin-top: 1px; min-height: 11px; }
  .step-line { flex: 1; height: 2px; background: #e5e7eb; margin-top: 11px; }
  .signoff { display: flex; gap: 40px; margin-top: 22px; padding-top: 14px; border-top: 1px solid #e5e7eb; break-inside: avoid; }
  .sig { flex: 1; }
  .sig .line { border-bottom: 1px solid #111827; height: 26px; }
  .sig .cap { font-size: 10px; color: #6b7280; margin-top: 4px; }
  .footer { margin-top: 18px; font-size: 9.5px; color: #9ca3af; text-align: center; }
  .toolbar { text-align: center; margin: 10px 0 18px; }
  .toolbar button { background: #9a3412; color: #fff; border: none; padding: 9px 22px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
  @media print { .toolbar { display: none; } }
</style>
</head>
<body>
<div class="sheet">
  <div class="toolbar"><button onclick="window.print()">⬇ Download / Print PDF</button></div>

  <div class="head">
    <div>
      <div class="brand">MAG Acquisition</div>
      <div class="doc-type">Repair Order &middot; Work Authorization</div>
    </div>
    <div class="meta">
      <div class="badge">🔧 ${esc(statusLabel)}</div>
      <div class="ro">${esc(ro)}</div>
      <div style="margin-top:4px;">Generated ${esc(generated)}</div>
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
      </table>
    </div>

    <div class="card">
      <h2>Repair Shop</h2>
      <table class="kv">
        ${row('Shop', `<strong>${esc(vn.name || r.vendorName || '—')}</strong>`)}
        ${row('Specialty', esc(vn.specialty))}
        ${row('Contact', esc(vn.contact))}
        ${row('Phone', esc(vn.phone))}
        ${row('Address', esc(vn.address))}
      </table>
      ${poBadge ? `<div style="margin-top:8px;">${poBadge}</div>` : ''}
    </div>

    <div class="card full">
      <h2>Work Requested</h2>
      ${r.reason ? `<div class="work-summary">${esc(r.reason)}</div>` : ''}
      ${r.details
        ? `<div class="work">${esc(r.details)}</div>`
        : (r.reason ? '' : `<div class="notes muted">No work details recorded.</div>`)}
      ${r.notes ? `<div class="notes" style="margin-top:8px;">📝 ${esc(r.notes)}</div>` : ''}
      <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:baseline; border-top:1px solid #f3f4f6; padding-top:8px;">
        <span style="font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; font-weight:700;">Estimated cost</span>
        <span class="price">${fmtMoney(r.estCost)}</span>
      </div>
      ${completed && r.actualCost ? `<div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:4px;"><span style="font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; font-weight:700;">Actual cost</span><span style="font-weight:800; color:#065f46; font-size:15px;">${fmtMoney(r.actualCost)}</span></div>` : ''}
    </div>

    <div class="card full">
      <h2>Drop-off &amp; Pickup</h2>
      <table class="kv" style="margin-bottom:8px;">
        ${row('From', esc(ORIGIN))}
        ${row('To', esc(vn.name || r.vendorName || ''))}
        ${row('Dropped off', esc(fmtDate(droppedOff)))}
        ${row('Picked up', esc(fmtDate(pickedUp)))}
      </table>
      ${t ? `<div class="track">${REPAIR_STEPS.map((s, i) => {
        const idx = REPAIR_STEPS.findIndex(x => x.key === t.status);
        const done = i <= idx;
        const stamp = t.steps && t.steps[s.key] ? fmtDate(t.steps[s.key]) : '';
        return `<div class="step ${done ? 'done' : ''}"><div class="dot">${done ? '✓' : ''}</div><div class="step-label">${esc(s.label)}</div><div class="step-date">${esc(stamp)}</div></div>`;
      }).join('<div class="step-line"></div>')}</div>` : ''}
    </div>
  </div>

  <div class="signoff">
    <div class="sig"><div class="line"></div><div class="cap">Authorized by (MAG) &amp; date</div></div>
    <div class="sig"><div class="line"></div><div class="cap">Shop accepted by &amp; date</div></div>
    <div class="sig"><div class="line"></div><div class="cap">Approved total ($)</div></div>
  </div>

  <div class="footer">
    This Repair Order authorizes the shop named above to perform the work requested on the identified vehicle. Confirm any change in scope or cost before proceeding.
  </div>
</div>
<script>
  window.addEventListener('load', function () { setTimeout(function () { try { window.print(); } catch (e) {} }, 350); });
</script>
</body>
</html>`;
}

// Open the repair order in a new window and trigger the print/save dialog.
export function openRepairOrder(vehicle, vendor, transport) {
  const html = buildRepairOrderHTML(vehicle, vendor, transport);
  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow pop-ups for this site to download the repair order.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
