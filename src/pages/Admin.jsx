import React, { useRef } from 'react';
import { useAuth, USERS } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Navigate } from 'react-router-dom';
import { StoreAvatar } from '../components/StoreAvatar';

export default function Admin() {
  const { user } = useAuth();
  const { data, updateStorePhoto } = useData();
  const fileRefs = useRef({});

  if (user.role !== 'admin') return <Navigate to="/" replace />;

  const roleLabel = { bidder: 'Retail Store', wholesale: 'Wholesale', gm: 'Group GM', admin: 'Admin' };
  const roleBadge = { bidder: 'badge-blue', wholesale: 'badge-navy', gm: 'badge-gold', admin: 'badge-gray' };

  const handlePhoto = (storeId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img,
          (img.width - size) / 2, (img.height - size) / 2,
          size, size, 0, 0, 200, 200
        );
        updateStorePhoto(storeId, canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const totalVehicles = data.vehicles.length;
  const activeAuction = data.auction.isOpen;
  const photoEligible = (role) => ['bidder', 'wholesale', 'gm'].includes(role);

  return (
    <div>
      <div className="page-header">
        <h1>Admin</h1>
        <p>Manage store profile photos and view system status</p>
      </div>

      {/* System status */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Auction status</div>
          <div className="stat-value" style={{ fontSize: 16, color: activeAuction ? '#065f46' : '#6b7280' }}>
            {activeAuction ? 'Open' : 'Closed'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total vehicles</div>
          <div className="stat-value">{totalVehicles}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total bids</div>
          <div className="stat-value">{data.bids.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Transport records</div>
          <div className="stat-value">{data.transport.length}</div>
        </div>
      </div>

      {/* Users table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Store users & photos</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Upload a headshot for each manager — appears everywhere in the app</p>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {USERS.map(u => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 16px', background: '#f9fafb',
              borderRadius: 10, border: '1px solid #e5e7eb',
              flexWrap: 'wrap',
            }}>
              {/* Avatar + upload */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <StoreAvatar storeId={u.id} size={52} />
                {photoEligible(u.role) && (
                  <button
                    onClick={() => fileRefs.current[u.id]?.click()}
                    title="Upload photo"
                    style={{
                      position: 'absolute', bottom: -4, right: -4,
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#1a3d76', border: '2px solid #fff',
                      color: '#f1bb25', fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, lineHeight: 1,
                    }}
                  >+</button>
                )}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  ref={el => fileRefs.current[u.id] = el}
                  onChange={e => { handlePhoto(u.id, e.target.files[0]); e.target.value = ''; }}
                />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{u.name}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#e8eef5', color: '#1a3d76', padding: '2px 8px', borderRadius: 4 }}>{u.id}</span>
                  <span className={`badge ${roleBadge[u.role] || 'badge-gray'}`}>{roleLabel[u.role]}</span>
                </div>
              </div>

              {/* Photo actions */}
              {photoEligible(u.role) && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => fileRefs.current[u.id]?.click()}
                    className="btn-secondary"
                    style={{ padding: '6px 14px', fontSize: 13 }}
                  >
                    {data.storePhotos?.[u.id] ? '📷 Change photo' : '📷 Upload photo'}
                  </button>
                  {data.storePhotos?.[u.id] && (
                    <button
                      onClick={() => updateStorePhoto(u.id, null)}
                      style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                    >Remove</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
