import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { VehicleCard } from '../components/VehicleCard';

const STATUS = {
  pending:  { label: 'Pending',  color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  received: { label: 'Received', color: '#1e40af', bg: '#dbeafe', border: '#93c5fd' },
  clear:    { label: 'Clear',    color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
  issue:    { label: 'Issue',    color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
};

const TITLE_ACCENT = {
  pending:  '#f59e0b',
  received: '#3b82f6',
  clear:    '#10b981',
  issue:    '#ef4444',
};

const NEXT = { pending: 'received', received: 'clear' };
const NEXT_LABEL = { pending: 'Mark Received', received: 'Mark Clear' };

function daysSince(v) {
  const ref = v.datePurchased ? new Date(v.datePurchased + 'T12:00:00') : v.createdAt ? new Date(v.createdAt) : null;
  if (!ref) return null;
  return Math.floor((Date.now() - ref) / 86400000);
}

export default function Titles() {
  const { user } = useAuth();
  const { data, setVehicles } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isWholesale = ['wholesale', 'gm', 'admin'].includes(user?.role);
  const isBidder = user?.role === 'bidder';

  const [statusFilter, setStatusFilter] = useState('active');
  const [saving, setSaving]             = useState(null);
  const [panelVehicle, setPanelVehicle] = useState(null);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueNote, setIssueNote]       = useState('');

  const allVehicles = (data.vehicles || []).filter(v => {
    if (isBidder) return v.status === 'awarded' && (v.winnerId === user.id || v.locationId === user.locationId);
    return true;
  });

  const vehicles = allVehicles.filter(v => {
    if (statusFilter === 'active') return ['pending', 'received', 'issue'].includes(v.titleStatus);
    if (statusFilter === 'all') return true;
    return v.titleStatus === statusFilter;
  }).sort((a, b) => (daysSince(b) ?? 0) - (daysSince(a) ?? 0));

  const counts = {
    active:   allVehicles.filter(v => ['pending','received','issue'].includes(v.titleStatus)).length,
    pending:  allVehicles.filter(v => v.titleStatus === 'pending').length,
    received: allVehicles.filter(v => v.titleStatus === 'received').length,
    issue:    allVehicles.filter(v => v.titleStatus === 'issue').length,
    clear:    allVehicles.filter(v => v.titleStatus === 'clear').length,
  };

  const FILTER_TABS = [
    { key: 'active',   label: 'Active',   count: counts.active },
    { key: 'pending',  label: 'Pending',  count: counts.pending },
    { key: 'received', label: 'Received', count: counts.received },
    { key: 'issue',    label: 'Issues',   count: counts.issue },
    { key: 'clear',    label: 'Clear',    count: counts.clear },
    { key: 'all',      label: 'All',      count: allVehicles.length },
  ];

  const openPanel = (v) => { setPanelVehicle(v); setShowIssueForm(false); setIssueNote(''); };
  const closePanel = () => { setPanelVehicle(null); setShowIssueForm(false); setIssueNote(''); };

  // Keep panel in sync with live data
  const pv = panelVehicle ? (data.vehicles || []).find(v => v.id === panelVehicle.id) || panelVehicle : null;
  const pvDays = pv ? daysSince(pv) : null;
  const pvSt   = pv ? (STATUS[pv.titleStatus] || STATUS.pending) : null;
  const pvNext = pv ? NEXT[pv.titleStatus] : null;
  const pvIsAwarded = pv?.status === 'awarded';

  const advanceStatus = async (v) => {
    const next = NEXT[v.titleStatus];
    if (!next) return;
    setSaving(v.id);
    const { error } = await supabase.from('vehicles').update({ title_status: next }).eq('id', v.id);
    if (error) {
      showToast(`Failed: ${error.message}`, 'error');
    } else {
      setVehicles(prev => prev.map(vv => vv.id === v.id ? { ...vv, titleStatus: next } : vv));
      showToast(`Title marked ${STATUS[next].label.toLowerCase()}`, 'success');
    }
    setSaving(null);
  };

  const flagIssue = async () => {
    if (!pv || !issueNote.trim()) return;
    setSaving(pv.id);
    const { error } = await supabase.from('vehicles')
      .update({ title_status: 'issue', title_notes: issueNote.trim() })
      .eq('id', pv.id);
    if (error) {
      showToast(`Failed: ${error.message}`, 'error');
    } else {
      setVehicles(prev => prev.map(vv => vv.id === pv.id ? { ...vv, titleStatus: 'issue', titleNotes: issueNote.trim() } : vv));
      setShowIssueForm(false);
      setIssueNote('');
      showToast('Issue flagged', 'success');
    }
    setSaving(null);
  };

  const resolveIssue = async () => {
    if (!pv) return;
    setSaving(pv.id);
    const { error } = await supabase.from('vehicles')
      .update({ title_status: 'received', title_notes: null })
      .eq('id', pv.id);
    if (error) {
      showToast(`Failed: ${error.message}`, 'error');
    } else {
      setVehicles(prev => prev.map(vv => vv.id === pv.id ? { ...vv, titleStatus: 'received', titleNotes: null } : vv));
      showToast('Issue resolved — title marked Received', 'success');
    }
    setSaving(null);
  };

  return (
    <div style={{ padding: '0 0 40px', position: 'relative' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Titles</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 0 }}>
          {isWholesale ? 'Track title status for every vehicle in the pipeline.' : 'Title status for your vehicles.'}
        </p>
      </div>

      {/* Stat boxes */}
      {isWholesale && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Pending',  value: counts.pending,  accent: TITLE_ACCENT.pending,  color: '#92400e' },
            { label: 'Received', value: counts.received, accent: TITLE_ACCENT.received, color: '#1e40af' },
            { label: 'Issues',   value: counts.issue,    accent: TITLE_ACCENT.issue,    color: '#991b1b' },
            { label: 'Clear',    value: counts.clear,    accent: TITLE_ACCENT.clear,    color: '#065f46' },
          ].map(({ label, value, accent, color }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: `3px solid ${accent}`, borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTER_TABS.map(t => (
          <button key={t.key} onClick={() => setStatusFilter(t.key)} style={{
            padding: '6px 14px', borderRadius: 20,
            border: `1.5px solid ${statusFilter === t.key ? '#0d2550' : '#e5e7eb'}`,
            background: statusFilter === t.key ? '#0d2550' : '#fff',
            color: statusFilter === t.key ? '#fff' : '#6b7280',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ background: statusFilter === t.key ? 'rgba(255,255,255,.25)' : '#f3f4f6', color: statusFilter === t.key ? '#fff' : '#6b7280', borderRadius: 10, padding: '0 6px', fontSize: 11, fontWeight: 800 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ paddingRight: panelVehicle ? 460 : 0, transition: 'padding-right 0.2s' }}>
        {vehicles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af', fontSize: 13 }}>
            {statusFilter === 'active' ? 'All titles are clear.' : `No vehicles with status "${statusFilter}".`}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {vehicles.map(v => {
              const st = STATUS[v.titleStatus] || STATUS.pending;
              const days = daysSince(v);
              const isActive = panelVehicle?.id === v.id;

              return (
                <VehicleCard
                  key={v.id}
                  variant="grid"
                  vehicle={v}
                  mileage={v.mileage}
                  highlighted={isActive}
                  accentOverride={TITLE_ACCENT[v.titleStatus] || '#e2e8f0'}
                  onTitleClick={() => navigate(`/acquisitions?v=${v.id}`)}
                  badge={
                    <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700 }}>
                      {v.titleStatus === 'issue' ? '⚠ ' : ''}{st.label}
                    </span>
                  }
                  pricePill={null}
                  actionButton={
                    <button
                      onClick={() => isActive ? closePanel() : openPanel(v)}
                      style={{ width: '100%', background: isActive ? '#0d2550' : '#fff', color: isActive ? '#fff' : '#0d2550', border: '1.5px solid #0d2550', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {isActive ? '← Viewing' : 'View Title'}
                    </button>
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    {days !== null && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: days >= 30 ? '#b91c1c' : '#6b7280' }}>
                        {days}d waiting
                      </span>
                    )}
                    {v.titleStatus === 'issue' && v.titleNotes && (
                      <span style={{ fontSize: 10, color: '#991b1b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {v.titleNotes}</span>
                    )}
                  </div>
                </VehicleCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-out panel */}
      {pv && (
        <div style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: 460,
          background: '#fff', borderLeft: '1px solid #e5e7eb',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
          zIndex: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          {/* Close */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 18px 0' }}>
            <button onClick={closePanel}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: 20, width: 30, height: 30, cursor: 'pointer', fontSize: 18, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>

          {/* Vehicle hero */}
          <div style={{ padding: '4px 20px 20px' }}>
            {pv.photos?.[0]
              ? <img src={pv.photos[0]} alt="" style={{ width: '100%', height: 168, objectFit: 'cover', borderRadius: 10, marginBottom: 14 }} />
              : <div style={{ width: '100%', height: 120, background: '#f1f5f9', borderRadius: 10, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#cbd5e1', letterSpacing: 2 }}>
                    {[pv.make?.[0], pv.model?.[0]].filter(Boolean).join('').toUpperCase()}
                  </span>
                </div>
            }
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>
              {[pv.year, pv.make, pv.model].filter(Boolean).join(' ') || 'Unknown Vehicle'}
            </div>
            {pv.trim && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{pv.trim}</div>}
            {(() => {
              const parts = [pv.color, pv.condition, pv.mileage != null ? `${parseInt(pv.mileage).toLocaleString()} mi` : null].filter(Boolean);
              return parts.length > 0 ? <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{parts.join(' · ')}</div> : null;
            })()}
            {pv.vin && <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#c4c9d3', marginTop: 3 }}>···{pv.vin.slice(-6).toUpperCase()}</div>}

            {/* Stat boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
              <div style={{ background: pvSt?.bg || '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Status</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: pvSt?.color || '#374151', lineHeight: 1.2 }}>{pvSt?.label || '—'}</div>
              </div>
              <div style={{ background: pvDays >= 30 ? '#fee2e2' : '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Waiting</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: pvDays >= 30 ? '#991b1b' : '#374151', lineHeight: 1 }}>{pvDays !== null ? `${pvDays}d` : '—'}</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Destination</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: pvIsAwarded ? '#0d2550' : '#6b7280', lineHeight: 1.2 }}>
                  {pvIsAwarded ? (pv.winnerName || '—') : 'Internal'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9' }} />

          {/* Title details + actions */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em' }}>Title</div>

            {pv.datePurchased && (
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Purchased {new Date(pv.datePurchased + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            )}

            {pv.titleStatus === 'issue' && pv.titleNotes && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b' }}>
                <span style={{ fontWeight: 700 }}>Issue: </span>{pv.titleNotes}
              </div>
            )}

            {isWholesale && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {pv.titleStatus === 'issue' ? (
                  <button onClick={resolveIssue} disabled={saving === pv.id}
                    style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving === pv.id ? 0.6 : 1 }}>
                    {saving === pv.id ? '…' : '✓ Resolve Issue'}
                  </button>
                ) : pvNext ? (
                  <button onClick={() => advanceStatus(pv)} disabled={saving === pv.id}
                    style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving === pv.id ? 0.6 : 1 }}>
                    {saving === pv.id ? '…' : NEXT_LABEL[pv.titleStatus]}
                  </button>
                ) : null}

                {pv.titleStatus !== 'issue' && pv.titleStatus !== 'clear' && !showIssueForm && (
                  <button onClick={() => setShowIssueForm(true)}
                    style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    ⚠ Flag Issue
                  </button>
                )}

                {showIssueForm && (
                  <div style={{ border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px', background: '#fef2f2', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '.06em' }}>Describe the issue</div>
                    <textarea
                      autoFocus
                      value={issueNote}
                      onChange={e => setIssueNote(e.target.value)}
                      placeholder="e.g. Wrong mileage on title, needs seller signature…"
                      rows={3}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1.5px solid #fecaca', borderRadius: 6, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', background: '#fff' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={flagIssue} disabled={!issueNote.trim() || saving === pv.id}
                        style={{ flex: 1, background: '#991b1b', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (!issueNote.trim() || saving === pv.id) ? 0.6 : 1 }}>
                        {saving === pv.id ? 'Saving…' : 'Flag Issue'}
                      </button>
                      <button onClick={() => { setShowIssueForm(false); setIssueNote(''); }}
                        style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#991b1b' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
