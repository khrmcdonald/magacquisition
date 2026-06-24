import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from './Toast';

const RESOLUTION_TYPES = [
  {
    id: 'fix_it',
    icon: '🔧',
    label: 'Fix It',
    description: 'Vehicle returns to recon. A repair order will be created.',
    bg: '#eff6ff',
    border: '#3b82f6',
    color: '#1e40af',
  },
  {
    id: 'price_adjustment',
    icon: '💰',
    label: 'Price Adjustment',
    description: 'Credit issued to the store. No status change.',
    bg: '#f0fdf4',
    border: '#22c55e',
    color: '#065f46',
  },
  {
    id: 'denied',
    icon: '✕',
    label: 'Denied',
    description: 'No action taken. Reason recorded.',
    bg: '#fef2f2',
    border: '#f87171',
    color: '#991b1b',
  },
];

export default function ArbitrationResolveModal({ vehicle, onClose }) {
  const { resolveArbitration } = useData();
  const { showToast } = useToast();
  const [resolutionType, setResolutionType] = useState('');
  const [details, setDetails] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const arb = vehicle.arbitration;
  const filed = arb?.filedAt ? new Date(arb.filedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  const canSubmit = resolutionType && (
    resolutionType === 'fix_it' ? true :
    resolutionType === 'price_adjustment' ? !!amount :
    !!details
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await resolveArbitration(
        vehicle.id,
        resolutionType,
        details || null,
        resolutionType === 'price_adjustment' ? parseFloat(amount) : null,
      );
      showToast('Arbitration resolved.', 'success');
      onClose();
    } catch (err) {
      showToast('Failed to resolve: ' + err.message, 'error');
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>

        {/* Header */}
        <div className="modal-header" style={{ background: '#991b1b', borderRadius: '12px 12px 0 0' }}>
          <div>
            <h2 style={{ color: '#fff', margin: 0, fontSize: 17 }}>Resolve Arbitration</h2>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        <div className="modal-body">

          {/* Claim summary */}
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Claim filed by {arb?.storeName}{filed ? ` · ${filed}` : ''}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: arb?.details ? 6 : 0 }}>{arb?.issueType}</div>
            {arb?.details && <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{arb.details}</div>}
          </div>

          {/* Resolution type selection */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Resolution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {RESOLUTION_TYPES.map(rt => (
              <div
                key={rt.id}
                onClick={() => setResolutionType(rt.id)}
                style={{
                  border: `2px solid ${resolutionType === rt.id ? rt.border : '#e5e7eb'}`,
                  background: resolutionType === rt.id ? rt.bg : '#fff',
                  borderRadius: 8,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'border-color 0.15s',
                }}
              >
                <span style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0 }}>{rt.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: resolutionType === rt.id ? rt.color : '#374151' }}>{rt.label}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{rt.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Conditional fields */}
          {resolutionType === 'fix_it' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Repair notes (optional)</label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={3}
                placeholder={`What needs to be fixed? (pre-filled from claim: ${arb?.issueType})`}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 6 }}>
                ℹ A repair order will be created and the vehicle will move back to Recon.
              </div>
            </div>
          )}

          {resolutionType === 'price_adjustment' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'start' }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Credit amount *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  style={{ width: 110, padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Notes</label>
                <input
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="e.g. Agreed allowance for brake repair"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {resolutionType === 'denied' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Reason for denial *</label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={3}
                placeholder="Explain why the arbitration claim was denied..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            style={{
              background: canSubmit ? '#991b1b' : '#d1d5db',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px 22px', fontSize: 14, fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Resolving…' : 'Resolve arbitration'}
          </button>
        </div>
      </div>
    </div>
  );
}
