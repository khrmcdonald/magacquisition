import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
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

const ORG_ID = 'bf236d2b-4693-4606-bf3d-ece1767690ab';

function InviteUserCard() {
  const { user } = useAuth();
  const { data } = useData();
  const [role, setRole] = useState('bidder');
  const [locationId, setLocationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeInvites, setActiveInvites] = useState([]);

  // Load active (unused, unexpired) invites
  const loadInvites = async () => {
    const { data: rows } = await supabase
      .from('invite_tokens')
      .select('*, locations(name)')
      .eq('org_id', ORG_ID)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    setActiveInvites(rows || []);
  };

  React.useEffect(() => { loadInvites(); }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (role === 'bidder' && !locationId) return;
    setLoading(true);
    setGeneratedLink('');
    try {
      const { data: row, error } = await supabase
        .from('invite_tokens')
        .insert({
          org_id: ORG_ID,
          role,
          location_id: role === 'bidder' ? locationId : null,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      const link = `${window.location.origin}/register?token=${row.id}`;
      setGeneratedLink(link);
      loadInvites();
    } catch (err) {
      alert('Failed to generate invite: ' + err.message);
    }
    setLoading(false);
  };

  const handleCopy = (link) => {
    navigator.clipboard.writeText(link || generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (id) => {
    await supabase.from('invite_tokens').update({ used_at: new Date().toISOString() }).eq('id', id);
    loadInvites();
    if (generatedLink.includes(id)) setGeneratedLink('');
  };

  const ROLE_LABELS = { bidder: 'Retail Store', wholesale: 'Wholesale', gm: 'Group GM', admin: 'Admin' };

  return (
    <div className="card" style={{ padding: 0, marginBottom: 24 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Invite User</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
          Generate a single-use invite link. The recipient registers with their own name, email, and password.
        </p>
      </div>
      <form onSubmit={handleGenerate} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Role</div>
            <select
              value={role}
              onChange={e => { setRole(e.target.value); setLocationId(''); }}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff', boxSizing: 'border-box' }}
            >
              {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {role === 'bidder' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Store *</div>
              <select
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff', boxSizing: 'border-box' }}
              >
                <option value="">Select store…</option>
                {(data.locations || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <button type="submit" disabled={loading || (role === 'bidder' && !locationId)} className="btn-navy" style={{ padding: '9px 22px', fontSize: 13, opacity: loading ? .7 : 1 }}>
            {loading ? 'Generating…' : 'Generate invite link'}
          </button>
        </div>

        {generatedLink && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>✓ Invite link ready — expires in 7 days</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                readOnly
                value={generatedLink}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, background: '#fff', color: '#374151', fontFamily: 'monospace' }}
                onFocus={e => e.target.select()}
              />
              <button
                type="button"
                onClick={() => handleCopy(generatedLink)}
                style={{ background: '#065f46', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Active pending invites */}
      {activeInvites.length > 0 && (
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '14px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Pending invites</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeInvites.map(inv => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <span style={{ background: '#eff6ff', color: '#1e40af', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  {ROLE_LABELS[inv.role] || inv.role}
                </span>
                {inv.locations?.name && <span style={{ fontSize: 12, color: '#6b7280' }}>{inv.locations.name}</span>}
                <span style={{ fontSize: 11, color: '#9ca3af', flex: 1 }}>
                  Expires {new Date(inv.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(`${window.location.origin}/register?token=${inv.id}`)}
                  style={{ background: '#eff6ff', color: '#1e40af', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={() => handleRevoke(inv.id)}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}
                  title="Revoke"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function TeamMembersCard({ profiles, onUpdateProfile, onDeleteUser, roleLabel }) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(null); // { id, name, role, buyer_number }
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null); // userId being deleted

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete ${p.name}?\n\nThis will remove their profile, bids, and buyer assignment from all vehicles. Their login account will be blocked. This cannot be undone.`)) return;
    setDeleting(p.id);
    try {
      await onDeleteUser(p.id);
      showToast(`${p.name} removed.`, 'success');
    } catch (err) {
      showToast('Failed to delete user: ' + err.message, 'error');
    }
    setDeleting(null);
  };

  const startEdit = (p) => setEditing({ id: p.id, name: p.name || '', role: p.role || 'bidder', buyer_number: p.buyer_number || '' });

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await onUpdateProfile(editing.id, { name: editing.name.trim(), role: editing.role, buyerNumber: editing.buyer_number.trim() });
      showToast('User updated.', 'success');
      setEditing(null);
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    }
    setSaving(false);
  };

  const inp = { padding: '6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: 13, outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box' };

  return (
    <div className="card" style={{ padding: 0, marginBottom: 24 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Team Members</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>All users with access to this organization</p>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {profiles.length === 0 && <div style={{ fontSize: 13, color: '#9ca3af' }}>No users found.</div>}
        {profiles.map(p => (
          <div key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', overflow: 'hidden' }}>
            {/* Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: '#0d2550', color: '#e8b84b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
                {(p.name || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{roleLabel[p.role] || p.role}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {p.buyer_number && (
                  <span style={{ background: '#f0f4fb', color: '#0d2550', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>#{p.buyer_number}</span>
                )}
                <button
                  onClick={() => editing?.id === p.id ? setEditing(null) : startEdit(p)}
                  style={{ background: editing?.id === p.id ? '#f3f4f6' : 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#374151', fontWeight: 600 }}
                >
                  {editing?.id === p.id ? 'Cancel' : 'Edit'}
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  disabled={deleting === p.id}
                  title="Delete user"
                  style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer', color: '#ef4444', lineHeight: 1, opacity: deleting === p.id ? 0.5 : 1 }}
                >
                  {deleting === p.id ? '…' : '🗑'}
                </button>
              </div>
            </div>
            {/* Edit form */}
            {editing?.id === p.id && (
              <div style={{ borderTop: '1px solid #e5e7eb', padding: '14px 16px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Name</div>
                    <input value={editing.name} onChange={e => setEditing(prev => ({ ...prev, name: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Role</div>
                    <select value={editing.role} onChange={e => setEditing(prev => ({ ...prev, role: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                      {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Buyer #</div>
                    <input value={editing.buyer_number} onChange={e => setEditing(prev => ({ ...prev, buyer_number: e.target.value }))} placeholder="e.g. 1042" style={inp} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSave} disabled={saving} style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(null)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const { data, updateStorePhoto, addAcquisitionSource, deleteAcquisitionSource, addLocation, deleteLocation, updateProfile, deleteUser, saveOrgSettings } = useData();
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

  // Org settings state — sourced from Supabase via DataContext
  const [activeTab, setActiveTab] = useState('org');
  const [orgSettings, setOrgSettings] = useState(data.orgSettings || {});
  const [orgSaved, setOrgSaved] = useState(false);

  // Sync if DataContext loads after mount
  React.useEffect(() => {
    if (data.orgSettings && Object.keys(data.orgSettings).length > 0) {
      setOrgSettings(data.orgSettings);
    }
  }, [data.orgSettings]);

  const orgLogo = orgSettings.logoUrl || null;
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
        setOrgSettings(prev => ({ ...prev, logoUrl: dataUrl }));
        saveOrgSettings({ ...orgSettings, logoUrl: dataUrl }).catch(e => showToast('Logo save failed: ' + e.message, 'error'));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    const updated = { ...orgSettings, logoUrl: null };
    setOrgSettings(updated);
    saveOrgSettings(updated).catch(e => showToast('Failed: ' + e.message, 'error'));
  };

  const handleSaveOrgSettings = async () => {
    try {
      await saveOrgSettings(orgSettings);
      setOrgSaved(true);
      setTimeout(() => setOrgSaved(false), 2500);
    } catch (e) {
      showToast('Failed to save: ' + e.message, 'error');
    }
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
          <TeamMembersCard profiles={data.profiles || []} onUpdateProfile={updateProfile} onDeleteUser={deleteUser} roleLabel={roleLabel} roleBadge={roleBadge} />
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
            {(data.locations || []).map(loc => (
              <div key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <StoreAvatar locationId={loc.id} size={52} />
                  <button onClick={() => fileRefs.current[loc.id]?.click()} title="Upload photo" style={{ position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: '#1a3d76', border: '2px solid #fff', color: '#f1bb25', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>+</button>
                  <input type="file" accept="image/*" style={{ display: 'none' }} ref={el => fileRefs.current[loc.id] = el} onChange={e => { handlePhoto(loc.id, e.target.files[0]); e.target.value = ''; }} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{loc.name}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#e8eef5', color: '#1a3d76', padding: '2px 8px', borderRadius: 4 }}>{loc.short_code || '—'}</span>
                    <span className="badge badge-blue">Retail Store</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => fileRefs.current[loc.id]?.click()} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>{data.storePhotos?.[loc.id] ? 'Change photo' : 'Upload photo'}</button>
                  {data.storePhotos?.[loc.id] && <button onClick={() => updateStorePhoto(loc.id, null)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Remove</button>}
                </div>
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
