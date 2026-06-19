import React from 'react';
import { openSellSheet } from '../utils/sellSheet';

// Button shown on any sold (awarded) vehicle that generates the one-page
// Buyer Release Form / Sell Sheet for the manager receiving the car.
//
// `vehicle` is required; `transport` (the outbound record, if any) is optional
// and adds the delivery progress + transport notes. Pass `variant="solid"` for
// a filled navy button, or the default "outline" for a lighter inline button.
export function SellSheetButton({ vehicle, transport, variant = 'outline', style }) {
  if (!vehicle || vehicle.status !== 'awarded') return null;

  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  };
  const look = variant === 'solid'
    ? { background: '#1a3d76', color: '#fff', border: 'none' }
    : { background: '#fff', color: '#1a3d76', border: '1px solid #1a3d76' };

  return (
    <button
      type="button"
      title="Generate a one-page buyer release form / sell sheet (PDF)"
      onClick={(e) => { e.stopPropagation(); openSellSheet(vehicle, transport); }}
      style={{ ...base, ...look, ...style }}
    >
      📄 Sell sheet
    </button>
  );
}
