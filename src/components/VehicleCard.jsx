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
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 12,
        border: `1.5px solid ${borderColor}`,
        boxShadow: highlighted ? '0 0 0 2px rgba(13,37,80,0.12)' : 'none',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Photo area — 160px */}
      <div style={{
        height: 160, background: '#f5f7fa', position: 'relative',
        flexShrink: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {photos[0]
          ? <img src={photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 48, opacity: 0.12, color: '#d1d5db' }}>🚗</span>
        }
        {badgeContent && (
          <div style={{ position: 'absolute', top: 10, left: 10 }}>{badgeContent}</div>
        )}
        {pricePillContent && (
          <div style={{ position: 'absolute', top: 10, right: 10 }}>{pricePillContent}</div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>

        {/* Year + VIN inline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {vehicle.year}
          </span>
          <span style={{
            fontFamily: 'monospace', fontSize: 10, color: '#9ca3af',
            letterSpacing: '.03em',
          }}>
            {vehicle.vin || '—'}
          </span>
        </div>

        {/* Make + Model — 15px bold navy */}
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0d2550', lineHeight: 1.25 }}>
          {vehicle.make} {vehicle.model}
        </div>

        {/* Trim + Color + Condition — 12px muted */}
        {(vehicle.trim || vehicle.color || vehicle.interior_color || vehicle.condition) && (
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {[
              vehicle.trim,
              vehicle.color && vehicle.interior_color
                ? `${vehicle.color} / ${vehicle.interior_color}`
                : (vehicle.color || vehicle.interior_color || null),
              vehicle.condition,
            ].filter(Boolean).join(' · ')}
          </div>
        )}

        {/* Mileage | List Price or Buyer — 2-col grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 7, borderTop: '1px solid #f3f4f6', marginTop: 3 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Mileage</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{mileageDisplay}</div>
          </div>
          <div>
            {vehicle.list_price ? (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>List Price</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0d2550' }}>{listPrice}</div>
              </>
            ) : vehicle.buyer_name ? (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Buyer</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{vehicle.buyer_name}</div>
              </>
            ) : null}
          </div>
        </div>

        {/* Cost basis — admin/gm/wholesale only */}
        {showCostBasis && costBasis != null && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
            Cost basis: <span style={{ fontWeight: 700, color: '#6b7280' }}>${parseFloat(costBasis).toLocaleString()}</span>
          </div>
        )}

        {/* Date purchased + source */}
        {(showDatePurchased && vehicle.datePurchased) || sourceName ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 3 }}>
            {showDatePurchased && vehicle.datePurchased && (
              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                Purchased: <span style={{ fontWeight: 700, color: '#6b7280' }}>{new Date(vehicle.datePurchased + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            )}
            {sourceName && (
              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                Source: <span style={{ fontWeight: 700, color: '#6b7280' }}>{sourceName}</span>
              </div>
            )}
          </div>
        ) : null}

        {/* Age flag — wholesale/gm/admin only */}
        {showAge && <AgePill vehicle={vehicle} />}

        {/* Title status */}
        {showTitleStatus && vehicle.titleStatus && (() => {
          const ts = TITLE_STATUS_STYLE[vehicle.titleStatus];
          return ts ? (
            <span style={{ background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`, borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 700, display: 'inline-block', marginTop: 2 }}>
              {ts.label}
            </span>
          ) : null;
        })()}

        {/* Disclosure callout */}
        {vehicle.disclosure_notes && (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FCD34D',
            borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#BA7517', lineHeight: 1.4,
          }}>
            ⚠ {vehicle.disclosure_notes}
          </div>
        )}

        {/* Extra content slot */}
        {children}

        {/* Footer: Details (left) + primary action (right) */}
        {(onDetails || actionButton) && (
          <div
            style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', gap: 8 }}
            onClick={e => e.stopPropagation()}
          >
            {onDetails && (
              <button
                onClick={onDetails}
                style={{
                  flex: '0 0 40%', padding: '10px 0', fontSize: 13, fontWeight: 600,
                  border: '1.5px solid #e5e7eb', borderRadius: 8,
                  background: '#fff', color: '#374151', cursor: 'pointer',
                  transition: 'border-color 0.12s, background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0d2550'; e.currentTarget.style.background = '#f8faff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}
              >
                Details
              </button>
            )}
            {actionButton && (
              <div style={{ flex: 1 }}>{actionButton}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default VehicleCard;
