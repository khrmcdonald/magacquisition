import React, { useRef, useState } from 'react';
import { useAuth, USERS } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Navigate } from 'react-router-dom';
import { StoreAvatar } from '../components/StoreAvatar';

// ── Org Settings helpers ──────────────────────────────────────────────────────
function readOrgSettings() {
  try { return JSON.parse(localStorage.getItem('org_settings') || '{}'); } catch { return {}; }
}

export default function Admin() {
  const { user } = useAuth();
  const { data, updateStorePhoto } = useData();
  const fileRefs = useRef({});
  const logoRef = useRef(null);

  // Org settings state
  const [orgSettings, setOrgSettings] = useState(() => readOrgSettings());
  const [orgLogo, setOrgLogo] = useState(() => {
    try { return localStorage.getItem('org_logo') || null; } catch { return null; }
  });
  const [orgSaved, setOrgSaved] = useState(false);

  const setOrgField = (field, val) => setOrgSettings(prev => ({ ...prev, [field]: val }));

  const handleLogoUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200; canvas.height = 200;
        const size = Math.min(img.width, img.height);
        canvas.getContext('2d').drawImage(img,
          (img.width - size) / 2, (img.height - size) / 2,
          size, size, 0, 0, 200, 200
        );
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setOrgLogo(dataUrl);
        localStorage.setItem('org_logo', dataUrl);
        // Trigger storage event for Layout.jsx to pick up
        window.dispatchEvent(new Event('storage'));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setOrgLogo(null);
    localStorage.removeItem('org_logo');
    window.dispatchEvent(new Event('storage'));
  };

  const handleSaveOrgSettings = () => {
    localStorage.setItem('org_settings', JSON.stringify(orgSettings));
    setOrgSaved(true);
    setTimeout(() => setOrgSaved(false), 2500);
  };

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
        <p>Manage organization settings and store profiles</p>
      </div>

      {/* ── Organization Settings ───────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Organization Settings</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Dealer information and branding — saved to this browser</p>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Logo upload + preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {/* Logo preview */}
            <div style={{
              width: 80, height: 80, borderRadius: 10, border: '2px dashed #e5e7eb',
              background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {orgLogo
                ? <img src={orgLogo} alt="Dealer logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 28, opacity: 0.2 }}>🏢</span>
              }
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 6 }}>Dealer Logo</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => logoRef.current?.click()}
                  className="btn-secondary"
                  style={{ padding: '6px 14px', fontSize: 13 }}
                >
                  {orgLogo ? '📷 Change logo' : '📷 Upload logo'}
                </button>
                {orgLogo && (
                  <button
                    onClick={handleRemoveLogo}
                    style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Square image recommended · shown in sidebar nav</div>
              <input type="file" accept="image/*" style={{ display: 'none' }} ref={logoRef}
                onChange={e => { handleLogoUpload(e.target.files[0]); e.target.value = ''; }} />
            </div>
          </div>

          {/* Dealer info fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {[
              { field: 'dealerName',    label: 'Dealer Name',           placeholder: 'McDonald Auto Group' },
              { field: 'licenseNumber', label: 'Dealer License Number', placeholder: 'MI-12345678' },
              { field: 'address',       label: 'Dealer Address',        placeholder: '123 Main St, Detroit, MI 48201' },
              { field: 'phone',         label: 'Phone Number',          placeholder: '(313) 555-0100' },
              { field: 'contactEmail',  label: 'Contact Email',         placeholder: 'contact@dealership.com' },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{label}</div>
                <input
                  type="text"
                  value={orgSettings[field] || ''}
                  onChange={e => setOrgField(field, e.target.value)}
                  placeholder={placeholder}
                  style={{
                    width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb',
                    borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff',
                    boxSizing: 'border-box', color: '#111827',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Save button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleSaveOrgSettings}
              className="btn-navy"
              style={{ padding: '10px 24px', fontSize: 14 }}
            >
              Save Settings
            </button>
            {orgSaved && (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>✓ Saved</span>
            )}
          </div>
        </div>
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
