import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

const STATUS = {
  pending:  { label: 'Pending',  color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  received: { label: 'Received', color: '#1e40af', bg: '#dbeafe', border: '#93c5fd' },
  clear:    { label: 'Clear',    color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
  issue:    { label: 'Issue',    color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
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

  const isWholesale = ['wholesale', 'gm', 'admin'].includes(user?.role);
  const isBidder = user?.role === 'bidder';

  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'all' | 'pending' | 'received' | 'clear' | 'issue'
  const [issueModal, setIssueModal] = useState(null); // vehicle
  const [issueNote, setIssueNote] = useState('');
  const [saving, setSaving] = useState(null);

  // Which vehicles to show
  const vehicles = (data.vehicles || []).filter(v => {
    if (isBidder) {
      // Retail: only their won vehicles where title is coming to them
      return v.status === 'awarded' && (v.winnerId === user.id || v.locationId === user.locationId);
    }
    return true; // wholesale/admin: all
  }).filter(v => {
    if (statusFilter === 'active') return ['pending', 'received', 'issue'].includes(v.titleStatus);
    if (statusFilter === 'all') return true;
    return v.titleStatus === statusFilter;
  }).sort((a, b) => (daysSince(b) ?? 0) - (daysSince(a) ?? 0)); // oldest first

  const advanceStatus = async (v) => {
    const next = NEXT[v.titleStatus];
    if (!next) return;
    setSaving(v.id);
    const { error } = await supabase.from('vehicles').update({ title_status: next }).eq('id', v.id);
    if (error) { showToast(`Failed: ${error.message}`, 'error'); }
    else {
      setVehicles(prev => prev.map(vv => vv.id === v.id ? { ...vv, titleStatus: next } : vv));
      showToast(`Title marked ${STATUS[next].label.toLowerCase()}`, 'success');
    }
    setSaving(null);
  };

  const flagIssue = async () => {
    if (!issueNote.trim()) return;
    setSaving(issueModal.id);
    const { error } = await supabase.from('vehicles')
      .update({ title_status: 'issue', title_notes: issueNote.trim() })
      .eq('id', issueModal.id);
    if (error) { showToast('Failed to flag issue', 'error'); }
    else {
      setVehicles(prev => prev.map(vv => vv.id === issueModal.id ? { ...vv, titleStatus: 'issue', titleNotes: issueNote.trim() } : vv));
      showToast('Issue flagged', 'success');
      setIssueModal(null);
      setIssueNote('');
    }
    setSaving(null);
  };

  const resolveIssue = async (v) => {
    setSaving(v.id);
    const { error } = await supabase.from('vehicles')
      .update({ title_status: 'received', title_notes: null })
      .eq('id', v.id);
    if (error) { showToast('Failed to resolve issue', 'error'); }
    else {
      setVehicles(prev => prev.map(vv => vv.id === v.id ? { ...vv, titleStatus: 'received', titleNotes: null } : vv));
      showToast('Issue resolved — title marked Received', 'success');
    }
    setSaving(null);
  };

  const counts = {
    active: (data.vehicles || []).filter(v => ['pending','received','issue'].includes(v.titleStatus)).length,
    pending: (data.vehicles || []).filter(v => v.titleStatus === 'pending').length,
    received: (data.vehicles || []).filter(v => v.titleStatus === 'received').length,
    issue: (data.vehicles || []).filter(v => v.titleStatus === 'issue').length,
    clear: (data.vehicles || []).filter(v => v.titleStatus === 'clear').length,
  };

  const FILTER_TABS = [
    { key: 'active',   label: 'Active',   count: counts.active },
    { key: 'pending',  label: 'Pending',  count: counts.pending },
    { key: 'received', label: 'Received', count: counts.received },
    { key: 'issue',    label: 'Issue',    count: counts.issue },
    { key: 'clear',    label: 'Clear',    count: counts.clear },
    { key: 'all',      label: 'All',      count: (data.vehicles || []).length },
  ];

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Titles</h1>
          <p>{isWholesale ? 'Track title status for every vehicle in the pipeline.' : 'Title status for your vehicles.'}</p>
        </div>
      </div>

      {/* Pipeline legend */}
      {isWholesale && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          {['pending','received','clear'].map((s, i) => (
            <React.Fragment key={s}>
              <span style={{ background: STATUS[s].bg, color: STATUS[s].color, border: `1px solid ${STATUS[s].border}`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                {STATUS[s].label}
              </span>
              {i < 2 && <span style={{ color: '#d1d5db', fontSize: 14 }}>→</span>}
            </React.Fragment>
          ))}
          <span style={{ color: '#d1d5db', marginLeft: 4 }}>·</span>
          <span style={{ background: STATUS.issue.bg, color: STATUS.issue.color, border: `1px solid ${STATUS.issue.border}`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
            ⚠ Issue (flag anytime)
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTER_TABS.map(t => (
          <button key={t.key} onClick={() => setStatusFilter(t.key)} style={{
            padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${statusFilter === t.key ? '#0d2550' : '#e5e7eb'}`,
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

      {/* Vehicle list */}
      {vehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: .3 }}>📄</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No titles to show</div>
          <div style={{ fontSize: 13 }}>
            {statusFilter === 'active' ? 'All titles are clear.' : `No vehicles with status "${statusFilter}".`}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {vehicles.map(v => {
            const st = STATUS[v.titleStatus] || STATUS.pending;
            const days = daysSince(v);
            const next = NEXT[v.titleStatus];
            const isAwarded = v.status === 'awarded';
            const vin6 = v.vin ? v.vin.slice(-6).toUpperCase() : null;

            return (
              <div key={v.id} style={{ background: '#fff', border: `1px solid ${v.titleStatus === 'issue' ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Vehicle info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                      {v.year} {v.make} {v.model}{v.trim ? ` ${v.trim}` : ''}
                    </span>
                    <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                      {v.titleStatus === 'issue' ? '⚠ ' : ''}{st.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {vin6 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>VIN</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', fontFamily: 'monospace' }}>···{vin6}</div>
                      </div>
                    )}
                    {days !== null && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Days waiting</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: days >= 30 ? '#991b1b' : '#374151' }}>{days}d</div>
                      </div>
                    )}
                    {v.datePurchased && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Purchased</div>
                        <div style={{ fontSize: 12, color: '#374151' }}>{new Date(v.datePurchased + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>
                        {isAwarded ? 'Title going to' : 'Destination'}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isAwarded ? '#0d2550' : '#6b7280' }}>
                        {isAwarded ? v.winnerName || '—' : 'Internal'}
                      </div>
                    </div>
                  </div>

                  {/* Issue note */}
                  {v.titleStatus === 'issue' && v.titleNotes && (
                    <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#991b1b' }}>
                      <span style={{ fontWeight: 700 }}>Issue: </span>{v.titleNotes}
                    </div>
                  )}
                </div>

                {/* Actions — wholesale/admin only */}
                {isWholesale && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
                    {v.titleStatus === 'issue' ? (
                      <button
                        onClick={() => resolveIssue(v)}
                        disabled={saving === v.id}
                        style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving === v.id ? .6 : 1 }}
                      >
                        ✓ Resolve issue
                      </button>
                    ) : next ? (
                      <button
                        onClick={() => advanceStatus(v)}
                        disabled={saving === v.id}
                        style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving === v.id ? .6 : 1 }}
                      >
                        {saving === v.id ? '…' : NEXT_LABEL[v.titleStatus]}
                      </button>
                    ) : null}

                    {v.titleStatus !== 'issue' && v.titleStatus !== 'clear' && (
                      <button
                        onClick={() => { setIssueModal(v); setIssueNote(''); }}
                        style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        ⚠ Flag issue
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Issue modal */}
      {issueModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Flag title issue</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
              {issueModal.year} {issueModal.make} {issueModal.model}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
              What's the issue?
            </div>
            <textarea
              autoFocus
              value={issueNote}
              onChange={e => setIssueNote(e.target.value)}
              placeholder="e.g. Wrong mileage on title, needs seller signature, title lost in mail…"
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
              <button onClick={() => setIssueModal(null)} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={flagIssue}
                disabled={!issueNote.trim() || saving === issueModal?.id}
                style={{ padding: '9px 18px', background: '#991b1b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (!issueNote.trim() || saving === issueModal?.id) ? .6 : 1 }}
              >
                {saving === issueModal?.id ? 'Saving…' : 'Flag issue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
