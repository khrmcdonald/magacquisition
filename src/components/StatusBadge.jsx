import React from 'react';

// Single platform-wide vehicle status, derived automatically from the data the
// app already tracks. Nothing here is stored — it is computed from a vehicle's
// auction stage, its inbound logistics, its outbound transport record, and any
// open arbitration. This keeps one consistent badge on every screen with no
// double data entry and no field to keep in sync.
//
// IN TRANSIT is split by direction because it matters operationally:
//   • Inbound  — a car we bought, on its way TO Arbor Plaza
//   • Outbound — a car we sold, on its way to the buyer's store
export const PLATFORM_STATUSES = {
  arbitration: { key: 'arbitration', label: 'Arbitration',          short: 'Arbitration', icon: '⚠️', bg: '#fee2e2', color: '#991b1b' },
  transit_in:  { key: 'transit_in',  label: 'In Transit · Inbound',  short: 'Transit · In',  icon: '🚛', bg: '#e0f2fe', color: '#0369a1' },
  transit_out: { key: 'transit_out', label: 'In Transit · Outbound', short: 'Transit · Out', icon: '🚚', bg: '#dbeafe', color: '#1e40af' },
  auction:     { key: 'auction',     label: 'Auction',               short: 'Auction',     icon: '🔨', bg: '#e0e7ff', color: '#3730a3' },
  repair:      { key: 'repair',      label: 'In Repair',             short: 'In Repair',   icon: '🔧', bg: '#fef3c7', color: '#92400e' },
  sold:        { key: 'sold',        label: 'Sold',                  short: 'Sold',        icon: '🏁', bg: '#d1fae5', color: '#065f46' },
  inventory:   { key: 'inventory',   label: 'Inventory',             short: 'Inventory',   icon: '🅿️', bg: '#eef2f6', color: '#374151' },
};

// Inbound logistics steps (matches Acquisitions) that mean a freshly bought
// vehicle is still on its way to the lot — i.e. in transit inbound.
const INBOUND_ACTIVE = ['scheduled', 'in_transit'];
// Outbound transport steps that mean a sold vehicle is actively moving.
const OUTBOUND_ACTIVE = ['dispatched', 'inTransit'];
// Title states that count as "we have it / it's done" — anything else is waited on.
const TITLE_RESOLVED = ['on_hand', 'transferred'];

// Precedence matters when more than one state could apply. Arbitration is the
// most urgent and overrides everything; a live sale's direction comes next.
export function getVehicleStatus(vehicle, transport) {
  if (!vehicle) return PLATFORM_STATUSES.inventory;

  if (vehicle.arbitration?.status === 'open') return PLATFORM_STATUSES.arbitration;

  if (vehicle.status === 'awarded') {
    return transport && OUTBOUND_ACTIVE.includes(transport.status)
      ? PLATFORM_STATUSES.transit_out
      : PLATFORM_STATUSES.sold;
  }

  if (vehicle.status === 'active') return PLATFORM_STATUSES.auction;
  if (vehicle.status === 'recon') return PLATFORM_STATUSES.repair;
  if (INBOUND_ACTIVE.includes(vehicle.inboundStatus)) return PLATFORM_STATUSES.transit_in;

  return PLATFORM_STATUSES.inventory;
}

// Whether a title is still being waited on. For a sold car the relevant title
// is the one handed to the buyer (the outbound transport's titleReceived step);
// for everything else it's whether we hold the title yet.
export function isTitlePending(vehicle, transport) {
  if (!vehicle) return false;
  if (vehicle.status === 'awarded' && transport) return !transport.steps?.titleReceived;
  return !TITLE_RESOLVED.includes(vehicle.titleStatus || 'pending');
}

// Consistent badge used on every screen. `size` controls density; `useShort`
// swaps the transit labels for compact "Transit · In/Out" in tight tables.
export function StatusBadge({ vehicle, transport, size = 'md', showTitle = true, useShort = false }) {
  const st = getVehicleStatus(vehicle, transport);
  const titlePending = showTitle && isTitlePending(vehicle, transport);
  const sm = size === 'sm';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{
        background: st.bg, color: st.color,
        padding: sm ? '3px 9px' : '5px 12px',
        borderRadius: 20, fontSize: sm ? 11 : 12.5, fontWeight: 700,
        whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        <span>{st.icon}</span>{useShort ? st.short : st.label}
      </span>
      {titlePending && (
        <span title="Waiting on title" style={{
          background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa',
          padding: sm ? '2px 7px' : '3px 9px',
          borderRadius: 20, fontSize: sm ? 10 : 11, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          ⏳ Title
        </span>
      )}
    </span>
  );
}
