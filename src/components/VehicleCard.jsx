import React, { useState, useEffect } from 'react';

// ── Countdown hook ────────────────────────────────────────────────────────────
export function useCountdown(targetDate, active) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active || !targetDate) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [active, targetDate]);

  if (!active || !targetDate) return null;
  const diff = new Date(targetDate) - now;
  if (diff <= 0) return 'Closing…';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Teal countdown pill (exported for use in AuctionFloor, Inventory) ─────────
export function AuctionCountdownPill({ closeDate }) {
  const countdown = useCountdown(closeDate, !!closeDate);
  if (!countdown) return null;
  return (
    <span style={{
      background: '#0e7490', color: '#fff',
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'monospace', letterSpacing: '.03em',
    }}>
      ⏱ {countdown}
    </span>
  );
}

// ── Aged inventory ────────────────────────────────────────────────────────────
// Returns flag data for vehicles that have been in inventory too long.
// Only applies to vehicles still actively in the pipeline.
const AGE_STATUSES = new Set(['intake', 'recon', 'ready', 'in_auction']);

export function getAgeFlag(vehicle) {
  if (!AGE_STATUSES.has(vehicle.status)) return null;
  const ref = vehicle.datePurchased
    ? new Date(vehicle.datePurchased + 'T12:00:00')
    : vehicle.createdAt ? new Date(vehicle.createdAt) : null;
  if (!ref) return null;
  const days = Math.floor((Date.now() - ref) / 86400000);
  if (days >= 90) return { days, label: 'Liquidate', color: '#991b1b', bg: '#fee2e2' };
  if (days >= 60) return { days, label: 'At Risk',   color: '#b45309', bg: '#fef3c7' };
  if (days >= 30) return { days, label: 'Aging',     color: '#78350f', bg: '#fef9c3' };
  return { days, label: null, color: '#6b7280', bg: '#f3f4f6' };
}

export function AgePill({ vehicle, style }) {
  const flag = getAgeFlag(vehicle);
  if (!flag) return null;
  return (
    <span style={{
      background: flag.bg, color: flag.color,
      border: `1px solid ${flag.color}33`,
      padding: '2px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      ...style,
    }}>
      {flag.label ? `⚠ ${flag.label} · ` : ''}{flag.days}d
    </span>
  );
}

