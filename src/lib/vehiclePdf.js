// Single-page vehicle record PDFs (Intake = bought, Outtake = sold).
// Uses jsPDF loaded from CDN in public/index.html (window.jspdf.jsPDF).

const COMPANY = 'Tri-State Wholesale';

// Brand palette (matches the app's navy/gold theme).
const NAVY = [26, 61, 118];
const GOLD = [241, 187, 37];
const INK = [17, 24, 39];
const GRAY = [107, 114, 128];
const LINE = [229, 231, 235];
const SOFT = [245, 246, 248];
const GREEN = [6, 95, 70];
const RED = [153, 27, 27];

function getJsPDF() {
  const ns = window.jspdf;
  return ns && ns.jsPDF ? ns.jsPDF : null;
}

function money(v) {
  const n = parseFloat(v);
  if (v === '' || v === null || v === undefined || isNaN(n)) return '—';
  return '$' + n.toLocaleString('en-US');
}

function odometer(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? '—' : n.toLocaleString('en-US') + ' mi';
}

function text(v) {
  return v !== null && v !== undefined && String(v).trim() !== '' ? String(v) : '—';
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function vehicleTitle(v) {
  return [v.year, v.make, v.model].filter(Boolean).join(' ') + (v.trim ? ` ${v.trim}` : '');
}

function safeFileToken(s) {
  return String(s || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

// --- low-level drawing helpers ---

function drawLabel(doc, str, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(String(str).toUpperCase(), x, y, { charSpace: 0.5 });
}

function drawValue(doc, str, x, y, size = 12, color = INK) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(String(str), x, y);
}

function sectionHeader(doc, str, x, y, right) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(String(str).toUpperCase(), x, y, { charSpace: 0.8 });
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2);
  doc.line(x, y + 6, x + 26, y + 6);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.75);
  doc.line(x + 34, y + 3, right, y + 3);
}

// A two-up field block (label over value). cols = [{label, value}, ...]
function fieldRow(doc, items, xs, y) {
  items.forEach((it, i) => {
    if (!it) return;
    drawLabel(doc, it.label, xs[i], y);
    drawValue(doc, it.value, xs[i], y + 16, it.size || 12, it.color || INK);
  });
}

function signatureBlock(doc, role, name, x, y, width) {
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.75);
  doc.line(x, y, x + width, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(role, x, y + 13);
  if (name && name !== '—') {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(name, x, y - 6);
  }
}

// Core renderer shared by both document types.
function renderDoc(v, cfg) {
  const JsPDF = getJsPDF();
  if (!JsPDF) {
    alert('PDF engine not loaded yet. Please refresh the page and try again.');
    return;
  }

  const doc = new JsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 54;
  const colX = [margin, margin + 268];
  const rightEdge = pageW - margin;

  // ── Header band ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 104, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text('MAG ACQUISITION', margin, 42, { charSpace: 1.5 });
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(cfg.title, margin, 72);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text(cfg.subtitle, margin, 90);

  // Document date (top-right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(cfg.dateLabel.toUpperCase(), rightEdge, 60, { align: 'right', charSpace: 0.5 });
  doc.setFontSize(11);
  doc.text(cfg.dateValue, rightEdge, 78, { align: 'right' });

  let y = 150;

  // ── Vehicle headline ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(vehicleTitle(v) || 'Vehicle', margin, y);

  // VIN chip
  y += 22;
  const vin = text(v.vin);
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  const vinW = doc.getTextWidth(vin) + 20;
  doc.setFillColor(232, 238, 245);
  doc.roundedRect(margin, y - 12, vinW, 20, 4, 4, 'F');
  doc.setTextColor(...NAVY);
  doc.text(vin, margin + 10, y + 2);

  // ── Vehicle details ──
  y += 40;
  sectionHeader(doc, 'Vehicle Details', margin, y, rightEdge);
  y += 26;
  fieldRow(doc, [
    { label: 'Make / Model', value: text([v.make, v.model].filter(Boolean).join(' ') || null) },
    { label: 'Model Year', value: text(v.year) },
  ], colX, y);
  y += 48;
  fieldRow(doc, [
    { label: 'Color', value: text(v.color) },
    { label: 'Odometer', value: odometer(v.mileage) },
  ], colX, y);
  y += 48;
  fieldRow(doc, [
    { label: 'Condition', value: text(v.condition) },
    { label: 'Title Status', value: cfg.titleLabel },
  ], colX, y);

  // ── Transaction ──
  y += 44;
  sectionHeader(doc, cfg.txnHeader, margin, y, rightEdge);
  y += 26;
  fieldRow(doc, [
    { label: 'Seller', value: cfg.sellerName },
    { label: 'Buyer', value: cfg.buyerName },
  ], colX, y);
  y += 48;
  fieldRow(doc, cfg.txnMeta, colX, y);

  // ── Price box ──
  y += 36;
  const boxH = cfg.priceRows.length > 1 ? 92 : 70;
  doc.setFillColor(...SOFT);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, rightEdge - margin, boxH, 8, 8, 'F');

  // Primary price (left, large)
  drawLabel(doc, cfg.priceRows[0].label, margin + 18, y + 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...NAVY);
  doc.text(cfg.priceRows[0].value, margin + 18, y + 56);

  // Secondary rows (right side, stacked)
  const sx = margin + 300;
  let sy = y + 26;
  cfg.priceRows.slice(1).forEach((r) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text(r.label, sx, sy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...(r.color || INK));
    doc.text(r.value, rightEdge - 18, sy, { align: 'right' });
    sy += 22;
  });

  y += boxH + 28;

  // ── Notes (optional) ──
  if (v.notes && String(v.notes).trim()) {
    sectionHeader(doc, 'Notes', margin, y, rightEdge);
    y += 22;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const wrapped = doc.splitTextToSize(String(v.notes).trim(), rightEdge - margin);
    doc.text(wrapped.slice(0, 4), margin, y + 4);
    y += Math.min(wrapped.length, 4) * 14 + 18;
  }

  // ── Signatures ──
  const sigY = 720;
  const sigW = 220;
  signatureBlock(doc, cfg.sigLeftRole, cfg.sigLeftName, margin, sigY, sigW);
  signatureBlock(doc, cfg.sigRightRole, cfg.sigRightName, rightEdge - sigW, sigY, sigW);

  // ── Footer ──
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.75);
  doc.line(margin, 752, rightEdge, 752);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(`${COMPANY} · MAG Acquisition · Confidential`, margin, 766);
  doc.text(`Generated ${fmtDate(new Date().toISOString())}`, rightEdge, 766, { align: 'right' });

  doc.save(cfg.fileName);
}

