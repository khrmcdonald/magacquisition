import React, { useRef, useState } from 'react';
import { useAuth, USERS } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Navigate } from 'react-router-dom';
import { StoreAvatar } from '../components/StoreAvatar';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

const ROLE_OPTIONS = [
  { value: 'bidder',    label: 'Retail Store (Bidder)' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'gm',        label: 'Group GM' },
  { value: 'admin',     label: 'Admin' },
];

function InviteUserCard() {
  const [email, setEmail]   = useState('');
  const [name, setName]     = useState('');
  const [role, setRole]     = useState('bidder');
  const [buyerNumber, setBuyerNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const { error } = await supabase.functions.invoke('invite-user', {
        body: { email: email.trim(), name: name.trim(), role },
      });
      if (error) throw error;
      // Set buyer_number on profile if wholesale (profile created by edge function)
      if (role === 'wholesale' && buyerNumber.trim()) {
        await supabase.from('profiles').update({ buyer_number: buyerNumber.trim() }).eq('email', email.trim());
      }
      setResult({ ok: true, msg: `Invite sent to ${email}` });
      setEmail(''); setName(''); setRole('bidder'); setBuyerNumber('');
    } catch (err) {
      setResult({ ok: false, msg: err.message || 'Failed to send invite' });
    }
    setLoading(false);
  };

  return (
    <div className="card" style={{ padding: 0, marginBottom: 24 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Invite User</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Send an invite email — they set their own password on first login</p>
      </div>
      <form onSubmit={handleInvite} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Full Name</div>
            <input
              required
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Email</div>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@dealership.com"
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Role</div>
            <select
              value={role}
              onChange={e => { setRole(e.target.value); if (e.target.value !== 'wholesale') setBuyerNumber(''); }}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
            >
              {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {role === 'wholesale' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Buyer Number <span style={{ color: '#9ca3af', fontWeight: 400 }}>(auction access #)</span></div>
              <input
                type="text"
                value={buyerNumber}
                onChange={e => setBuyerNumber(e.target.value)}
                placeholder="e.g. 12345"
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="submit"
            disabled={loading}
            className="btn-navy"
            style={{ padding: '10px 24px', fontSize: 14, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Sending…' : 'Send Invite'}
          </button>
          {result && (
            <span style={{ fontSize: 13, fontWeight: 600, color: result.ok ? '#065f46' : '#991b1b' }}>
              {result.ok ? '✓ ' : '⚠ '}{result.msg}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Org Settings helpers ──────────────────────────────────────────────────────
function readOrgSettings() {
  try { return JSON.parse(localStorage.getItem('org_settings') || '{}'); } catch { return {}; }
}

function TeamMembersCard({ profiles, onUpdateBuyerNumber, roleLabel, roleBadge }) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(null); // { id, value }

  const handleSave = async () => {
    if (!editing) return;
    try {
      await onUpdateBuyerNumber(editing.id, editing.value.trim());
      showToast('Buyer number saved.', 'success');
      setEditing(null);
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    }
  };

  return (
    <div className="card" style={{ padding: 0, marginBottom: 24 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Team Members</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>All users with access to this organization</p>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {profiles.length === 0 && <div style={{ fontSize: 13, color: '#9ca3af' }}>No users found.</div>}
        {profiles.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: '#0d2550', color: '#e8b84b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
              {(p.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{roleLabel[p.role] || p.role}</div>
            </div>
            {editing?.id === p.id ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  autoFocus
                  value={editing.value}
                  onChange={e => setEditing(prev => ({ ...prev, value: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(null); }}
                  placeholder="Buyer #"
                  style={{ width: 110, padding: '5px 9px', borderRadius: 6, border: '1.5px solid #0d2550', fontSize: 13, outline: 'none' }}
                />
                <button onClick={handleSave} style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditing(null)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 9px', fontSize: 12, cursor: 'pointer', color: '#6b7280' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {p.buyer_number
                  ? <span style={{ background: '#f0f4fb', color: '#0d2550', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>#{p.buyer_number}</span>
                  : null
                }
                <button
                  onClick={() => setEditing({ id: p.id, value: p.buyer_number || '' })}
                  style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 9px', fontSize: 11, cursor: 'pointer', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  {p.buyer_number ? 'Edit #' : '+ Buyer #'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BuyersCard({ buyers, onUpdateBuyerNumber }) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(null); // { id, value }

  const handleSave = async () => {
    if (!editing) return;
    try {
      await onUpdateBuyerNumber(editing.id, editing.value.trim());
      showToast('Buyer number saved.', 'success');
      setEditing(null);
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    }
  };

  return (
    <div className="card" style={{ padding: 0, marginBottom: 24 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Wholesale Buyers</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>TRI-STATE buyer numbers from the national auction access database</p>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {buyers.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9ca3af' }}>No wholesale users found. Invite one using the form above with the Wholesale role.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {buyers.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Wholesale</div>
                </div>
                {editing?.id === b.id ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      autoFocus
                      value={editing.value}
                      onChange={e => setEditing(prev => ({ ...prev, value: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(null); }}
                      placeholder="Buyer #"
                      style={{ width: 120, padding: '6px 10px', borderRadius: 6, border: '1.5px solid #0d2550', fontSize: 13, outline: 'none' }}
                    />
                    <button onClick={handleSave} style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditing(null)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer', color: '#6b7280' }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {b.buyer_number
                      ? <span style={{ background: '#f0f4fb', color: '#0d2550', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>#{b.buyer_number}</span>
                      : <span style={{ color: '#d1d5db', fontSize: 12 }}>No number set</span>
                    }
                    <button
                      onClick={() => setEditing({ id: b.id, value: b.buyer_number || '' })}
                      style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#6b7280', fontWeight: 600 }}
                    >
                      {b.buyer_number ? 'Edit' : '+ Set'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const { data, updateStorePhoto, addAcquisitionSource, deleteAcquisitionSource, addLocation, deleteLocation, updateBuyerNumber } = useData();
  const { showToast } = useToast();
  const fileRefs = useRef({});
  const logoRef = useRef(null);

  // Sources state
  const [newSource, setNewSource] = useState('');
  const [savingSource, setSavingSource] = useState(false);

  // Locations state
  const [newLocation, setNewLocation] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  const handleAddSource = async (e) => {
    e.preventDefault();
    if (!newSource.trim()) return;
    setSavingSource(true);
    try {
      await addAcquisitionSource(newSource.trim());
      setNewSource('');
      showToast('Source added.', 'success');
    } catch (err) { showToast('Failed to add source: ' + err.message, 'error'); }
    setSavingSource(false);
  };

  const handleDeleteSource = async (id) => {
    if (!window.confirm('Delete this source?')) return;
    try { await deleteAcquisitionSource(id); showToast('Source removed.', 'success'); }
    catch (err) { showToast('Failed to remove: ' + err.message, 'error'); }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocation.trim()) return;
    setSavingLocation(true);
    try {
      await addLocation(newLocation.trim());
      setNewLocation('');
      showToast('Location added.', 'success');
    } catch (err) { showToast('Failed to add location: ' + err.message, 'error'); }
    setSavingLocation(false);
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Delete this location?')) return;
    try { await deleteLocation(id); showToast('Location removed.', 'success'); }
    catch (err) { showToast('Failed to remove: ' + err.message, 'error'); }
  };

  // Org settings state
  const [activeTab, setActiveTab] = useState('org');
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

  const photoEligible = (role) => ['bidder', 'wholesale', 'gm'].includes(role);

  const TABS = [
    { key: 'org',    label: 'Organization' },
    { key: 'acq',    label: 'Acquisitions' },
    { key: 'stores', label: 'Retail Stores' },
    { key: 'users',  label: 'Users' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Admin</h1>
        <p>Manage users, settings, and organization configuration</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #e5e7eb' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '10px 20px', border: 'none', cursor: 'pointer', background: 'transparent',
            fontSize: 14, fontWeight: activeTab === t.key ? 700 : 500,
            color: activeTab === t.key ? '#0d2550' : '#6b7280',
            borderBottom: activeTab === t.key ? '2px solid #0d2550' : '2px solid transparent',
            marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <div>
          <InviteUserCard />
          <TeamMembersCard profiles={data.profiles || []} onUpdateBuyerNumber={updateBuyerNumber} roleLabel={roleLabel} roleBadge={roleBadge} />
        </div>
      )}

      {/* ── ACQUISITIONS TAB ── */}
      {activeTab === 'acq' && (
        <div>
          <div className="card" style={{ padding: 0, marginBottom: 24 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Acquisition Sources</h2>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Where vehicles come from — shown in the New Vehicle form</p>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {(data.acquisition_sources || []).length === 0 && <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>No sources yet.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {(data.acquisition_sources || []).map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{s.name}</span>
                    <button onClick={() => handleDeleteSource(s.id)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 18, padding: '0 2px' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}>×</button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddSource} style={{ display: 'flex', gap: 8 }}>
                <input value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="e.g. Trade-in, Auction, Street buy…" style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                <button type="submit" disabled={savingSource || !newSource.trim()} className="btn-navy" style={{ padding: '9px 18px', fontSize: 13, opacity: savingSource ? 0.7 : 1 }}>{savingSource ? 'Adding…' : '+ Add'}</button>
              </form>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Locations</h2>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Lots and storage sites — shown in New Vehicle and inventory views</p>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {(data.locations || []).length === 0 && <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>No locations yet.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {(data.locations || []).map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{l.name}</span>
                    <button onClick={() => handleDeleteLocation(l.id)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 18, padding: '0 2px' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}>×</button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddLocation} style={{ display: 'flex', gap: 8 }}>
                <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="e.g. Main lot, Back row, Shop…" style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                <button type="submit" disabled={savingLocation || !newLocation.trim()} className="btn-navy" style={{ padding: '9px 18px', fontSize: 13, opacity: savingLocation ? 0.7 : 1 }}>{savingLocation ? 'Adding…' : '+ Add'}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── RETAIL STORES TAB ── */}
      {activeTab === 'stores' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Retail Stores</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Store profiles and headshots — appears throughout the app</p>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {USERS.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <StoreAvatar storeId={u.id} size={52} />
                  {photoEligible(u.role) && (
                    <button onClick={() => fileRefs.current[u.id]?.click()} title="Upload photo" style={{ position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: '#1a3d76', border: '2px solid #fff', color: '#f1bb25', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>+</button>
                  )}
                  <input type="file" accept="image/*" style={{ display: 'none' }} ref={el => fileRefs.current[u.id] = el} onChange={e => { handlePhoto(u.id, e.target.files[0]); e.target.value = ''; }} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{u.name}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#e8eef5', color: '#1a3d76', padding: '2px 8px', borderRadius: 4 }}>{u.id}</span>
                    <span className={`badge ${roleBadge[u.role] || 'badge-gray'}`}>{roleLabel[u.role]}</span>
                  </div>
                </div>
                {photoEligible(u.role) && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => fileRefs.current[u.id]?.click()} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>{data.storePhotos?.[u.id] ? 'Change photo' : 'Upload photo'}</button>
                    {data.storePhotos?.[u.id] && <button onClick={() => updateStorePhoto(u.id, null)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Remove</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ORGANIZATION TAB ── */}
      {activeTab === 'org' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Organization Settings</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Dealer information and branding — saved to this browser</p>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ width: 80, height: 80, borderRadius: 10, border: '2px dashed #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {orgLogo ? <img src={orgLogo} alt="Dealer logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28, opacity: 0.2 }}>🏢</span>}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 6 }}>Dealer Logo</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => logoRef.current?.click()} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>{orgLogo ? 'Change logo' : 'Upload logo'}</button>
                  {orgLogo && <button onClick={handleRemoveLogo} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Remove</button>}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Square image recommended · shown in sidebar nav</div>
                <input type="file" accept="image/*" style={{ display: 'none' }} ref={logoRef} onChange={e => { handleLogoUpload(e.target.files[0]); e.target.value = ''; }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              {[
                { field: 'dealerName',        label: 'Dealer Name',           placeholder: 'McDonald Auto Group' },
                { field: 'licenseNumber',     label: 'Dealer License Number', placeholder: 'MI-12345678' },
                { field: 'dealerBuyerNumber', label: 'Dealer Buyer Number',   placeholder: 'Auction access #' },
                { field: 'address',           label: 'Dealer Address',        placeholder: '123 Main St, Detroit, MI 48201' },
                { field: 'phone',             label: 'Phone Number',          placeholder: '(313) 555-0100' },
                { field: 'contactEmail',      label: 'Contact Email',         placeholder: 'contact@dealership.com' },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{label}</div>
                  <input type="text" value={orgSettings[field] || ''} onChange={e => setOrgField(field, e.target.value)} placeholder={placeholder}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box', color: '#111827' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={handleSaveOrgSettings} className="btn-navy" style={{ padding: '10px 24px', fontSize: 14 }}>Save Settings</button>
              {orgSaved && <span style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>✓ Saved</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
