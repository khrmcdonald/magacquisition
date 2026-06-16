import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TEAM_PHOTO from '../teamPhoto';
import { useAuth } from '../context/AuthContext';



export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const user = login(pin);
      if (user) {
        if (user.role === 'wholesale') navigate('/acquisitions');
        else if (user.role === 'gm') navigate('/overview');
        else if (user.role === 'admin') navigate('/admin');
        else navigate('/auction');
      } else {
        setError('Invalid PIN. Please try again.');
        setPin('');
      }
      setLoading(false);
    }, 300);
  };

  const handleKey = (digit) => {
    if (pin.length < 6) setPin(p => p + digit);
  };

  const handleBackspace = () => setPin(p => p.slice(0, -1));

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a3d76',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        textAlign: 'center',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Team photo banner */}
        <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
          <img
            src={TEAM_PHOTO}
            alt="McDonald Auto Group Team"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(26,61,118,0.1) 0%, rgba(26,61,118,0.8) 100%)',
          }} />
          <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0 }}>
            <div style={{ color: '#f1bb25', fontWeight: 800, fontSize: 22, letterSpacing: '.03em' }}>
              MAG Acquisition
            </div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 3, fontWeight: 500 }}>
              McDonald Auto Group · Internal Auction
            </div>
          </div>
        </div>

        {/* PIN pad */}
        <div style={{ padding: '28px 36px 36px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: 48, height: 56, borderRadius: 10,
                border: `2px solid ${pin.length > i ? '#1a3d76' : '#e5e7eb'}`,
                background: pin.length > i ? '#f0f4fb' : '#f9fafb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, color: '#1a3d76', transition: 'all 0.15s',
              }}>
                {pin.length > i ? '●' : ''}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button key={n} type="button" onClick={() => handleKey(String(n))}
                style={{ background: '#f5f6f8', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 0', fontSize: 20, fontWeight: 600, color: '#111827', cursor: 'pointer' }}
                onMouseDown={e => e.currentTarget.style.background = '#e5e7eb'}
                onMouseUp={e => e.currentTarget.style.background = '#f5f6f8'}
              >{n}</button>
            ))}
            <button type="button" onClick={handleBackspace}
              style={{ background: '#f5f6f8', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 0', fontSize: 16, fontWeight: 600, color: '#6b7280', cursor: 'pointer' }}>
              ←
            </button>
            <button type="button" onClick={() => handleKey('0')}
              style={{ background: '#f5f6f8', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 0', fontSize: 20, fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
              0
            </button>
            <button type="button" onClick={handleSubmit}
              style={{ background: pin.length >= 4 ? '#1a3d76' : '#e5e7eb', border: 'none', borderRadius: 10, padding: '16px 0', fontSize: 14, fontWeight: 700, color: pin.length >= 4 ? '#fff' : '#9ca3af', cursor: pin.length >= 4 ? 'pointer' : 'default', transition: 'background 0.15s' }}>
              {loading ? '...' : 'Enter'}
            </button>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
              {error}
            </div>
          )}
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 16 }}>Enter your store PIN to continue</p>
        </div>
      </div>
    </div>
  );
}
