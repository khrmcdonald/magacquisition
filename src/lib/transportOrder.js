// One-page printable transport order — handed to the driver at pickup.
// Deliberately omits price/gross; this is a logistics document, not a deal record.
export function printTransportOrder({ vehicle: v, mileage, destName, destAddress, driver }) {
  const photo = Array.isArray(v.photos) && v.photos[0] ? v.photos[0] : null;
  const keys = v.keys?.available != null && v.keys?.total != null ? `${v.keys.available}/${v.keys.total}` : '—';

  const html = `<!DOCTYPE html>
<html>
<head>
<title>Transport Order – ${v.year || ''} ${v.make || ''} ${v.model || ''}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 40px; }
  .header { text-align: center; border-bottom: 2px solid #1a3d76; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #1a3d76; letter-spacing: .05em; }
  .header .sub { font-size: 12px; color: #666; margin-top: 4px; }
  .top { display: flex; gap: 24px; margin-bottom: 24px; }
  .photo { width: 260px; height: 195px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; flex-shrink: 0; }
  .photo-placeholder { width: 260px; height: 195px; border-radius: 6px; border: 1px solid #e5e7eb; background: #f3f4f6; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 13px; flex-shrink: 0; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #1a3d76; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .field { display: flex; flex-direction: column; }
  .field .lbl { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 2px; }
  .field .val { font-weight: 600; font-size: 13px; }
  .vin { font-family: monospace; font-size: 15px; font-weight: 700; letter-spacing: .08em; }
  .destination { background: #f0f4fb; border: 1px solid #c7d6ef; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; }
  .destination .name { font-size: 18px; font-weight: 800; color: #1a3d76; }
  .destination .address { font-size: 15px; margin-top: 4px; }
  .signoff { display: flex; gap: 40px; margin-top: 40px; }
  .signoff .line { flex: 1; border-top: 1px solid #999; padding-top: 6px; font-size: 11px; color: #666; }
  .footer { margin-top: 32px; font-size: 11px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="header">
  <h1>TRANSPORT ORDER</h1>
  <div class="sub">Printed ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
</div>

<div class="top">
  ${photo ? `<img class="photo" src="${photo}" alt="" />` : `<div class="photo-placeholder">No photo</div>`}
  <div style="flex:1">
    <div class="section-title">Vehicle</div>
    <div class="grid">
      <div class="field" style="grid-column:1/-1"><div class="lbl">VIN</div><div class="val vin">${v.vin || '—'}</div></div>
      <div class="field"><div class="lbl">Year / Make / Model</div><div class="val">${v.year || ''} ${v.make || ''} ${v.model || ''}</div></div>
      <div class="field"><div class="lbl">Trim</div><div class="val">${v.trim || '—'}</div></div>
      <div class="field"><div class="lbl">Color</div><div class="val">${[v.color, v.interior_color].filter(Boolean).join(' / ') || '—'}</div></div>
      <div class="field"><div class="lbl">Mileage</div><div class="val">${mileage != null ? parseInt(mileage).toLocaleString() + ' mi' : '—'}</div></div>
      <div class="field"><div class="lbl">Condition</div><div class="val">${v.condition || '—'}</div></div>
      <div class="field"><div class="lbl">Key Fobs</div><div class="val">${keys}</div></div>
    </div>
  </div>
</div>

<div class="destination">
  <div class="lbl" style="font-size:10px;color:#5b7bb0;text-transform:uppercase;letter-spacing:.06em">Deliver To</div>
  <div class="name">${destName || '—'}</div>
  ${destAddress ? `<div class="address">${destAddress}</div>` : ''}
</div>

<div class="section">
  <div class="section-title">Driver</div>
  <div class="grid">
    <div class="field"><div class="lbl">Assigned Driver</div><div class="val">${driver || '—'}</div></div>
    <div class="field"><div class="lbl">Pickup Date</div><div class="val">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></div>
  </div>
</div>

${v.disclosure_notes ? `<div class="section"><div class="section-title">Notes</div><div style="font-size:13px;line-height:1.5">${v.disclosure_notes}</div></div>` : ''}

<div class="signoff">
  <div class="line">Driver Signature</div>
  <div class="line">Delivered Date</div>
  <div class="line">Received By</div>
</div>

<div class="footer">
  <span>Internal Use Only</span>
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
}