export function downloadIntakePdf(v) {
  const totalCost = parseFloat(v.totalCost);
  const priceRows = [{ label: 'Purchase price', value: money(v.purchasePrice) }];
  if (!isNaN(totalCost) && totalCost > 0) {
    priceRows.push({ label: 'Total cost basis', value: money(v.totalCost) });
    if (v.floorPrice) priceRows.push({ label: 'Suggested floor', value: money(v.floorPrice) });
  }

  renderDoc(v, {
    title: 'Vehicle Intake Record',
    subtitle: 'Purchase / acquisition',
    dateLabel: 'Date acquired',
    dateValue: fmtDate(v.createdAt),
    titleLabel: text(titleStatusLabel(v.titleStatus)),
    txnHeader: 'Acquisition',
    sellerName: text(v.source),
    buyerName: COMPANY,
    txnMeta: [
      { label: 'Source / channel', value: text(v.source) },
      { label: 'Date acquired', value: fmtDate(v.createdAt) },
    ],
    priceRows,
    sigLeftRole: 'Seller signature & date',
    sigLeftName: text(v.source),
    sigRightRole: 'Received by',
    sigRightName: COMPANY,
    fileName: `Intake_${safeFileToken(v.vin || vehicleTitle(v))}.pdf`,
  });
}

export function downloadOuttakePdf(v) {
  const totalCost = parseFloat(v.totalCost);
  const sale = parseFloat(v.winningBid);
  const priceRows = [{ label: 'Sale price (winning bid)', value: money(v.winningBid) }];
  if (!isNaN(totalCost) && totalCost > 0) {
    priceRows.push({ label: 'Total cost basis', value: money(v.totalCost) });
    if (!isNaN(sale)) {
      const margin = sale - totalCost;
      priceRows.push({
        label: 'Gross margin',
        value: (margin < 0 ? '-$' : '$') + Math.abs(margin).toLocaleString('en-US'),
        color: margin >= 0 ? GREEN : RED,
      });
    }
  }

  renderDoc(v, {
    title: 'Vehicle Outtake Record',
    subtitle: 'Sale / award',
    dateLabel: 'Date sold',
    dateValue: fmtDate(v.awardedAt),
    titleLabel: text(titleStatusLabel(v.titleStatus)),
    txnHeader: 'Sale',
    sellerName: COMPANY,
    buyerName: text(v.winnerName),
    txnMeta: [
      { label: 'Buyer store', value: text(v.winnerName) },
      { label: 'Date sold', value: fmtDate(v.awardedAt) },
    ],
    priceRows,
    sigLeftRole: 'Released by',
    sigLeftName: COMPANY,
    sigRightRole: 'Buyer signature & date',
    sigRightName: text(v.winnerName),
    fileName: `Outtake_${safeFileToken(v.vin || vehicleTitle(v))}.pdf`,
  });
}

const TITLE_LABELS = {
  pending: 'Pending',
  in_transit: 'Title in Transit',
  on_hand: 'On Hand',
  lien: 'Lien – Payoff Needed',
  missing: 'Missing / Issue',
  transferred: 'Transferred Out',
};

function titleStatusLabel(value) {
  return TITLE_LABELS[value] || TITLE_LABELS.pending;
}
