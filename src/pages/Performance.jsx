import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import MonthPaceChart, { computeMonthPace } from '../components/MonthPaceChart';

const RESERVE_FEE = 350;
const DEFAULT_OVERHEAD = 60000;

const fmt$ = (n) => `$${Math.round(n || 0).toLocaleString()}`;
const daysBetween = (a, b) => {
  if (!a || !b) return null;
  const d = (new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000;
  return d >= 0 ? d : null;
};

export default function Performance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    data, saveOrgSettings, addReserveClaim, deleteReserveClaim,
  } = useData();

  const [overheadInput, setOverheadInput] = useState(null);
  const [overheadSaved, setOverheadSaved] = useState(false);
  const [claimForm, setClaimForm] = useState({ vehicleId: '', amount: '', reason: '', claimDate: new Date().toISOString().slice(0, 10) });
  const [claimSaving, setClaimSaving] = useState(false);
  const [claimError, setClaimError] = useState(null);

  useEffect(() => {
    const prefillId = location.state?.prefillVehicleId;
    if (prefillId) setClaimForm(f => ({ ...f, vehicleId: prefillId }));
  }, [location.state]);

  if (user.role !== 'wholesale' && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const vehicles = data.vehicles || [];
  const monthlyOverhead = data.orgSettings?.monthlyOverhead ?? DEFAULT_OVERHEAD;
  const overheadValue = overheadInput ?? monthlyOverhead;

  const soldUnits = vehicles.filter(v => v.status === 'sold');
  const verifiedUnits = soldUnits.filter(v => v.soldPrice != null);

  // ── Break-even pace (this calendar month) ──────────────────────────────
  const pace = computeMonthPace(verifiedUnits, monthlyOverhead);
  const avgGrossMTD = pace.unitsMTD ? pace.actualToday / pace.unitsMTD : 0;

  // ── Dynamic overhead-per-unit (trailing 30 days of verified sold volume) ──
  const cutoff30 = new Date(Date.now() - 30 * 86400000);
  const trailingUnits = verifiedUnits.filter(v => v.soldDate && new Date(v.soldDate + 'T12:00:00') >= cutoff30);
  const overheadPerUnit = monthlyOverhead / Math.max(trailingUnits.length, 1);

  // Return on capital = plain return on the money used to buy this specific
  // car (gross ÷ purchase price), scaled to "if we did trades like this all
  // month, what would $1 turn into." No overhead subtracted here — a car
  // that made money always shows a positive number. Whether it covered its
  // share of overhead is a separate question, answered by "% below
  // breakeven" further down, not by this sign.
  //
  // Median days-to-turn here is ~3 days, so annualizing (the textbook way to
  // do this) inflates every fast trade into a triple-digit percentage that
  // doesn't mean anything to anyone — $850 on a 3-day flip becomes "253%"
  // annualized, which is mathematically fine and practically unreadable.
  // Scaling to a month instead keeps the same idea (speed matters, not just
  // size) in numbers a person can actually judge. The holding period is
  // still floored at a week so a 1-day flip doesn't dominate the average.
  const ROC_MIN_DAYS = 7;
  const unitROC = (v) => {
    const days = daysBetween(v.datePurchased, v.soldDate);
    const purchase = parseFloat(v.purchasePrice);
    const gross = parseFloat(v.soldGross);
    if (!days || !purchase || Number.isNaN(gross)) return null;
    return (gross / purchase) * (30 / Math.max(days, ROC_MIN_DAYS));
  };

  // ── Buyer scorecards ────────────────────────────────────────────────────
  // Built from whoever actually has cars tied to them (buyer_id on a
  // vehicle), not from data.buyers — that list is filtered to role
  // 'wholesale' and silently drops anyone who buys cars under a different
  // role (e.g. an admin who's also acquiring). A name tied to a dollar
  // deployed should show up here regardless of their login role.
  const buyerIds = [...new Set(verifiedUnits.map(v => v.buyer_id).filter(Boolean))];
  const buyerRows = buyerIds.map(id => {
    const units = verifiedUnits.filter(v => v.buyer_id === id);
    const profile = (data.profiles || []).find(p => p.id === id);
    const name = profile?.name || units[0]?.buyer_name || 'Unnamed';
    const capitalDeployed = units.reduce((s, v) => s + (parseFloat(v.purchasePrice) || 0), 0);
    const avgGross = units.length ? units.reduce((s, v) => s + (parseFloat(v.soldGross) || 0), 0) / units.length : null;
    const turnDays = units.map(v => daysBetween(v.datePurchased, v.soldDate)).filter(d => d != null);
    const avgDays = turnDays.length ? turnDays.reduce((s, d) => s + d, 0) / turnDays.length : null;
    const rocs = units.map(unitROC).filter(r => r != null);
    const avgROC = rocs.length ? rocs.reduce((s, r) => s + r, 0) / rocs.length : null;
    const belowBreakeven = units.filter(v => (parseFloat(v.soldGross) || 0) < overheadPerUnit).length;
    const pctBelow = units.length ? Math.round((belowBreakeven / units.length) * 100) : null;
    return { id, name, units: units.length, capitalDeployed, avgGross, avgDays, avgROC, pctBelow };
  }).filter(r => r.units > 0)
    .sort((a, b) => (b.avgGross || 0) - (a.avgGross || 0));

  const totalsRow = {
    units: verifiedUnits.length,
    capitalDeployed: verifiedUnits.reduce((s, v) => s + (parseFloat(v.purchasePrice) || 0), 0),
    avgGross: verifiedUnits.length ? verifiedUnits.reduce((s, v) => s + (parseFloat(v.soldGross) || 0), 0) / verifiedUnits.length : null,
    avgDays: (() => {
      const d = verifiedUnits.map(v => daysBetween(v.datePurchased, v.soldDate)).filter(x => x != null);
      return d.length ? d.reduce((s, x) => s + x, 0) / d.length : null;
    })(),
    avgROC: (() => {
      const r = verifiedUnits.map(unitROC).filter(x => x != null);
      return r.length ? r.reduce((s, x) => s + x, 0) / r.length : null;
    })(),
    pctBelow: verifiedUnits.length ? Math.round((verifiedUnits.filter(v => (parseFloat(v.soldGross) || 0) < overheadPerUnit).length / verifiedUnits.length) * 100) : null,
  };

  // ── Source leaderboard ──────────────────────────────────────────────────
  const sourceRows = (data.acquisition_sources || []).map(s => {
    const units = verifiedUnits.filter(v => v.sourceId === s.id);
    const avgGross = units.length ? units.reduce((sum, v) => sum + (parseFloat(v.soldGross) || 0), 0) / units.length : null;
    return { id: s.id, name: s.name, units: units.length, avgGross };
  }).filter(r => r.units > 0)
    .sort((a, b) => (b.avgGross || 0) - (a.avgGross || 0));
  const totalVerified = verifiedUnits.length;

  // ── Reserve ledger ──────────────────────────────────────────────────────
  const reserveClaims = data.reserveClaims || [];
  const collected = soldUnits.length * RESERVE_FEE;
  const claimed = reserveClaims.reduce((s, c) => s + (c.amount || 0), 0);
  const reserveBalance = collected - claimed;

  const handleSaveOverhead = async () => {
    try {
      await saveOrgSettings({ ...data.orgSettings, monthlyOverhead: parseFloat(overheadValue) || DEFAULT_OVERHEAD });
      setOverheadSaved(true);
      setTimeout(() => setOverheadSaved(false), 2000);
    } catch (e) {
      setClaimError('Failed to save overhead: ' + e.message);
    }
  };

  const handleAddClaim = async (e) => {
    e.preventDefault();
    if (!claimForm.amount) return;
    setClaimSaving(true);
    setClaimError(null);
    try {
      await addReserveClaim({
        amount: claimForm.amount,
        reason: claimForm.reason,
        vehicleId: claimForm.vehicleId || null,
        claimDate: claimForm.claimDate,
        createdBy: user.name || user.email,
      });
      setClaimForm({ vehicleId: '', amount: '', reason: '', claimDate: new Date().toISOString().slice(0, 10) });
    } catch (err) {
      setClaimError('Failed to save claim: ' + err.message);
    } finally {
      setClaimSaving(false);
    }
  };

  const vehicleLabel = (v) => `${v.year} ${v.make} ${v.model}${v.soldDate ? ` — sold ${v.soldDate}` : ''}`;

  return (
    <div>
      <div className="page-header">
        <h1>Desk Performance</h1>
        <p>Return on capital, buyer accountability, and pace to break-even — not gross per unit</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button className="btn-secondary" onClick={() => navigate('/performance/import')} style={{ fontSize: 12 }}>
          Import historical sales data
        </button>
      </div>

      {/* Break-even pace */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Pace to break-even — this month</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ margin: 0, textTransform: 'none', fontSize: 12 }}>Monthly overhead</label>
            <input
              type="number"
              value={overheadValue}
              onChange={e => setOverheadInput(e.target.value)}
              style={{ width: 110 }}
            />
            <button className="btn-secondary" onClick={handleSaveOverhead} style={{ padding: '7px 12px', fontSize: 12 }}>
              {overheadSaved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>
          The <strong>solid line</strong> is what we've actually made this month (sale price minus purchase price, added up as sales close).
          The <strong>dashed line</strong> is what we need to make, spread evenly across the month, to cover our ${monthlyOverhead.toLocaleString()} overhead.
          {' '}Solid line above dashed = <span style={{ color: '#065f46', fontWeight: 700 }}>green, ahead of pace</span>.
          Below = <span style={{ color: '#991b1b', fontWeight: 700 }}>red, behind pace</span>. That's the whole read.
        </p>
        <MonthPaceChart vehicles={verifiedUnits} monthlyOverhead={monthlyOverhead} />
        <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em' }}>Units sold MTD</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#374151' }}>{pace.unitsMTD}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em' }}>Avg gross / unit MTD</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#374151' }}>{fmt$(avgGrossMTD)}</div>
          </div>
        </div>
      </div>

      {/* Buyer scorecards */}
      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: '28px 0 12px' }}>Buyer scorecards</div>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px', lineHeight: 1.5, maxWidth: 720 }}>
        <strong>Avg gross</strong> is simple: green means that buyer's cars made money on average, red means they lost money. <strong>Return on capital</strong> answers "if we kept doing trades like this all month, what would $1 turn into" — same money as gross, just accounting for how fast it came back, so a quick small win and a slow big win can be compared fairly. It always has the same sign as gross: green is a gain, red is a loss.
        {' '}<strong>% below breakeven</strong> is a different question — of the cars that made money, how many still didn't make *enough* to cover this buyer's share of the ${monthlyOverhead.toLocaleString()}/month it costs to run the desk. A car can be green (profitable) and still count here.
        {' '}Click any buyer to see every individual car behind their numbers.
      </p>
      <div className="card table-wrap" style={{ padding: 0, marginBottom: 8 }}>
        {buyerRows.length === 0 ? (
          <div className="empty-state"><p>No verified sales yet</p><span>Scorecards populate as sales get recorded with a price.</span></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Buyer</th><th>Units</th><th>Capital deployed</th><th>Avg gross</th>
                <th>Days to turn</th><th>Return on capital</th><th>% below breakeven</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#f9fafb' }}>
                <td style={{ fontWeight: 800 }}>Total — whole desk</td>
                <td style={{ fontWeight: 700 }}>{totalsRow.units}</td>
                <td style={{ fontWeight: 700 }}>{fmt$(totalsRow.capitalDeployed)}</td>
                <td style={{ color: totalsRow.avgGross == null ? undefined : totalsRow.avgGross < 0 ? '#991b1b' : '#065f46', fontWeight: 800 }}>
                  {totalsRow.avgGross != null ? fmt$(totalsRow.avgGross) : '—'}
                </td>
                <td style={{ fontWeight: 700 }}>{totalsRow.avgDays != null ? `${totalsRow.avgDays.toFixed(1)}d` : '—'}</td>
                <td style={{ color: totalsRow.avgROC == null ? undefined : totalsRow.avgROC < 0 ? '#991b1b' : '#065f46', fontWeight: 800 }}>
                  {totalsRow.avgROC != null ? `${(totalsRow.avgROC * 100).toFixed(0)}%` : '—'}
                </td>
                <td style={{ fontWeight: 700 }}>{totalsRow.pctBelow != null ? `${totalsRow.pctBelow}%` : '—'}</td>
              </tr>
              {buyerRows.map(r => (
                <tr key={r.id} onClick={() => navigate(`/performance/buyer/${r.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600, color: '#0d2550' }}>{r.name} →</td>
                  <td>{r.units}</td>
                  <td>{fmt$(r.capitalDeployed)}</td>
                  <td style={{ color: r.avgGross == null ? undefined : r.avgGross < 0 ? '#991b1b' : '#065f46', fontWeight: 700 }}>
                    {r.avgGross != null ? fmt$(r.avgGross) : '—'}
                  </td>
                  <td>{r.avgDays != null ? `${r.avgDays.toFixed(1)}d` : '—'}</td>
                  <td style={{ color: r.avgROC == null ? undefined : r.avgROC < 0 ? '#991b1b' : '#065f46', fontWeight: 700 }}>
                    {r.avgROC != null ? `${(r.avgROC * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td>{r.pctBelow != null ? `${r.pctBelow}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: -4, marginBottom: 24 }}>
        A car needs to average {fmt$(overheadPerUnit)} in gross to pay for its share of overhead right now (${monthlyOverhead.toLocaleString()}/month ÷ {trailingUnits.length || 1} cars sold in the last 30 days). That's the cutoff used for "% below breakeven" — it's separate from the green/red on Avg gross and ROC, which just track whether the car made or lost money.
      </div>

      {/* Source leaderboard */}
      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: '28px 0 12px' }}>Source leaderboard</div>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px', lineHeight: 1.5, maxWidth: 720 }}>
        Where we're buying, and whether cars from that source made or lost money once sold. Green = made money, red = lost money.
      </p>
      <div className="card table-wrap" style={{ padding: 0, marginBottom: 24 }}>
        {sourceRows.length === 0 ? (
          <div className="empty-state"><p>No verified sales yet</p></div>
        ) : (
          <table>
            <thead><tr><th>Source</th><th>Units</th><th>% of volume</th><th>Avg gross</th></tr></thead>
            <tbody>
              {sourceRows.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r.units}</td>
                  <td>{totalVerified ? `${Math.round((r.units / totalVerified) * 100)}%` : '—'}</td>
                  <td style={{ color: r.avgGross != null && r.avgGross < 0 ? '#991b1b' : '#065f46', fontWeight: 700 }}>
                    {r.avgGross != null ? fmt$(r.avgGross) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reserve fund ledger */}
      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: '28px 0 12px' }}>$350 contingency reserve</div>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px', lineHeight: 1.5, maxWidth: 720 }}>
        Every unit sold sets aside $350 into a fund that covers surprises found after the sale — an undisclosed mechanical issue, an arbitration loss. This isn't profit or loss, it's self-insurance. The balance below is what's left after claims; green means the fund is healthy, red means claims have outpaced what's been collected.
      </p>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Collected</div>
            <div className="stat-value">{fmt$(collected)}</div>
            <div className="stat-sub">{soldUnits.length} units sold × ${RESERVE_FEE}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Claims paid</div>
            <div className="stat-value">{fmt$(claimed)}</div>
            <div className="stat-sub">{reserveClaims.length} claim{reserveClaims.length === 1 ? '' : 's'}</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: reserveBalance >= 0 ? '#065f46' : '#991b1b' }}>
            <div className="stat-label">Balance</div>
            <div className="stat-value" style={{ color: reserveBalance >= 0 ? '#065f46' : '#991b1b' }}>{fmt$(reserveBalance)}</div>
          </div>
        </div>

        {claimError && <div className="alert alert-error">{claimError}</div>}

        {/* Add claim form */}
        <form onSubmit={handleAddClaim} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 10, alignItems: 'end', marginBottom: 20 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Amount</label>
            <input type="number" step="0.01" value={claimForm.amount} onChange={e => setClaimForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Date</label>
            <input type="date" value={claimForm.claimDate} onChange={e => setClaimForm(f => ({ ...f, claimDate: e.target.value }))} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Vehicle (optional)</label>
            <select value={claimForm.vehicleId} onChange={e => setClaimForm(f => ({ ...f, vehicleId: e.target.value }))}>
              <option value="">— General / not unit-specific —</option>
              {[...soldUnits].sort((a, b) => new Date(b.soldDate || 0) - new Date(a.soldDate || 0)).map(v => (
                <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-navy" disabled={claimSaving} style={{ height: 39 }}>
            {claimSaving ? 'Saving…' : 'Log claim'}
          </button>
          <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
            <label>Reason</label>
            <input type="text" value={claimForm.reason} onChange={e => setClaimForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. undisclosed transmission issue, arbitration loss" />
          </div>
        </form>

        {/* Claims list */}
        <div className="table-wrap">
          {reserveClaims.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}><p>No claims logged</p></div>
          ) : (
            <table>
              <thead><tr><th>Date</th><th>Vehicle</th><th>Reason</th><th>Amount</th><th></th></tr></thead>
              <tbody>
                {reserveClaims.map(c => {
                  const v = vehicles.find(vv => vv.id === c.vehicleId);
                  return (
                    <tr key={c.id}>
                      <td>{c.claimDate}</td>
                      <td>{v ? `${v.year} ${v.make} ${v.model}` : '—'}</td>
                      <td>{c.reason || '—'}</td>
                      <td style={{ color: '#991b1b', fontWeight: 700 }}>{fmt$(c.amount)}</td>
                      <td>
                        <button
                          onClick={() => deleteReserveClaim(c.id).catch(e => setClaimError('Failed to delete: ' + e.message))}
                          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 12 }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* All vehicles */}
      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: '28px 0 12px' }}>All vehicles</div>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px', lineHeight: 1.5, maxWidth: 720 }}>
        Every vehicle in the system regardless of status — the full picture behind the numbers above.
      </p>
      <div className="card table-wrap" style={{ padding: 0 }}>
        {vehicles.length === 0 ? (
          <div className="empty-state"><p>No vehicles yet</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Vehicle</th><th>Condition</th><th>Miles</th><th>Status</th><th>Cost basis</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => {
                const statusMap = {
                  intake: { label: 'Intake', bg: '#f3f4f6', color: '#6b7280' },
                  recon: { label: 'In Recon', bg: '#fef3c7', color: '#92400e' },
                  ready: { label: 'Ready', bg: '#d1fae5', color: '#065f46' },
                  sold: { label: 'Sold', bg: '#d1fae5', color: '#065f46' },
                };
                const st = statusMap[v.status] || statusMap.intake;
                return (
                  <tr key={v.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{v.year} {v.make} {v.model}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{v.trim} · {v.color}</div>
                    </td>
                    <td><span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{v.condition}</span></td>
                    <td>{v.mileage ? `${parseInt(v.mileage).toLocaleString()} mi` : '—'}</td>
                    <td><span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{st.label}</span></td>
                    <td style={{ fontWeight: 600, color: '#1a3d76' }}>{v.totalCost ? fmt$(v.totalCost) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
