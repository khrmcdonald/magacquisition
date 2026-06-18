import React, { useState } from 'react';
import { USERS } from '../context/AuthContext';

const BUYER_STORES = USERS.filter(u => u.role === 'bidder');

// Direct-sale dialog. Pass `fixedVehicle` to sell one specific car (the picker is
// hidden), or `vehicles` to let the seller choose from a list. Both modes call
// onSell(vehicleId, buyerId, buyerName, amount, note).
export function DirectSaleModal({ fixedVehicle, vehicles, onClose, onSell }) {
  const [vehicleId, setVehicleId] = useState(fixedVehicle ? fixedVehicle.id : '');
  const [buyerId, setBuyerId] = useState('');
  const [otherName, setOtherName] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState(null);

  const vehicle = fixedVehicle || (vehicles || []).find(v => v.id === vehicleId);
  const isOther = buyerId === 'OTHER';
  const buyerName = isOther ? otherName.trim() : (BUYER_STORES.find(s => s.id === buyerId)?.name || '');
  const amount = parseFloat(price) || 0;
  const cost = vehicle ? (parseFloat(vehicle.totalCost) || 0) : 0;
  const margin = amount - cost;
  const valid = vehicleId && amount > 0 && (isOther ? otherName.trim() : buyerId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valid) return;
    setSummary({
      name: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle',
      buyerName,
      amount,
    });
    onSell(vehicleId, isOther ? 'EXT' : buyerId, buyerName, amount, note);
    setDone(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>{done ? 'Sale recorded' : 'Sell now — direct sale'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>
        <div className="modal-body">
          {done ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🤝</div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#065f46' }}>
                {summary?.name} sold to {summary?.buyerName}
              </p>
              <p style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>
                Sold for ${(summary?.amount || 0).toLocaleString()}. It's now in Transport &amp; Title and the buyer's wins.
              </p>
              <button className="btn-navy" style={{ marginTop: 20 }} onClick={onClose}>Done</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="alert alert-info" style={{ marginBottom: 18 }}>
                Sell a vehicle straight to a store at a price you've agreed on — no auction needed. The car moves to Awarded and into transport just like an auction win.
              </div>

              {fixedVehicle ? (
                <div className="form-group">
                  <label>Vehicle</label>
                  <div style={{ background: '#f0f4fb', border: '1px solid #c7d6ef', borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                      {vehicle.year} {vehicle.make} {vehicle.model}{vehicle.trim ? ` ${vehicle.trim}` : ''}
                    </div>
                    {vehicle.vin && (
                      <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace', marginTop: 2 }}>{vehicle.vin}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label>Vehicle *</label>
                  <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
                    <option value="">Select a vehicle...</option>
                    {(vehicles || []).map(v => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model}{v.trim ? ` ${v.trim}` : ''}{v.vin ? ` · ${v.vin}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Buyer (store) *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {BUYER_STORES.map(s => {
                    const active = buyerId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setBuyerId(s.id)}
                        style={{
                          padding: '7px 14px', borderRadius: 20,
                          border: `1px solid ${active ? '#1a3d76' : '#e5e7eb'}`,
                          background: active ? '#1a3d76' : '#fff',
                          color: active ? '#fff' : '#374151',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setBuyerId('OTHER')}
                    style={{
                      padding: '7px 14px', borderRadius: 20,
                      border: `1px solid ${isOther ? '#1a3d76' : '#e5e7eb'}`,
                      background: isOther ? '#1a3d76' : '#fff',
                      color: isOther ? '#fff' : '#374151',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Other store…
                  </button>
                </div>
                {isOther && (
                  <input
                    type="text"
                    value={otherName}
                    onChange={e => setOtherName(e.target.value)}
                    placeholder="Outside store / dealer name"
                    style={{ marginTop: 10 }}
                  />
                )}
              </div>

              <div className="form-group">
                <label>Agreed sale price *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" min={0} style={{ paddingLeft: 24 }} required />
                </div>
              </div>

              <div className="form-group">
                <label>Note (optional)</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Spoke with buyer, pickup next week" />
              </div>

              {vehicle && amount > 0 && (
                <div style={{ background: '#f0f4fb', borderRadius: 8, padding: '12px 16px', marginBottom: 16, border: '1px solid #c7d6ef' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 4 }}>
                    <span>Cost basis</span>
                    <span>${cost.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 4 }}>
                    <span>Sale price</span>
                    <span>${amount.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 1, background: '#c7d6ef', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: margin >= 0 ? '#065f46' : '#991b1b' }}>
                    <span>Margin</span>
                    <span>{margin >= 0 ? '+' : '−'}${Math.abs(margin).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="modal-footer" style={{ padding: '8px 0 0', borderTop: 'none' }}>
                <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn-navy" disabled={!valid}>Complete sale</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default DirectSaleModal;
