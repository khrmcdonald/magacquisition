import React, { useState, useRef } from 'react';
import { StoreAvatar } from '../components/StoreAvatar';
import { useAuth, USERS } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Navigate } from 'react-router-dom';

export default function Admin() {
  const { user } = useAuth();
  const { data, updateStorePhoto } = useData();
  const fileRefs = React.useRef({});
  const [users, setUsers] = useState(() =>
    JSON.parse(localStorage.getItem('mag_users') || 'null') || USERS
  );
  const [editUser, setEditUser] = useState(null);
  const [editPin, setEditPin] = useState('');
  const [editName, setEditName] = useState('');
  const [saved, setSaved] = useState(false);

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

  const totalVehicles = data.vehicles.length;
  const activeAuction = data.auction.isOpen;

  return (
    <div>
      <div className="page-header">
        <h1>Admin</h1>
        <p>Manage store users and PINs</p>
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
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Store users & PINs</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Click Edit to change a store's PIN or display name</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Store ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>PIN</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a3d76', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#f1bb25', fontWeight: 800, fontSize: 11 }}>
                    {u.id}
                  </div>
                </td>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td><span className={`badge ${roleBadge[u.role] || 'badge-gray'}`}>{roleLabel[u.role]}</span></td>
                <td>
                  <span style={{ fontFamily: 'monospace', background: '#f3f4f6', padding: '4px 10px', borderRadius: 6, fontSize: 14, letterSpacing: '0.15em', fontWeight: 700 }}>
                    {'●'.repeat(u.pin.length)}
                  </span>
                </td>
                <td>
                  <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => handleEdit(u)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick reference - show actual PINs for admin */}
      <div className="card" style={{ background: '#fff8e7', border: '1px solid #f1bb25' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 12 }}>PIN reference (admin only)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #f1bb25' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{u.name}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1a3d76', fontSize: 14, letterSpacing: '.1em' }}>{u.pin}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Edit modal */}
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
                <input
                  type="number"
                  value={editPin}
                  onChange={e => setEditPin(e.target.value.slice(0, 8))}
                  placeholder="Enter new PIN"
                />
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
