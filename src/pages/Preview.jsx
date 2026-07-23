import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isTitleIn } from '../components/VehicleCard';

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
        .select('id, year, make, model, trim, color, interior_color, vin, photos, buyer_name, condition, engine, title_status')
        .eq('org_id', ORG_ID)
        .eq('status', 'ready')
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

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0d2550', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div style={{ color: '#f1bb25', fontWeight: 900, fontSize: 22, letterSpacing: '.04em' }}>TRI-STATE AUTO</div>
          <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 13, marginTop: 2 }}>Available Inventory — Ready to List</div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px', paddingRight: panel ? 480 : 20, transition: 'padding-right 0.3s' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af', fontSize: 15 }}>Loading inventory…</div>
        )}
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '16px 20px', color: '#991b1b', fontSize: 14 }}>
            Could not load inventory. Please try again later.
          </div>
        )}
        {!loading && !error && vehicles.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚗</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No vehicles available right now</div>
            <div style={{ fontSize: 14 }}>Check back soon — new inventory is added regularly.</div>
          </div>
        )}
        {!loading && !error && vehicles.length > 0 && (
          <>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, fontWeight: 600 }}>
              {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} available
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {vehicles.map(v => (
                <VehiclePreviewCard
                  key={v.id}
                  vehicle={v}
                  active={panel?.id === v.id}
                  onView={() => panel?.id === v.id ? closePanel() : openPanel(v)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '32px 20px 48px', color: '#9ca3af', fontSize: 12 }}>
        This inventory is for authorized dealer partners only. Pricing not shown.
      </div>

      {/* Detail panel */}
      {panel && (
        <div style={{
          position: 'fixed', top: 0, right: 0, width: 440, height: '100vh',
          background: '#fff', boxShadow: '-6px 0 32px rgba(0,0,0,0.12)',
          zIndex: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden',
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
            <span style={{ background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Ready to List</span>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>
            {/* Photo gallery */}
            {(() => {
              const photos = Array.isArray(panel.photos) ? panel.photos : [];
              return (
                <>
                  <div style={{ position: 'relative', background: '#f5f7fa', height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {photos.length > 0 ? (
                      <img src={photos[panelPhotoIdx] || photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 56, opacity: 0.1 }}>🚗</span>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VehiclePreviewCard({ vehicle: v, active, onView }) {
  const photos = Array.isArray(v.photos) ? v.photos : [];
  const [photoIdx, setPhotoIdx] = useState(0);

  return (
    <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: active ? '0 0 0 2.5px #0d2550' : '0 1px 4px rgba(0,0,0,0.08)', border: `1px solid ${active ? '#0d2550' : '#e5e7eb'}`, transition: 'box-shadow 0.15s' }}>
      {/* Photo */}
      <div style={{ position: 'relative', height: 190, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {photos.length > 0 ? (
          <img src={photos[photoIdx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 52, opacity: 0.12 }}>🚗</span>
        )}
        {photos.length > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); setPhotoIdx(i => Math.max(0, i - 1)); }} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <button onClick={e => { e.stopPropagation(); setPhotoIdx(i => Math.min(photos.length - 1, i + 1)); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            <div style={{ position: 'absolute', bottom: 7, right: 9, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20 }}>{photoIdx + 1}/{photos.length}</div>
          </>
        )}
        <div style={{ position: 'absolute', top: 9, left: 9, background: '#d1fae5', color: '#065f46', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '.03em' }}>Ready to List</div>
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px 12px' }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', marginBottom: 2, lineHeight: 1.2 }}>
          {v.year} {v.make} {v.model}
        </div>
        {v.trim && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{v.trim}</div>}

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
              <span style={{ fontWeight: 600 }}>{v.color}</span>
            </div>
          )}
          {v.buyer_name && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Buyer</span>
              <span style={{ fontWeight: 600, color: '#0d2550' }}>{v.buyer_name}</span>
            </div>
          )}
        </div>

        <button
          onClick={onView}
          style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: `1.5px solid ${active ? '#0d2550' : '#0d2550'}`, background: active ? '#0d2550' : '#fff', color: active ? '#fff' : '#0d2550', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
        >
          {active ? '← Close' : 'View Details'}
        </button>
      </div>
    </div>
  );
}
