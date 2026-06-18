import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { USERS } from '../context/AuthContext';
import { StoreAvatar } from '../components/StoreAvatar';

const STORES = USERS.filter(u => u.role === 'bidder');

function BadgeShelf({ badges, badgeDefs, highlight }) {
  if (!badges || badges.length === 0) return (
    <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>No badges yet</span>
  );
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {badges.map(badgeId => {
        const def = badgeDefs.find(b => b.id === badgeId);
        if (!def) return null;
        return (
          <div
            key={badgeId}
            title={def.desc}
            style={{
              background: highlight ? '#f0f4fb' : '#f5f6f8',
              border: `1px solid ${highlight ? '#c7d6ef' : '#e5e7eb'}`,
              borderRadius: 20,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              cursor: 'default',
            }}
          >
            <span>{def.icon}</span>
            <span>{def.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Leaderboard() {
  const { data, computeBadges, BADGE_DEFS } = useData();
  const { user } = useAuth();
  const [tab, setTab] = useState('board');

  const storeStats = STORES.map(store => {
    const wins = data.vehicles.filter(v => v.status === 'awarded' && v.winnerId === store.id);
    const bids = data.bids.filter(b => b.storeId === store.id);
    const totalSpend = wins.reduce((s, v) => s + (v.winningBid || 0), 0);
    const activeBids = bids.filter(b => data.vehicles.find(v => v.id === b.vehicleId && v.status === 'active'));
    const activeWinning = activeBids.filter(b => {
      const allBids = data.bids.filter(bb => bb.vehicleId === b.vehicleId);
      const high = Math.max(...allBids.map(bb => bb.amount));
      return b.amount >= high;
    });
    const winRate = bids.length > 0 ? Math.round((wins.length / Math.max(bids.length, 1)) * 100) : 0;
    const earnedBadges = computeBadges(store.id);
    const storedBadges = data.badges?.[store.id] || [];
    const allBadges = [...new Set([...earnedBadges, ...storedBadges])];
    return { ...store, wins: wins.length, bids: bids.length, totalSpend, winRate, activeWinning: activeWinning.length, badges: allBadges };
  }).sort((a, b) => b.wins - a.wins || b.totalSpend - a.totalSpend);

  const isMyStore = (storeId) => user.id === storeId;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div>
      <div className="page-header">
        <h1>🏆 Leaderboard</h1>
        <p>Live standings across all MAG stores</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 24 }}>
        {[['board', '🏆 Standings'], ['badges', '🎖 Badges']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '10px 20px', border: 'none', background: 'none', fontSize: 14, fontWeight: 600,
            color: tab === key ? '#1a3d76' : '#6b7280',
            borderBottom: `2px solid ${tab === key ? '#1a3d76' : 'transparent'}`,
            marginBottom: -2, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'board' && (
        <>
          {/* Top 3 podium */}
          {storeStats.filter(s => s.wins > 0).length >= 2 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
              {storeStats.slice(0, 3).map((store, i) => (
                <div key={store.id} style={{
                  background: isMyStore(store.id) ? '#f0f4fb' : '#fff',
                  border: `2px solid ${i === 0 ? '#f1bb25' : i === 1 ? '#9ca3af' : '#cd7f32'}`,
                  borderRadius: 16,
                  padding: '20px 24px',
                  textAlign: 'center',
                  minWidth: 140,
                  order: i === 0 ? 0 : i === 1 ? -1 : 1,
                  marginTop: i === 0 ? 0 : 20,
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{medals[i]}</div>
                  <div style={{ margin: '0 auto 10px', display: 'flex', justifyContent: 'center' }}><StoreAvatar storeId={store.id} size={48} /></div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{store.name}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#1a3d76', margin: '6px 0 2px' }}>{store.wins}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>cars won</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginTop: 6 }}>${store.totalSpend.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}

          {/* Full table */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            {storeStats.map((store, i) => (
              <div key={store.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                borderBottom: i < storeStats.length - 1 ? '1px solid #f3f4f6' : 'none',
                background: isMyStore(store.id) ? '#f0f4fb' : '#fff',
              }}>
                {/* Rank */}
                <div style={{ width: 32, fontWeight: 800, fontSize: 18, color: i < 3 ? ['#f1bb25','#9ca3af','#cd7f32'][i] : '#e5e7eb', flexShrink: 0, textAlign: 'center' }}>
                  {i < 3 ? medals[i] : `#${i+1}`}
                </div>

                {/* Store avatar */}
                <StoreAvatar storeId={store.id} size={44} />

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {store.name}
                    {isMyStore(store.id) && <span style={{ background: '#1a3d76', color: '#f1bb25', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>YOU</span>}
                  </div>
                  {store.badges.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <BadgeShelf badges={store.badges.slice(0, 3)} badgeDefs={BADGE_DEFS} highlight={isMyStore(store.id)} />
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
                  {[
                    ['Cars won', store.wins, '#1a3d76'],
                    ['Total spend', `$${(store.totalSpend/1000).toFixed(0)}k`, '#374151'],
                    ['Bids', store.bids, '#6b7280'],
                    ['Win rate', `${store.winRate}%`, store.winRate >= 50 ? '#065f46' : '#6b7280'],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ textAlign: 'center', minWidth: 56 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
                    </div>
                  ))}
                  {data.auction.isOpen && (
                    <div style={{ textAlign: 'center', minWidth: 56 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: store.activeWinning > 0 ? '#065f46' : '#9ca3af' }}>{store.activeWinning}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Winning</div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {storeStats.every(s => s.wins === 0 && s.bids === 0) && (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>The race hasn't started yet</p>
                <span style={{ fontSize: 13 }}>Standings will appear once bidding begins</span>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'badges' && (
        <div>
          {/* Badge legend */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 16 }}>All badges</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {BADGE_DEFS.map(badge => (
                <div key={badge.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: '#f5f6f8', borderRadius: 10 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{badge.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{badge.label}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{badge.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-store badge shelves */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {storeStats.map(store => {
              const earnedBadges = computeBadges(store.id);
              const storedBadges = data.badges?.[store.id] || [];
              const allBadges = [...new Set([...earnedBadges, ...storedBadges])];
              return (
                <div key={store.id} style={{
                  background: isMyStore(store.id) ? '#f0f4fb' : '#fff',
                  border: `1px solid ${isMyStore(store.id) ? '#c7d6ef' : '#e5e7eb'}`,
                  borderRadius: 12, padding: '16px 20px',
                  display: 'flex', gap: 16, alignItems: 'flex-start',
                }}>
                  <StoreAvatar storeId={store.id} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 8 }}>
                      {store.name}
                      {isMyStore(store.id) && <span style={{ background: '#1a3d76', color: '#f1bb25', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginLeft: 8 }}>YOU</span>}
                    </div>
                    <BadgeShelf badges={allBadges} badgeDefs={BADGE_DEFS} highlight={isMyStore(store.id)} />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1a3d76', flexShrink: 0 }}>
                    {allBadges.length} <span style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af' }}>badges</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