// ── Default badge for Inventory / Auction status ──────────────────────────────
function AutoBadge({ vehicle, auctionCloseDate }) {
  const isInAuction = vehicle.status === 'in_auction';
  const countdown = useCountdown(auctionCloseDate, isInAuction);

  if (isInAuction) {
    return (
      <span style={{
        background: '#0d2550', color: '#fff',
        padding: '3px 10px', borderRadius: 20,
        fontSize: 11, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e8b84b', display: 'inline-block' }} />
        {countdown || 'In Auction'}
      </span>
    );
  }
  if (vehicle.status === 'listed') {
    return (
      <span style={{
        background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0',
        padding: '3px 10px', borderRadius: 20,
        fontSize: 11, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
        Available
      </span>
    );
  }
  return null;
}

// ── VehicleCard ───────────────────────────────────────────────────────────────
//
// Props:
//   variant:        'grid' | 'list'  (default 'grid')
//   vehicle:        object (required)
//   mileage:        number | null
//   auctionCloseDate: string | null  — for In Auction countdown
//   onClick:        function | null
//   highlighted:    boolean  — blue border ring (winning state)
//   badge:          undefined = auto (Available / In Auction)
//                   null     = no badge
//                   ReactNode = custom badge
//   pricePill:      undefined = auto (list_price pill)
//                   null     = hidden
//                   ReactNode = custom
//   showCostBasis:  boolean
//   costBasis:      number | null
//   actionButton:   ReactNode | null  — rendered at bottom of grid card / right of list row
//   children:       ReactNode  — extra content below standard fields (grid)
//                               or operational strip (list)
//
const TITLE_STATUS_STYLE = {
  pending:  { label: 'Title: Pending',  color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  received: { label: 'Title: Received', color: '#1e40af', bg: '#dbeafe', border: '#93c5fd' },
  clear:    { label: 'Title: Clear',    color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
  issue:    { label: '⚠ Title Issue',   color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
};

const STATUS_ACCENT = {
  intake:     '#f59e0b',
  no_sale:    '#94a3b8',
  inspection: '#3b82f6',
  recon:      '#8b5cf6',
  ready:      '#10b981',
  in_auction: '#0d2550',
  sold:       '#6b7280',
};

export function VehicleCard({
  variant = 'grid',
  vehicle,
  mileage,
  auctionCloseDate,
  onClick,
  highlighted = false,
  badge,
  pricePill,
  showCostBasis = false,
  costBasis,
  showAge = false,
  showDatePurchased = false,
  showTitleStatus = false,
  sourceName,
  onDetails,
  actionButton,
  children,
}) {
  const [hovered, setHovered] = useState(false);

  const photos = Array.isArray(vehicle.photos) ? vehicle.photos : [];
  const listPrice = vehicle.list_price ? `$${parseFloat(vehicle.list_price).toLocaleString()}` : '—';
  const mileageDisplay = mileage != null ? `${parseInt(mileage).toLocaleString()} mi` : '—';

  // Badge: undefined → auto, null → hide, ReactNode → use as-is
  const badgeContent = badge !== undefined
    ? badge
    : <AutoBadge vehicle={vehicle} auctionCloseDate={auctionCloseDate} />;

  // Price pill: undefined → auto from list_price, null → hide
  const pricePillContent = pricePill !== undefined
    ? pricePill
    : (vehicle.list_price
        ? (
          <div style={{
            background: 'rgba(255,255,255,0.95)', color: '#0d2550',
            fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
          }}>
            ${parseFloat(vehicle.list_price).toLocaleString()}
          </div>
        )
        : null
      );

  const borderColor = hovered ? '#0d2550' : highlighted ? '#0d2550' : '#e5e7eb';

  // ── LIST VARIANT ────────────────────────────────────────────────────────────
  if (variant === 'list') {
    return (
      <div
        onClick={onClick}
        style={{
          background: hovered ? '#f8faff' : '#fff',
          border: `1.5px solid ${borderColor}`,
          borderRadius: 10,
          display: 'flex', flexDirection: 'column',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'background 0.15s, border-color 0.15s',
          overflow: 'hidden',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Main horizontal row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
          {/* Thumbnail 80 × 60 */}
          <div style={{
            width: 80, height: 60, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
            background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {photos[0]
              ? <img src={photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 22, opacity: 0.2 }}>🚗</span>
            }
          </div>

          {/* Middle: vehicle identity */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#6b7280',
              background: '#f3f4f6', display: 'inline-block', padding: '1px 7px',
              borderRadius: 4, border: '1px solid #e5e7eb', marginBottom: 3, letterSpacing: '.04em',
            }}>
              {vehicle.vin || '—'}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', lineHeight: 1.2 }}>
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.trim
                ? <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 13 }}> · {vehicle.trim}</span>
                : null}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {[
                vehicle.condition,
                vehicle.color && vehicle.interior_color
                  ? `${vehicle.color} / ${vehicle.interior_color}`
                  : (vehicle.color || vehicle.interior_color || null),
                mileage != null ? `${parseInt(mileage).toLocaleString()} mi` : null,
              ].filter(Boolean).join(' · ')}
            </div>
          </div>

          {/* Right: price + badge + age + title status + action */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            {vehicle.list_price && <div style={{ fontSize: 17, fontWeight: 800, color: '#0d2550' }}>{listPrice}</div>}
            {badgeContent}
            {showAge && <AgePill vehicle={vehicle} />}
            {showTitleStatus && vehicle.titleStatus && (() => {
              const ts = TITLE_STATUS_STYLE[vehicle.titleStatus];
              return ts ? (
                <span style={{ background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`, borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 700 }}>
                  {ts.label}
                </span>
              ) : null;
            })()}
            {actionButton && (
              <div onClick={e => e.stopPropagation()}>{actionButton}</div>
            )}
          </div>
        </div>

        {/* Children: operational strip, transport details, etc. */}
        {children && (
          <div onClick={e => e.stopPropagation()}>
            {children}
          </div>
        )}
      </div>
    );
  }

  // ── GRID VARIANT ────────────────────────────────────────────────────────────
  const accentColor = STATUS_ACCENT[vehicle.status] || '#e2e8f0';

  const specParts = [
    vehicle.color && vehicle.interior_color
      ? `${vehicle.color} / ${vehicle.interior_color}`
      : (vehicle.color || vehicle.interior_color || null),
    vehicle.condition,
    mileage != null ? `${parseInt(mileage).toLocaleString()} mi` : null,
  ].filter(Boolean);

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 10,
        border: `1px solid ${highlighted ? '#0d2550' : hovered ? '#cbd5e1' : '#e2e8f0'}`,
        borderLeft: `4px solid ${accentColor}`,
        boxShadow: highlighted
          ? '0 0 0 3px rgba(13,37,80,0.1)'
          : hovered ? '0 4px 16px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.12s',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Photo — clean, overlays only in corners */}
      <div style={{ height: 148, background: '#f1f5f9', position: 'relative', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {photos[0]
          ? <img src={photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ fontSize: 30, fontWeight: 900, color: '#cbd5e1', letterSpacing: -1, userSelect: 'none' }}>
              {(vehicle.make || '').slice(0, 3).toUpperCase()}
            </div>
        }
        {badgeContent && <div style={{ position: 'absolute', top: 8, left: 8 }}>{badgeContent}</div>}
        {pricePillContent && <div style={{ position: 'absolute', top: 8, right: 8 }}>{pricePillContent}</div>}
      </div>

      {/* Card body */}
      <div style={{ padding: '10px 14px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Hero: Year Make Model */}
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.2, marginBottom: 1 }}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </div>

        {/* Trim */}
        {vehicle.trim && (
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>
            {vehicle.trim}
          </div>
        )}

        {/* Specs: color · condition · mileage */}
        {specParts.length > 0 && (
          <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.3, marginBottom: 3 }}>
            {specParts.join(' · ')}
          </div>
        )}

        {/* VIN */}
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#c4c9d3', letterSpacing: '.04em', marginBottom: 6 }}>
          {vehicle.vin || '—'}
        </div>

        {/* Age + Title status — compact inline row */}
        {(showAge || (showTitleStatus && vehicle.titleStatus)) && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
            {showAge && <AgePill vehicle={vehicle} style={{ fontSize: 10, padding: '1px 6px' }} />}
            {showTitleStatus && vehicle.titleStatus && (() => {
              const ts = TITLE_STATUS_STYLE[vehicle.titleStatus];
              return ts ? (
                <span style={{ background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`, borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                  {ts.label}
                </span>
              ) : null;
            })()}
          </div>
        )}

        {/* Cost basis */}
        {showCostBasis && costBasis != null && (
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>${parseFloat(costBasis).toLocaleString()}</span>
            <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 4 }}>cost basis</span>
          </div>
        )}

        {/* List price */}
        {vehicle.list_price && (
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0d2550' }}>{listPrice}</span>
          </div>
        )}

        {/* Disclosure */}
        {vehicle.disclosure_notes && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: '#b45309', lineHeight: 1.4, marginBottom: 4 }}>
            ⚠ {vehicle.disclosure_notes}
          </div>
        )}

        {children}

        {/* Action footer */}
        {(onDetails || actionButton) && (
          <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #f1f5f9' }} onClick={e => e.stopPropagation()}>
            {onDetails && (
              <button onClick={onDetails} style={{ width: '100%', padding: '9px 0', fontSize: 12, fontWeight: 600, border: '1.5px solid #e2e8f0', borderRadius: 7, background: '#fff', color: '#374151', cursor: 'pointer' }}>
                Details
              </button>
            )}
            {actionButton && <div>{actionButton}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default VehicleCard;
