import React from 'react';
import { useData } from '../context/DataContext';

export function StoreAvatar({ locationId, size = 36, showName = false, name = '' }) {
  const { data } = useData();
  const location = (data.locations || []).find(l => l.id === locationId);
  const photo = data.storePhotos?.[locationId];
  const color = location?.color || '#1a3d76';
  const initials = location?.short_code || '?';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        overflow: 'hidden', flexShrink: 0,
        background: photo ? 'transparent' : color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid rgba(255,255,255,0.15)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
      }}>
        {photo
          ? <img src={photo} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          : <span style={{ color: '#f1bb25', fontWeight: 800, fontSize: size * 0.35 }}>{initials}</span>
        }
      </div>
      {showName && name && (
        <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{name}</span>
      )}
    </div>
  );
}

export default StoreAvatar;
