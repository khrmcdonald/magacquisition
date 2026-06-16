import React, { useState, useRef } from 'react';
import { useAuth, USERS } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Navigate } from 'react-router-dom';
import { StoreAvatar } from '../components/StoreAvatar';

export default function Admin() {
  const { user } = useAuth();
  const { data, updateStorePhoto } = useData();
  const [users, setUsers] = useState(() =>
    JSON.parse(localStorage.getItem('mag_users') || 'null') || USERS
  );
  const [editUser, setEditUser] = useState(null);
  const [editPin, setEditPin] = useState('');
  const [editName, setEditName] = useState('');
  const [saved, setSaved] = useState(false);
  const fileRefs = useRef({});

  if (user.role !== 'admin') return <Navigate to="/" replace />;

  const roleLabel = { bidder: 'Retail Store', wholesale: 'Wholesale', gm: 'Group GM', admin: 'Admin' };
  const roleBadge = { bidder: 'badge-blue', wholesale: 'badge-navy', gm: 'badge-gold', admin: 'badge-gray' };

  const handleEdit = (u) => {
    setEditUser(u);
    setEditPin(u.pin);
    setEditName(u.name);
  };

  const handleSave = () => {
    if (editPin.length < 4) return alert('PIN must be at least 4 digits');
    const updated = users.map(u => u.id === editUser.id ? { ...u, pin: editPin, name: editName } : u);
    setUsers(updated);
    localStorage.setItem('mag_users', JSON.stringify(updated));
    setEditUser(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
        <p>Manage store users, PINs and profile photos</p>
      </div>

      {saved && (
        <div className="alert alert-success" style={{ marginBottom: 20 }}>
          ✅ Changes saved successfully
        </div>
      )}

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
      <div className="card" style={{ padding: 0, marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Store users, PINs & photos</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Upload a headshot for each manager — appears everywhere in the app</p>
        </div>

        {/* Store cards with photo upload */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {users.map(u => (
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

              {/* PIN + Edit */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'monospace', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8, fontSize: 14, fontWeight: 700, letterSpacing: '0.15em' }}>
                  {'●'.repeat(u.pin.length)}
                </span>
                <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => handleEdit(u)}>
                  Edit PIN
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PIN reference */}
      <div className="card" style={{ background: '#fff8e7', border: '1px solid #f1bb25' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 12 }}>PIN reference (admin only)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #f1bb25', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StoreAvatar storeId={u.id} size={24} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{u.name}</span>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1a3d76', fontSize: 14, letterSpacing: '.1em' }}>{u.pin}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Edit PIN modal */}
      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h2>Edit {editUser.name}</h2>
              <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Display name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>PIN (4+ digits)</label>
                <input type="number" value={editPin} onChange={e => setEditPin(e.target.value.slice(0, 8))} placeholder="Enter new PIN" />
              </div>
              <div className="alert alert-warning">
                Changing a PIN takes effect immediately. Make sure to tell the store manager their new PIN.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
              <button className="btn-navy" onClick={handleSave}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
