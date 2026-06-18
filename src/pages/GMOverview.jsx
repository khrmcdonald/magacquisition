import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { USERS } from '../context/AuthContext';
import { StoreAvatar } from '../components/StoreAvatar';
import { StatusBadge } from '../components/StatusBadge';
import { Navigate } from 'react-router-dom';

const STORES = USERS.filter(u => u.role === 'bidder');

export default function GMOverview() {
  const { user } = useAuth();
  const { data, getAllBidsForVehicle } = useData();
  const [tab, setTab] = useState('results');

  if (user.role !== 'gm' && user.role !== 'admin' && user.role !== 'wholesale') {
    return <Navigate to="/auction" replace />;
  }

  const awarded = data.vehicles.filter(v => v.status === 'awarded');
  const noSale = data.vehicles.filter(v => v.status === 'no_sale');
  const active = data.vehicles.filter(v => v.status === 'active');

  const totalBidVolume = awarded.reduce((sum, v) => sum + (v.winningBid || 0), 0);
  const totalCostBasis = awarded.reduce((sum, v) => sum + (parseFloat(v.totalCost) || 0), 0);
  const totalMargin = totalBidVolume - totalCostBasis;

  const storeSummary = STORES.map(store => {
    const wins = awarded.filter(v => v.winnerId === store.id);
    const totalSpend = wins.reduce((s, v) => s + (v.winningBid || 0), 0);
    const bids = data.bids.filter(b => b.storeId === store.id);
    return { ...store, wins: wins.length, totalSpend, bids: bids.length, vehicles: wins };
  });

  return (
    <div>
      <div className="page-header">
        <h1>GM Overview</h1>
        <p>Full group performance — all stores, all bids, all cost data</p>
      </div>

      {/* Top stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Cars awarded</div>
          <div className="stat-value">{awarded.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">No sale</div>
          <div className="stat-value" style={{ color: '#991b1b' }}>{noSale.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bid volume</div>
          <div className="stat-value" style={{ fontSize: 18 }}>${totalBidVolume.toLocaleString()}</div>
        </div>
        {(user.role === 'gm' || user.role === 'admin') && (
          <>
            <div className="stat-card">
              <div className="stat-label">Total cost basis</div>
              <div className="stat-value" style={{ fontSize: 18 }}>${totalCostBasis.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Group margin</div>
              <div className="stat-value" style={{ fontSize: 18, color: totalMargin >= 0 ? '#065f46' : '#991b1b' }}>
                ${totalMargin.toLocaleString()}
              </div>
            </div>
          </>
        )}
        <div className="stat-card">
          <div className="stat-label">Total bids placed</div>
          <div className="stat-value">{data.bids.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {[['results', 'Auction results'], ['stores', 'By store'], ['vehicles', 'All vehicles']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              fontSize: 14,
              fontWeight: 600,
              color: tab === key ? '#1a3d76' : '#6b7280',
              borderBottom: `2px solid ${tab === key ? '#1a3d76' : 'transparent'}`,
              marginBottom: -2,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results tab */}
      {tab === 'results' && (
        <div>
          {awarded.length === 0 && noSale.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <p>No auction results yet</p>
              <span>Results appear here after an auction closes</span>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>VIN</th>
                      <th>Winner</th>
                      <th>Winning bid</th>
                      {(user.role === 'gm' || user.role === 'admin') && <>
                        <th>Cost basis</th>
                        <th>Margin</th>
                      </>}
                      <th>Transport</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...awarded, ...noSale].map(v => {
                      const transport = data.transport.find(t => t.vehicleId === v.id);
                      const margin = v.winningBid && v.totalCost ? (v.winningBid - parseFloat(v.totalCost)) : null;
                      return (
                        <tr key={v.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{v.year} {v.make} {v.model}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{v.trim} · {v.color}</div>
                          </td>
                          <td><span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{v.vin || '—'}</span></td>
                          <td>
                            {v.winnerName ? (
                              <span style={{ background: '#e8eef5', color: '#1a3d76', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                {v.winnerName}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ fontWeight: 700, fontSize: 14, color: '#1a3d76' }}>
                            {v.winningBid ? `$${v.winningBid.toLocaleString()}` : '—'}
                          </td>
                          {(user.role === 'gm' || user.role === 'admin') && <>
                            <td style={{ color: '#6b7280' }}>{v.totalCost ? `$${parseFloat(v.totalCost).toLocaleString()}` : '—'}</td>
                            <td style={{ fontWeight: 600, color: margin > 0 ? '#065f46' : margin < 0 ? '#991b1b' : '#6b7280' }}>
                              {margin !== null ? `$${margin.toLocaleString()}` : '—'}
                            </td>
                          </>}
                          <td>
                            {transport ? (
                              <span style={{ fontSize: 12, color: '#374151', textTransform: 'capitalize' }}>
                                {transport.status === 'titleReceived' ? '✅ Complete' :
                                  transport.status === 'arrived' ? '✅ Arrived' :
                                  transport.status === 'inTransit' ? '🚚 In transit' :
                                  transport.status === 'dispatched' ? '📦 Dispatched' : '⏳ Pending'}
                              </span>
                            ) : '—'}
                          </td>
                          <td>
                            <span className={`badge ${v.status === 'awarded' ? 'badge-green' : 'badge-red'}`}>
                              {v.status === 'awarded' ? 'Awarded' : 'No sale'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* By store tab */}
      {tab === 'stores' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {storeSummary.map(store => (
            <div key={store.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a3d76', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f1bb25', fontWeight: 800, fontSize: 13 }}>
                  {store.id}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{store.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Retail store</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ background: '#f5f6f8', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Cars won</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1a3d76' }}>{store.wins}</div>
                </div>
                <div style={{ background: '#f5f6f8', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Bids placed</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#374151' }}>{store.bids}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #f3f4f6', fontSize: 13 }}>
                <span style={{ color: '#6b7280' }}>Total spend</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>${store.totalSpend.toLocaleString()}</span>
              </div>
              {store.vehicles.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {store.vehicles.slice(0, 3).map(v => (
                    <div key={v.id} style={{ fontSize: 12, color: '#374151', padding: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{v.year} {v.make} {v.model}</span>
                      <span style={{ fontWeight: 600 }}>${v.winningBid?.toLocaleString()}</span>
                    </div>
                  ))}
                  {store.vehicles.length > 3 && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>+{store.vehicles.length - 3} more</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* All vehicles tab */}
      {tab === 'vehicles' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Condition</th>
                  <th>Miles</th>
                  <th>Status</th>
                  <th>Bids</th>
                  <th>High bid</th>
                  {(user.role === 'gm' || user.role === 'admin') && <th>Floor / Cost</th>}
                </tr>
              </thead>
              <tbody>
                {data.vehicles.map(v => {
                  const bids = getAllBidsForVehicle(v.id);
                  const highBid = bids[0];
                  const transport = data.transport.find(t => t.vehicleId === v.id);
                  return (
                    <tr key={v.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{v.year} {v.make} {v.model}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{v.trim} · {v.color}</div>
                      </td>
                      <td><span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{v.condition}</span></td>
                      <td>{v.mileage ? `${parseInt(v.mileage).toLocaleString()} mi` : '—'}</td>
                      <td><StatusBadge vehicle={v} transport={transport} size="sm" useShort /></td>
                      <td>{bids.length}</td>
                      <td style={{ fontWeight: 600, color: '#1a3d76' }}>{highBid ? `$${highBid.amount.toLocaleString()}` : '—'}</td>
                      {(user.role === 'gm' || user.role === 'admin') && (
                        <td style={{ fontSize: 12, color: '#6b7280' }}>
                          {v.floorPrice ? `Floor $${parseFloat(v.floorPrice).toLocaleString()}` : ''}{v.floorPrice && v.totalCost ? ' / ' : ''}{v.totalCost ? `Cost $${parseFloat(v.totalCost).toLocaleString()}` : ''}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {data.vehicles.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No vehicles in the system yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
