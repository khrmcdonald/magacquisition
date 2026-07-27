import React from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const DEFAULT_OVERHEAD = 60000;
const ROC_MIN_DAYS = 7;

const fmt$ = (n) => `$${Math.round(n || 0).toLocaleString()}`;
const daysBetween = (a, b) => {
  if (!a || !b) return null;
  const d = (new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000;
  return d >= 0 ? d : null;
};
const daysSince = (a) => {
  if (!a) return null;
  return Math.floor((Date.now() - new Date(a + 'T12:00:00')) / 86400000);
};

export default function BuyerDetail() {
  const { buyerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data } = useData();

  if (user.role !== 'wholesale' && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const vehicles = data.vehicles || [];
  const monthlyOverhead = data.orgSettings?.monthlyOverhead ?? DEFAULT_OVERHEAD;

  const verifiedUnits = vehicles.filter(v => v.status === 'sold' && v.soldPrice != null);
  const cutoff30 = new Date(Date.now() - 30 * 86400000);
  const trailingUnits = verifiedUnits.filter(v => v.soldDate && new Date(v.soldDate + 'T12:00:00') >= cutoff30);
  const overheadPerUnit = monthlyOverhead / Math.max(trailingUnits.length, 1);

  const myUnits = vehicles.filter(v => v.buyer_id === buyerId);
  // Look up by profile first (works for any role, not just 'wholesale'), fall
  // back to the name stored on their own vehicles if the profile is gone.
  const buyer = (data.profiles || []).find(p => p.id === buyerId)
    || (myUnits[0] ? { name: myUnits[0].buyer_name } : null);
  const closedUnits = myUnits.filter(v => v.status === 'sold' && v.soldPrice != null)
    .sort((a, b) => new Date(b.soldDate || 0) - new Date(a.soldDate || 0));
  const openUnits = myUnits.filter(v => v.status !== 'sold')
    .sort((a, b) => new Date(b.datePurchased || b.createdAt || 0) - new Date(a.datePurchased || a.createdAt || 0));

  const capitalDeployed = closedUnits.reduce((s, v) => s + (parseFloat(v.purchasePrice) || 0), 0);
  const capitalOpen = openUnits.reduce((s, v) => s + (parseFloat(v.purchasePrice) || 0), 0);
  const avgGross = closedUnits.length ? closedUnits.reduce((s, v) => s + (parseFloat(v.soldGross) || 0), 0) / closedUnits.length : null;
  const turnDaysList = closedUnits.map(v => daysBetween(v.datePurchased, v.soldDate)).filter(d => d != null);
  const avgDays = turnDaysList.length ? turnDaysList.reduce((s, d) => s + d, 0) / turnDaysList.length : null;

  const unitROC = (v) => {
    const days = daysBetween(v.datePurchased, v.soldDate);
    const purchase = parseFloat(v.purchasePrice);
    const gross = parseFloat(v.soldGross);
    if (!days || !purchase || Number.isNaN(gross)) return null;
    return (gross / purchase) * (30 / Math.max(days, ROC_MIN_DAYS));
  };
  const rocs = closedUnits.map(unitROC).filter(r => r != null);
  const avgROC = rocs.length ? rocs.reduce((s, r) => s + r, 0) / rocs.length : null;
  const belowBreakeven = closedUnits.filter(v => (parseFloat(v.soldGross) || 0) < overheadPerUnit).length;
  const pctBelow = closedUnits.length ? Math.round((belowBreakeven / closedUnits.length) * 100) : null;

  const label = (v) => `${v.year} ${v.make} ${v.model}${v.trim ? ' ' + v.trim : ''}`;
  const sourceName = (v) => (data.acquisition_sources || []).find(s => s.id === v.sourceId)?.name || '—';

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate('/performance')} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          ← All buyers
        </button>
      </div>
      <div className="page-header">
        <h1>{buyer?.name || 'Unknown buyer'}</h1>
        <p>Every dollar this buyer has deployed, closed and open — same green/red rule as the desk view</p>
      </div>

      {/* Summary */}
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Closed units</div>
          <div className="stat-value">{closedUnits.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Capital deployed (closed)</div>
          <div className="stat-value">{fmt$(capitalDeployed)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Capital open (still held)</div>
          <div className="stat-value">{fmt$(capitalOpen)}</div>
          <div className="stat-sub">{openUnits.length} unit{openUnits.length === 1 ? '' : 's'} not yet sold</div>
        </div>
        <div className="stat-card" style={{ borderTopColor: avgGross == null ? undefined : avgGross < 0 ? '#991b1b' : '#065f46' }}>
          <div className="stat-label">Avg gross</div>
          <div className="stat-value" style={{ color: avgGross == null ? undefined : avgGross < 0 ? '#991b1b' : '#065f46' }}>
            {avgGross != null ? fmt$(avgGross) : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg days to turn</div>
          <div className="stat-value">{avgDays != null ? `${avgDays.toFixed(1)}d` : '—'}</div>
        </div>
        <div className="stat-card" style={{ borderTopColor: avgROC == null ? undefined : avgROC < 0 ? '#991b1b' : '#065f46' }}>
          <div className="stat-label">Return on capital</div>
          <div className="stat-value" style={{ color: avgROC == null ? undefined : avgROC < 0 ? '#991b1b' : '#065f46' }}>
            {avgROC != null ? `${(avgROC * 100).toFixed(0)}%` : '—'}
          </div>
        </div>
      </div>

      {/* Open positions */}
      {openUnits.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: '28px 0 12px' }}>Open positions — capital still tied up</div>
          <div className="card table-wrap" style={{ padding: 0, marginBottom: 24 }}>
            <table>
              <thead><tr><th>Vehicle</th><th>Status</th><th>Purchase price</th><th>Purchased</th><th>Days held</th></tr></thead>
              <tbody>
                {openUnits.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{label(v)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{(v.status || '').replace('_', ' ')}</td>
                    <td>{fmt$(v.purchasePrice)}</td>
                    <td>{v.datePurchased || '—'}</td>
                    <td>{v.datePurchased ? `${daysSince(v.datePurchased)}d` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Closed units */}
      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: '28px 0 12px' }}>Closed sales</div>
      <div className="card table-wrap" style={{ padding: 0, marginBottom: 24 }}>
        {closedUnits.length === 0 ? (
          <div className="empty-state"><p>No closed, verified sales yet for this buyer</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Vehicle</th><th>Source</th><th>Purchase</th><th>Sold</th>
                <th>Days to turn</th><th>Gross</th><th>ROC</th>
              </tr>
            </thead>
            <tbody>
              {closedUnits.map(v => {
                const days = daysBetween(v.datePurchased, v.soldDate);
                const gross = parseFloat(v.soldGross) || 0;
                const roc = unitROC(v);
                return (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{label(v)}</td>
                    <td>{sourceName(v)}</td>
                    <td>{fmt$(v.purchasePrice)}<div style={{ fontSize: 11, color: '#9ca3af' }}>{v.datePurchased || '—'}</div></td>
                    <td>{fmt$(v.soldPrice)}<div style={{ fontSize: 11, color: '#9ca3af' }}>{v.soldDate || '—'}</div></td>
                    <td>{days != null ? `${days}d` : '—'}</td>
                    <td style={{ color: gross < 0 ? '#991b1b' : '#065f46', fontWeight: 700 }}>{fmt$(gross)}</td>
                    <td style={{ color: roc == null ? undefined : roc < 0 ? '#991b1b' : '#065f46', fontWeight: 700 }}>
                      {roc != null ? `${(roc * 100).toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: -14 }}>
        {pctBelow != null && `${pctBelow}% of this buyer's closed units came in below the ${fmt$(overheadPerUnit)}/unit needed to cover overhead right now.`}
      </div>
    </div>
  );
}
