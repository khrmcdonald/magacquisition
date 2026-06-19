import React from 'react';
import { openRepairOrder } from '../utils/repairOrder';

// Button shown on any vehicle that has a repair record. It generates the
// one-page Repair Order / Work Authorization for the shop.
//
// `vehicle` is required and must carry a `repair` overlay; `vendor` (the matching
// approved-vendor record, looked up by repair.vendorId) and `transport` (the
// repair trip) are optional and enrich the document with shop and logistics
// detail. This is an internal document, so only render it on internal screens.
export function RepairOrderButton({ vehicle, vendor, transport, variant = 'outline', style }) {
  if (!vehicle || !vehicle.repair) return null;

  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  };
  const look = variant === 'solid'
    ? { background: '#9a3412', color: '#fff', border: 'none' }
    : { background: '#fff', color: '#9a3412', border: '1px solid #fed7aa' };

  return (
    <button
      type="button"
      title="Generate a one-page repair order / work authorization (PDF)"
      onClick={(e) => { e.stopPropagation(); openRepairOrder(vehicle, vendor, transport); }}
      style={{ ...base, ...look, ...style }}
    >
      📄 Repair order
    </button>
  );
}
