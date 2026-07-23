import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { VehicleCard, isTitleIn } from '../components/VehicleCard';

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

  const [filter, setFilter] = useState('out');
  const [saving, setSaving] = useState(null);

  const allVehicles = (data.vehicles || []).filter(v => {
    if (v.status === 'sold') return false;
    if (isBidder) return v.status === 'awarded' && (v.winnerId === user.id || v.locationId === user.locationId);
    return true;
  });

  const countOut = allVehicles.filter(v => !isTitleIn(v.titleStatus)).length;
  const countIn  = allVehicles.filter(v =>  isTitleIn(v.titleStatus)).length;

  const vehicles = allVehicles
    .filter(v => filter === 'out' ? !isTitleIn(v.titleStatus) : isTitleIn(v.titleStatus))
    .sort((a, b) => (daysSince(b) ?? 0) - (daysSince(a) ?? 0));

  const toggleTitle = async (v) => {
    const newStatus = isTitleIn(v.titleStatus) ? 'pending' : 'clear';
    setSaving(v.id);
    const { error } = await supabase.from('vehicles')
      .update({ title_status: newStatus })
      .eq('id', v.id);
    if (error) {
      showToast(`Failed: ${error.message}`, 'error');
    } else {
      setVehicles(prev => prev.map(vv => vv.id === v.id ? { ...vv, titleStatus: newStatus } : vv));
      showToast(newStatus === 'clear' ? '✓ Title marked IN' : 'Title marked OUT', newStatus === 'clear' ? 'success' : 'info');
    }
    setSaving(null);
  };

  return (
    <div style={{ padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Titles</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 0 }}>
          Track which vehicles have their title in hand.
        </p>
      </div>

      {/* Stat boxes */}
      {isWholesale && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20, maxWidth: 400 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: '3px solid #ef4444', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Title OUT</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#991b1b', lineHeight: 1 }}>{countOut}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: '3px solid #10b981', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Title IN</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#065f46', lineHeight: 1 }}>{countIn}</div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setFilter('out')} style={{
          padding: '8px 20px', borderRadius: 20,
          border: `1.5px solid ${filter === 'out' ? '#991b1b' : '#e5e7eb'}`,
          background: filter === 'out' ? '#fee2e2' : '#f9fafb',
          color: filter === 'out' ? '#991b1b' : '#6b7280',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          Title OUT
          <span style={{ background: filter === 'out' ? '#fca5a5' : '#e5e7eb', color: filter === 'out' ? '#991b1b' : '#6b7280', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 800 }}>
            {countOut}
          </span>
        </button>
        <button onClick={() => setFilter('in')} style={{
          padding: '8px 20px', borderRadius: 20,
          border: `1.5px solid ${filter === 'in' ? '#065f46' : '#e5e7eb'}`,
          background: filter === 'in' ? '#d1fae5' : '#f9fafb',
          color: filter === 'in' ? '#065f46' : '#6b7280',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          Title IN
          <span style={{ background: filter === 'in' ? '#6ee7b7' : '#e5e7eb', color: filter === 'in' ? '#065f46' : '#6b7280', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 800 }}>
            {countIn}
          </span>
        </button>
      </div>

      {/* Grid */}
      {vehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af', fontSize: 13 }}>
          {filter === 'out' ? 'All titles are in hand.' : 'No vehicles with title in hand yet.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {vehicles.map(v => {
            const days = daysSince(v);
            const titleIn = isTitleIn(v.titleStatus);

            return (
              <VehicleCard
                key={v.id}
                variant="grid"
                vehicle={v}
                mileage={v.mileage}
                accentOverride={titleIn ? '#10b981' : '#ef4444'}
                onTitleClick={() => navigate(`/acquisitions?v=${v.id}`)}
                badge={
                  <span style={{
                    background: titleIn ? '#d1fae5' : '#fee2e2',
                    color: titleIn ? '#065f46' : '#991b1b',
                    border: `1px solid ${titleIn ? '#6ee7b7' : '#fca5a5'}`,
                    padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  }}>
                    {titleIn ? 'Title IN' : 'Title OUT'}
                  </span>
                }
                pricePill={null}
                actionButton={
                  isWholesale ? (
                    <button
                      onClick={() => toggleTitle(v)}
                      disabled={saving === v.id}
                      style={{
                        width: '100%',
                        background: titleIn ? '#fee2e2' : '#d1fae5',
                        color: titleIn ? '#991b1b' : '#065f46',
                        border: `1.5px solid ${titleIn ? '#fca5a5' : '#6ee7b7'}`,
                        borderRadius: 7, padding: '8px 0',
                        fontSize: 12, fontWeight: 700,
                        cursor: saving === v.id ? 'not-allowed' : 'pointer',
                        opacity: saving === v.id ? 0.6 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      {saving === v.id ? '…' : titleIn ? 'Mark Title OUT' : 'Mark Title IN'}
                    </button>
                  ) : null
                }
              >
                {days !== null && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: days >= 30 ? '#b91c1c' : '#6b7280', marginBottom: 6 }}>
                    {days}d since purchase
                  </div>
                )}
              </VehicleCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
