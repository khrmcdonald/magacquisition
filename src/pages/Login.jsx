import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TEAM_PHOTO from '../teamPhoto';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const user = await login(email.trim(), password);
    if (user) {
      if (user.role === 'wholesale') navigate('/acquisitions');
      else if (user.role === 'gm') navigate('/overview');
      else if (user.role === 'admin') navigate('/admin');
      else navigate('/auction');
    } else {
      setError('Invalid email or password. Please try again.');
    }
    setLoading(false);
  };

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
          <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center' }}>
            <div style={{ color: '#f1bb25', fontWeight: 800, fontSize: 22, letterSpacing: '.03em' }}>
              MAG Acquisition
            </div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 3, fontWeight: 500 }}>
              McDonald Auto Group · Internal Auction
            </div>
          </div>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} style={{ padding: '32px 36px 36px' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '11px 14px', fontSize: 15,
                border: '1.5px solid #e5e7eb', borderRadius: 10,
                outline: 'none', color: '#111827',
              }}
              onFocus={e => e.target.style.borderColor = '#1a3d76'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '11px 14px', fontSize: 15,
                border: '1.5px solid #e5e7eb', borderRadius: 10,
                outline: 'none', color: '#111827',
              }}
              onFocus={e => e.target.style.borderColor = '#1a3d76'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: '#991b1b',
              padding: '10px 14px', borderRadius: 8,
              fontSize: 13, fontWeight: 500, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              width: '100%', padding: '13px 0', fontSize: 15, fontWeight: 700,
              background: loading || !email || !password ? '#e5e7eb' : '#1a3d76',
              color: loading || !email || !password ? '#9ca3af' : '#fff',
              border: 'none', borderRadius: 10, cursor: loading || !email || !password ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
