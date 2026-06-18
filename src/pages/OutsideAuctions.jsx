import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const RETURN_STEPS = [
  { key: 'pending', label: 'Awaiting pickup', icon: '⏳' },
  { key: 'dispatched', label: 'Dispatched', icon: '📦' },
  { key: 'inTransit', label: 'In transit', icon: '🚚' },
  { key: 'received', label: 'Back in inventory', icon: '✅' },
];

function money(v) {
  const n = parseFloat(v);
  if (!v || isNaN(n)) return '—';
  return `$${n.toLocaleString()}`;
}
function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function daysSince(iso) {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso)) / 86400000));
}

function ListingForm({ initial, onSave, onCancel, isEdit }) {
  const [form, setForm] = useState(initial || {
    venue: '', location: '', lotNumber: '', listingPrice: '', reservePrice: '', runDate: '', notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
      <div className="form-group">
        <label>Auction / venue *</label>
        <input type="text" value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="e.g. Manheim Detroit, ADESA, eBlock" required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Location</label>
          <input type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="City / lane" />
        </div>
        <div className="form-group">
          <label>Lot / stock #</label>
          <input type="text" value={form.lotNumber} onChange={e => set('lotNumber', e.target.value)} placeholder="Lot #" />
        </div>
        <div className="form-group">
          <label>Listed / asking price *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
            <input type="number" value={form.listingPrice} onChange={e => set('listingPrice', e.target.value)} placeholder="0" style={{ paddingLeft: 24 }} required />
          </div>
        </div>
        <div className="form-group">
          <label>Reserve (optional)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
            <input type="number" value={form.reservePrice} onChange={e => set('reservePrice', e.target.value)} placeholder="0" style={{ paddingLeft: 24 }} />
          </div>
        </div>
        <div className="form-group">
          <label>Run / sale date</label>
          <input type="date" value={form.runDate} onChange={e => set('runDate', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Consignment terms, contact, lane info..." />
      </div>
      <div className="modal-footer" style={{ padding: '8px 0 0', borderTop: 'none' }}>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-navy">{isEdit ? 'Save changes' : 'Send to auction'}</button>
      </div>
    </form>
  );
}

function ReturnTracker({ ret, canUpdate, onStep, onComplete }) {
  const idx = RETURN_STEPS.findIndex(s => s.key === (ret?.status || 'pending'));
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {RETURN_STEPS.map((step, i) => {
          const done = i <= idx;
          const active = i === idx;
          const clickable = canUpdate && i !== idx;
          return (
            <React.Fragment key={step.key}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div
                  onClick={() => clickable && onStep(step.key)}
                  title={clickable ? (i < idx ? `← Back to ${step.label}` : `→ Mark ${step.label}`) : ''}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: done ? '#5b21b6' : '#f3f4f6',
                    color: done ? '#fff' : '#9ca3af',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: done ? 14 : 16, fontWeight: 700,
                    cursor: clickable ? 'pointer' : 'default',
                    border: active ? '3px solid #f1bb25' : done ? '3px solid #5b21b6' : '3px solid #e5e7eb',
                  }}
                >
                  {done ? '✓' : step.icon}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: done ? '#5b21b6' : '#9ca3af', whiteSpace: 'nowrap' }}>{step.label}</span>
                {ret?.steps?.[step.key] && (
                  <span style={{ fontSize: 9, color: '#9ca3af' }}>{fmtDate(ret.steps[step.key])}</span>
                )}
              </div>
              {i < RETURN_STEPS.length - 1 && (
                <div style={{ width: 22, height: 2, background: i < idx ? '#5b21b6' : '#e5e7eb', marginBottom: 24, flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {canUpdate && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {idx < RETURN_STEPS.length - 1 && (
            <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => onStep(RETURN_STEPS[idx + 1].key)}>
              Mark {RETURN_STEPS[idx + 1].label} {RETURN_STEPS[idx + 1].icon}
            </button>
          )}
          <button className="btn-navy" style={{ padding: '6px 14px', fontSize: 13 }} onClick={onComplete}>
            ↩ Return to inventory
          </button>
        </div>
      )}
    </div>
  );
}

export default function OutsideAuctions() {
  const { user } = useAuth();
  const {
    data, sendToOutsideAuction, updateOutsideListing, recordOutsideSale,
    markOutsideNoSale, updateOutsideReturn, completeOutsideReturn,
  } = useData();

  const [sendModal, setSendModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [saleModal, setSaleModal] = useState(null);
  const [noSaleModal, setNoSaleModal] = useState(null);
  const [returnNotes, setReturnNotes] = useState(null);

  if (!['wholesale', 'gm', 'admin'].includes(user.role)) {
    return <Navigate to="/auction" replace />;
  }
  const readOnly = user.role === 'gm';

  const vehicles = data.vehicles;
  const atAuction = vehicles.filter(v => v.status === 'at_outside_auction');
  const soldOutside = vehicles.filter(v => v.status === 'sold_outside');
  const returnedEver = vehicles.filter(v => (v.outsideAuctionHistory || []).length > 0);
  const awaitingReturn = atAuction.filter(v => v.outsideAuction?.outcome === 'not_sold');

  // Inventory eligible to send out: owned, not live/awarded/already out.
  const eligible = vehicles.filter(v => ['intake', 'recon', 'ready', 'no_sale'].includes(v.status));

  const Stat = ({ label, value, color }) => (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: color || '#111827', fontSize: 22 }}>{value}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Outside Auctions {readOnly ? '(GM View)' : ''}</h1>
          <p>Inventory consigned to external auctions — what they're listed at, whether they sell, and the logistics of getting unsold units back.</p>
        </div>
        {!readOnly && (
          <button className="btn-navy" onClick={() => setSendModal(true)}>+ Send vehicle to auction</button>
        )}
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <Stat label="At outside auction" value={atAuction.length} color="#5b21b6" />
        <Stat label="Awaiting return" value={awaitingReturn.length} color="#92400e" />
        <Stat label="Sold outside" value={soldOutside.length} color="#065f46" />
        <Stat label="Returned to inventory" value={returnedEver.reduce((s, v) => s + v.outsideAuctionHistory.length, 0)} color="#1a3d76" />
      </div>

      {/* Currently at auction */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Currently consigned</h2>
      {atAuction.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏷️</div>
          <p>No vehicles at outside auctions</p>
          {!readOnly && <span>Use "Send vehicle to auction" to consign an inventory unit</span>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {atAuction.map(v => {
            const oa = v.outsideAuction || {};
            const cost = num(v.totalCost);
            const out = daysSince(oa.sentAt);
            return (
              <div key={v.id} className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #5b21b6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    {v.photos?.[0]
                      ? <img src={v.photos[0]} alt="" style={{ width: 78, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
                      : <div style={{ width: 78, height: 56, background: '#f0f4f8', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🚗</div>}
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>{v.year} {v.make} {v.model}{v.trim ? ` · ${v.trim}` : ''}</div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
                        <strong style={{ color: '#5b21b6' }}>{oa.venue || 'Unspecified auction'}</strong>
                        {oa.location ? ` · ${oa.location}` : ''}
                        {oa.lotNumber ? ` · Lot ${oa.lotNumber}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>
                        Sent {fmtDate(oa.sentAt)}{out != null ? ` · ${out} day${out === 1 ? '' : 's'} out` : ''}
                        {oa.runDate ? ` · Runs ${fmtDate(oa.runDate)}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>Listed at</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#5b21b6' }}>{money(oa.listingPrice)}</div>
                    {oa.reservePrice ? <div style={{ fontSize: 12, color: '#6b7280' }}>Reserve {money(oa.reservePrice)}</div> : null}
                    {cost > 0 && <div style={{ fontSize: 12, color: '#6b7280' }}>Cost basis {money(cost)}</div>}
                  </div>
                </div>

                {oa.notes && (
                  <div style={{ marginTop: 12, background: '#f9fafb', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#374151', borderLeft: '3px solid #e5e7eb' }}>
                    📝 {oa.notes}
                  </div>
                )}

                {oa.outcome === 'not_sold' ? (
                  <div style={{ marginTop: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#92400e', fontSize: 13 }}>Did not sell — returning to inventory</div>
                    <ReturnTracker
                      ret={oa.return}
                      canUpdate={!readOnly}
                      onStep={(key) => updateOutsideReturn(v.id, key)}
                      onComplete={() => completeOutsideReturn(v.id)}
                    />
                    {oa.return?.notes && (
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Return notes: {oa.return.notes}</div>
                    )}
                    {!readOnly && (
                      <button onClick={() => { setReturnNotes(v); }} style={{ background: 'none', border: 'none', color: '#92400e', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', marginTop: 6, padding: 0 }}>
                        Edit return logistics (carrier / cost / notes)
                      </button>
                    )}
                  </div>
                ) : !readOnly && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 14 }} onClick={() => setSaleModal(v)}>💰 Record sale</button>
                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 14 }} onClick={() => setNoSaleModal(v)}>Did not sell</button>
                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 14 }} onClick={() => setEditModal(v)}>Edit listing</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sold outside */}
      {soldOutside.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Sold at outside auction</h2>
          <div className="card" style={{ padding: 0, marginBottom: 28 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th><th>Auction</th><th>Cost basis</th><th>Sale price</th><th>Fees</th><th>Net proceeds</th><th>Gain/Loss</th><th>Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {soldOutside.map(v => {
                    const oa = v.outsideAuction || {};
                    const net = num(oa.soldPrice) - num(oa.fees);
                    const gain = net - num(v.totalCost);
                    return (
                      <tr key={v.id}>
                        <td><div style={{ fontWeight: 600 }}>{v.year} {v.make} {v.model}</div><div style={{ fontSize: 11, color: '#6b7280' }}>{v.vin}</div></td>
                        <td style={{ fontSize: 13 }}>{oa.venue || '—'}{oa.buyer ? <div style={{ fontSize: 11, color: '#6b7280' }}>Buyer: {oa.buyer}</div> : null}</td>
                        <td>{money(v.totalCost)}</td>
                        <td style={{ fontWeight: 700, color: '#065f46' }}>{money(oa.soldPrice)}</td>
                        <td style={{ color: '#991b1b' }}>{oa.fees ? `-${money(oa.fees)}` : '—'}</td>
                        <td style={{ fontWeight: 700 }}>{money(net)}</td>
                        <td style={{ fontWeight: 700, color: gain >= 0 ? '#065f46' : '#991b1b' }}>{gain >= 0 ? '+' : '-'}${Math.abs(gain).toLocaleString()}</td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(oa.soldAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Returned history */}
      {returnedEver.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Returned to inventory (no-sale history)</h2>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Vehicle</th><th>Auction</th><th>Listed at</th><th>Sent</th><th>Returned</th><th>Current status</th></tr>
                </thead>
                <tbody>
                  {returnedEver.flatMap(v => (v.outsideAuctionHistory || []).map((h, i) => (
                    <tr key={`${v.id}_${i}`}>
                      <td><div style={{ fontWeight: 600 }}>{v.year} {v.make} {v.model}</div><div style={{ fontSize: 11, color: '#6b7280' }}>{v.vin}</div></td>
                      <td style={{ fontSize: 13 }}>{h.venue || '—'}</td>
                      <td>{money(h.listingPrice)}</td>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(h.sentAt)}</td>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(h.returnedAt)}</td>
                      <td><span style={{ background: '#ede9fe', color: '#5b21b6', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{v.status === 'at_outside_auction' ? 'Out again' : 'In inventory'}</span></td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Send modal */}
      {sendModal && (
        <SendModal eligible={eligible} onClose={() => setSendModal(false)} onSend={(id, details) => { sendToOutsideAuction(id, details); setSendModal(false); }} />
      )}

      {/* Edit listing modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>Edit listing — {editModal.year} {editModal.make} {editModal.model}</h2>
              <button onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <ListingForm
                isEdit
                initial={{
                  venue: editModal.outsideAuction?.venue || '', location: editModal.outsideAuction?.location || '',
                  lotNumber: editModal.outsideAuction?.lotNumber || '', listingPrice: editModal.outsideAuction?.listingPrice || '',
                  reservePrice: editModal.outsideAuction?.reservePrice || '', runDate: editModal.outsideAuction?.runDate || '',
                  notes: editModal.outsideAuction?.notes || '',
                }}
                onSave={(fields) => { updateOutsideListing(editModal.id, fields); setEditModal(null); }}
                onCancel={() => setEditModal(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Record sale modal */}
      {saleModal && (
        <SaleModal vehicle={saleModal} onClose={() => setSaleModal(null)} onSave={(fields) => { recordOutsideSale(saleModal.id, fields); setSaleModal(null); }} />
      )}

      {/* No-sale modal */}
      {noSaleModal && (
        <div className="modal-overlay" onClick={() => setNoSaleModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>Mark as no-sale</h2>
              <button onClick={() => setNoSaleModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: '#374151', marginBottom: 12 }}>
                <strong>{noSaleModal.year} {noSaleModal.make} {noSaleModal.model}</strong> didn't sell at {noSaleModal.outsideAuction?.venue || 'the auction'}. It will move into return logistics so you can track it back to inventory.
              </p>
              <div className="form-group">
                <label>Reason / notes (optional)</label>
                <textarea id="nosale-notes" rows={3} placeholder="No bids met reserve, pulled before lane, etc." style={{ width: '100%' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setNoSaleModal(null)}>Cancel</button>
              <button className="btn-navy" onClick={() => { markOutsideNoSale(noSaleModal.id, { notes: document.getElementById('nosale-notes').value }); setNoSaleModal(null); }}>Start return</button>
            </div>
          </div>
        </div>
      )}

      {/* Return logistics notes modal */}
      {returnNotes && (
        <ReturnNotesModal vehicle={returnNotes} onClose={() => setReturnNotes(null)} onSave={(fields) => { updateOutsideReturn(returnNotes.id, null, fields); setReturnNotes(null); }} />
      )}
    </div>
  );
}

function SendModal({ eligible, onClose, onSend }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>{selected ? `Consign ${selected.year} ${selected.make} ${selected.model}` : 'Send a vehicle to an outside auction'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>
        <div className="modal-body">
          {!selected ? (
            eligible.length === 0 ? (
              <div className="empty-state"><div style={{ fontSize: 32, marginBottom: 8 }}>📋</div><p>No eligible inventory</p><span>Only vehicles in intake, recon, ready, or no-sale can be consigned</span></div>
            ) : (
              <>
                <div className="alert alert-info" style={{ marginBottom: 16 }}>Pick an inventory vehicle to consign. Vehicles live in the internal auction or already awarded aren't eligible.</div>
                <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {eligible.map(v => (
                    <button key={v.id} onClick={() => setSelected(v)} style={{ textAlign: 'left', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#111827' }}>{v.year} {v.make} {v.model}{v.trim ? ` · ${v.trim}` : ''}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{v.vin || 'No VIN'} · {v.status}</div>
                      </div>
                      <span style={{ color: '#5b21b6', fontWeight: 700, fontSize: 13 }}>Select →</span>
                    </button>
                  ))}
                </div>
              </>
            )
          ) : (
            <ListingForm onSave={(details) => onSend(selected.id, details)} onCancel={() => setSelected(null)} />
          )}
        </div>
      </div>
    </div>
  );
}

function SaleModal({ vehicle, onClose, onSave }) {
  const [form, setForm] = useState({ soldPrice: vehicle.outsideAuction?.listingPrice || '', fees: '', buyer: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const net = num(form.soldPrice) - num(form.fees);
  const gain = net - num(vehicle.totalCost);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>Record outside sale</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>{vehicle.year} {vehicle.make} {vehicle.model} — {vehicle.outsideAuction?.venue}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Sale price *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
                <input type="number" value={form.soldPrice} onChange={e => set('soldPrice', e.target.value)} placeholder="0" style={{ paddingLeft: 24 }} />
              </div>
            </div>
            <div className="form-group">
              <label>Auction fees</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
                <input type="number" value={form.fees} onChange={e => set('fees', e.target.value)} placeholder="0" style={{ paddingLeft: 24 }} />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label>Buyer (optional)</label>
            <input type="text" value={form.buyer} onChange={e => set('buyer', e.target.value)} placeholder="Buyer name / dealer" />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
          {num(form.soldPrice) > 0 && (
            <div style={{ background: '#f0f4fb', borderRadius: 8, padding: '12px 14px', border: '1px solid #c7d6ef' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 4 }}><span>Net proceeds</span><span style={{ fontWeight: 700 }}>{money(net)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: gain >= 0 ? '#065f46' : '#991b1b' }}><span>vs. cost basis {money(vehicle.totalCost)}</span><span style={{ fontWeight: 700 }}>{gain >= 0 ? '+' : '-'}${Math.abs(gain).toLocaleString()}</span></div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-navy" onClick={() => onSave(form)} disabled={!(num(form.soldPrice) > 0)}>Record sale</button>
        </div>
      </div>
    </div>
  );
}

function ReturnNotesModal({ vehicle, onClose, onSave }) {
  const ret = vehicle.outsideAuction?.return || {};
  const [form, setForm] = useState({ carrier: ret.carrier || '', cost: ret.cost || '', notes: ret.notes || '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>Return logistics</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
          <div className="form-group">
            <label>Carrier / transporter</label>
            <input type="text" value={form.carrier} onChange={e => set('carrier', e.target.value)} placeholder="e.g. Central Dispatch, in-house" />
          </div>
          <div className="form-group">
            <label>Return transport cost</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
              <input type="number" value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="0" style={{ paddingLeft: 24 }} />
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Pickup window, contact, ETA back to lot..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-navy" onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}
