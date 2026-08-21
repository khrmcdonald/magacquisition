import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isTitleIn, getKeysCount } from '../components/VehicleCard';

const ORG_ID = 'bf236d2b-4693-4606-bf3d-ece1767690ab';

export default function Preview() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [panel, setPanel] = useState(null);
  const [panelPhotoIdx, setPanelPhotoIdx] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: rows, error: err } = await supabase
        .from('vehicles')
        .select('id, status, year, make, model, trim, color, interior_color, vin, photos, buyer_name, condition, engine, title_status, disclosure_notes, buyer_responsibility_notes, general_notes, keys')
        .eq('org_id', ORG_ID)
        .in('status', ['ready', 'incoming'])
        .order('created_at', { ascending: false });

      if (err) { setError(err.message); setLoading(false); return; }

      const ids = (rows || []).map(r => r.id);
      let mileageMap = {};
      if (ids.length) {
        const { data: miles } = await supabase
          .from('mileage_log')
          .select('vehicle_id, reading')
          .in('vehicle_id', ids)
          .order('logged_at', { ascending: false });
        miles?.forEach(m => { if (!mileageMap[m.vehicle_id]) mileageMap[m.vehicle_id] = m.reading; });
      }

      setVehicles((rows || []).map(r => ({ ...r, mileage: mileageMap[r.id] ?? null })));
      setLoading(false);
    }
    load();
  }, []);

  const openPanel = (v) => { setPanel(v); setPanelPhotoIdx(0); };
  const closePanel = () => setPanel(null);

  const readyVehicles = vehicles.filter(v => v.status === 'ready');
  const incomingVehicles = vehicles.filter(v => v.status === 'incoming');

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
      {/* Header */}
      <div style={{ background: '#0d2550', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 2px 10px rgba(13,37,80,0.15)' }}>
        <div>
          <div style={{ color: '#f1bb25', fontWeight: 900, fontSize: 22, letterSpacing: '.04em' }}>TRI-STATE AUTO</div>
          <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 13, marginTop: 2 }}>Available &amp; Incoming Inventory</div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af', fontSize: 15 }}>Loading inventory…</div>
        )}
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '16px 20px', color: '#991b1b', fontSize: 14 }}>
            Could not load inventory. Please try again later.
          </div>
        )}
        {!loading && !error && readyVehicles.length === 0 && incomingVehicles.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚗</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No vehicles available right now</div>
            <div style={{ fontSize: 14 }}>Check back soon — new inventory is added regularly.</div>
          </div>
        )}

        {!loading && !error && readyVehicles.length > 0 && (
          <div style={{ marginBottom: incomingVehicles.length > 0 ? 44 : 0 }}>
            <SectionHeader
              dotColor="#10b981"
              title="Ready Now"
              count={readyVehicles.length}
              subtitle="In stock and available today"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {readyVehicles.map(v => (
                <VehiclePreviewCard
                  key={v.id}
                  vehicle={v}
                  variant="ready"
                  active={panel?.id === v.id}
                  onView={() => panel?.id === v.id ? closePanel() : openPanel(v)}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && !error && incomingVehicles.length > 0 && (
          <div>
            <SectionHeader
              dotColor="#3b82f6"
              title="Incoming"
              count={incomingVehicles.length}
              subtitle="Purchased and on the way — not yet available for pickup"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {incomingVehicles.map(v => (
                <VehiclePreviewCard
                  key={v.id}
                  vehicle={v}
                  variant="incoming"
                  active={panel?.id === v.id}
                  onView={() => panel?.id === v.id ? closePanel() : openPanel(v)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '32px 20px 48px', color: '#9ca3af', fontSize: 12 }}>
        This inventory is for authorized dealer partners only. Pricing not shown.
      </div>
      </div>

      {/* Detail panel */}
      {panel && (
        <div style={{
          width: 440, flexShrink: 0, position: 'sticky', top: 0, height: '100vh',
          background: '#fff', boxShadow: '-6px 0 32px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Panel header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: '#0d2550' }}>
            <button onClick={closePanel} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {panel.year} {panel.make} {panel.model}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 1 }}>{panel.trim || panel.vin || ''}</div>
            </div>
            {panel.status === 'ready' ? (
              <span style={{ background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Ready Now</span>
            ) : (
              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Incoming</span>
            )}
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Photo gallery */}
            {(() => {
              const photos = Array.isArray(panel.photos) ? panel.photos : [];
              return (
                <>
                  <div style={{ position: 'relative', background: 'linear-gradient(180deg, #f8fafc, #eef2f7)', height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {photos.length > 0 ? (
                      <img src={photos[panelPhotoIdx] || photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <PhotoPlaceholder size={64} />
                    )}
                    {photos.length > 1 && (
                      <>
                        <button onClick={() => setPanelPhotoIdx(i => Math.max(0, i - 1))} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                        <button onClick={() => setPanelPhotoIdx(i => Math.min(photos.length - 1, i + 1))} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                        <div style={{ position: 'absolute', bottom: 8, right: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{panelPhotoIdx + 1} / {photos.length}</div>
                      </>
                    )}
                  </div>
                  {photos.length > 1 && (
                    <div style={{ display: 'flex', gap: 5, padding: '6px 8px', overflowX: 'auto', background: '#f5f7fa' }}>
                      {photos.map((p, i) => (
                        <img key={i} src={p} alt="" onClick={() => setPanelPhotoIdx(i)}
                          style={{ width: 52, height: 38, objectFit: 'cover', borderRadius: 4, flexShrink: 0, cursor: 'pointer', border: i === panelPhotoIdx ? '2px solid #0d2550' : '2px solid transparent', opacity: i === panelPhotoIdx ? 1 : 0.6, transition: 'opacity .12s, border-color .12s' }} />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* VIN */}
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#374151', background: '#f3f4f6', padding: '5px 10px', borderRadius: 6, letterSpacing: '.05em', display: 'inline-block', alignSelf: 'flex-start', marginBottom: 6 }}>
                VIN: {panel.vin || '—'}
              </div>

              {/* Title badge */}
              <div style={{ marginBottom: 10 }}>
                <span style={{
                  background: isTitleIn(panel.title_status) ? '#d1fae5' : '#fee2e2',
                  color: isTitleIn(panel.title_status) ? '#065f46' : '#991b1b',
                  border: `1px solid ${isTitleIn(panel.title_status) ? '#6ee7b7' : '#fca5a5'}`,
                  padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                }}>
                  {isTitleIn(panel.title_status) ? 'Title IN' : 'Title OUT'}
                </span>
                <span style={{ marginLeft: 10, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                  🔑 {getKeysCount(panel).available}/{getKeysCount(panel).total} keys
                </span>
              </div>

              {/* Specs */}
              {[
                panel.mileage != null && ['Mileage', `${parseInt(panel.mileage).toLocaleString()} mi`],
                panel.color && ['Exterior Color', panel.color],
                panel.interior_color && ['Interior Color', panel.interior_color],
                panel.condition && ['Condition', panel.condition.charAt(0).toUpperCase() + panel.condition.slice(1)],
                panel.engine && ['Engine', panel.engine],
                panel.buyer_name && ['Buyer Rep', panel.buyer_name],
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6, borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{value}</span>
                </div>
              ))}

              {panel.disclosure_notes && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, padding: '8px 10px', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 800, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>We're Fixing</div>
                  {panel.disclosure_notes}
                </div>
              )}
              {panel.buyer_responsibility_notes && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 800, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>⚠ Buyer's Responsibility</div>
                  {panel.buyer_responsibility_notes}
                </div>
              )}
              {panel.general_notes && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#374151', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 800, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>Notes</div>
                  {panel.general_notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoPlaceholder({ size = 52 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg, #e2e8f0, #f1f5f9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.5, filter: 'grayscale(15%)',
      }}>🚗</div>
      <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Photo coming soon</span>
    </div>
  );
}

function VehiclePreviewCard({ vehicle: v, variant = 'ready', active, onView }) {
  const photos = Array.isArray(v.photos) ? v.photos : [];
  const [photoIdx, setPhotoIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const isIncoming = variant === 'incoming';
  const accent = isIncoming ? '#3b82f6' : '#0d2550';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff', borderRadius: 12, overflow: 'hidden',
        boxShadow: active ? `0 0 0 2.5px ${accent}` : (hovered ? '0 8px 20px rgba(15,23,42,0.10)' : '0 1px 4px rgba(0,0,0,0.08)'),
        border: `1.5px solid ${active ? accent : (isIncoming ? '#dbeafe' : '#e5e7eb')}`,
        borderTop: `3px solid ${accent}`,
        transform: hovered && !active ? 'translateY(-3px)' : 'none',
        transition: 'box-shadow 0.18s, transform 0.18s',
      }}>
      {/* Photo */}
      <div style={{ position: 'relative', height: 190, background: 'linear-gradient(180deg, #f8fafc, #eef2f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {photos.length > 0 ? (
          <img src={photos[photoIdx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <PhotoPlaceholder />
        )}
        {photos.length > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); setPhotoIdx(i => Math.max(0, i - 1)); }} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <button onClick={e => { e.stopPropagation(); setPhotoIdx(i => Math.min(photos.length - 1, i + 1)); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            <div style={{ position: 'absolute', bottom: 7, right: 9, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20 }}>{photoIdx + 1}/{photos.length}</div>
          </>
        )}
        <div style={{
          position: 'absolute', top: 9, left: 9,
          background: isIncoming ? '#3b82f6' : '#d1fae5',
          color: isIncoming ? '#fff' : '#065f46',
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '.03em',
          boxShadow: isIncoming ? '0 2px 6px rgba(59,130,246,0.35)' : 'none',
        }}>
          {isIncoming ? '🚚 Incoming' : 'Ready Now'}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px 12px' }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', marginBottom: 2, lineHeight: 1.2 }}>
          {v.year} {v.make} {v.model}
        </div>
        {v.trim && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>{v.trim}</div>}

        {!isIncoming && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <span style={{
              background: isTitleIn(v.title_status) ? '#d1fae5' : '#fee2e2',
              color: isTitleIn(v.title_status) ? '#065f46' : '#991b1b',
              border: `1px solid ${isTitleIn(v.title_status) ? '#6ee7b7' : '#fca5a5'}`,
              padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700,
            }}>
              {isTitleIn(v.title_status) ? 'Title IN' : 'Title OUT'}
            </span>
            <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 600 }}>
              🔑 {getKeysCount(v).available}/{getKeysCount(v).total}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, marginBottom: 12 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151', background: '#f3f4f6', padding: '3px 7px', borderRadius: 4, display: 'inline-block', letterSpacing: '.05em', alignSelf: 'flex-start' }}>
            VIN: {v.vin || '—'}
          </div>
          {v.mileage != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Mileage</span>
              <span style={{ fontWeight: 600 }}>{parseInt(v.mileage).toLocaleString()} mi</span>
            </div>
          )}
          {v.color && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Color</span>
              <span style={{ fontWeight: 600 }}>{v.color}{v.interior_color ? ` / ${v.interior_color}` : ''}</span>
            </div>
          )}
          {v.condition && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Condition</span>
              <span style={{ fontWeight: 600 }}>{v.condition}</span>
            </div>
          )}
          {v.engine && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Engine</span>
              <span style={{ fontWeight: 600 }}>{v.engine}</span>
            </div>
          )}
          {v.buyer_name && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Buyer</span>
              <span style={{ fontWeight: 600, color: '#0d2550' }}>{v.buyer_name}</span>
            </div>
          )}
        </div>

        {v.disclosure_notes && (
          <div style={{ fontSize: 11, color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, padding: '6px 8px', marginBottom: 6, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 800 }}>We're Fixing:</span> {v.disclosure_notes}
          </div>
        )}
        {v.buyer_responsibility_notes && (
          <div style={{ fontSize: 11, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 8px', marginBottom: 6, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 800 }}>⚠ Buyer's Responsibility:</span> {v.buyer_responsibility_notes}
          </div>
        )}
        {v.general_notes && (
          <div style={{ fontSize: 11, color: '#374151', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 8px', marginBottom: 12, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 800 }}>Notes:</span> {v.general_notes}
          </div>
        )}

        <button
          onClick={onView}
          style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: `1.5px solid ${accent}`, background: active ? accent : '#fff', color: active ? '#fff' : accent, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
        >
          {active ? '← Close' : 'View Details'}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ dotColor, title, count, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: 0 }}>{title}</h2>
        <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 600 }}>{count}</span>
      </div>
      {subtitle && <div style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 3, marginLeft: 19 }}>{subtitle}</div>}
    </div>
  );
}
