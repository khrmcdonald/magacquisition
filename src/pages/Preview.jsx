import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const ORG_ID = 'bf236d2b-4693-4606-bf3d-ece1767690ab';

export default function Preview() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: rows, error: err } = await supabase
        .from('vehicles')
        .select('id, year, make, model, trim, color, vin, photos, buyer_name')
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

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0d2550', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div style={{ color: '#f1bb25', fontWeight: 900, fontSize: 22, letterSpacing: '.04em' }}>STOCKYARD</div>
          <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 13, marginTop: 2 }}>Available Inventory — Ready to List</div>
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
                <VehiclePreviewCard key={v.id} vehicle={v} />
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '32px 20px 48px', color: '#9ca3af', fontSize: 12 }}>
        This inventory is for authorized dealer partners only. Pricing not shown.
      </div>
    </div>
  );
}

function VehiclePreviewCard({ vehicle: v }) {
  const photos = Array.isArray(v.photos) ? v.photos : [];
  const [photoIdx, setPhotoIdx] = useState(0);

  return (
    <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
      {/* Photo */}
      <div style={{ position: 'relative', height: 190, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {photos.length > 0 ? (
          <img src={photos[photoIdx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 52, opacity: 0.12 }}>🚗</span>
        )}
        {photos.length > 1 && (
          <>
            <button onClick={() => setPhotoIdx(i => Math.max(0, i - 1))} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <button onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            <div style={{ position: 'absolute', bottom: 7, right: 9, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20 }}>{photoIdx + 1}/{photos.length}</div>
          </>
        )}
        {/* Ready badge */}
        <div style={{ position: 'absolute', top: 9, left: 9, background: '#d1fae5', color: '#065f46', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '.03em' }}>Ready to List</div>
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', marginBottom: 2, lineHeight: 1.2 }}>
          {v.year} {v.make} {v.model}
        </div>
        {v.trim && (
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>{v.trim}</div>
        )}

        {/* Key specs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13 }}>
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
      </div>
    </div>
  );
}
