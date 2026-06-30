import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import heroImage from '../assets/gmc-hero.jpg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const user = await login(email.trim(), password);
    if (user) {
      if (user.role === 'wholesale' || user.role === 'admin') navigate('/dashboard');
      else if (user.role === 'gm') navigate('/overview');
      else navigate('/auction');
    } else {
      setError('Invalid email or password. Please try again.');
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .login-email-input:focus,
        .login-password-input:focus {
          border-color: #0d2550 !important;
          outline: none;
        }
        .login-submit-btn:hover:not(:disabled) {
          background: #142d58 !important;
        }
        @media (max-width: 768px) {
          .login-left-panel {
            width: 100% !important;
            height: 200px !important;
            flex-shrink: 0;
          }
          .login-left-content {
            padding: 20px 24px !important;
          }
          .login-left-logo {
            position: static !important;
            display: block;
            margin-bottom: 8px;
          }
          .login-tagline {
            font-size: 26px !important;
          }
          .login-subtitle {
            display: none;
          }
          .login-powered {
            display: none;
          }
          .login-right-panel {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            flex: 1;
          }
          .login-wrapper {
            flex-direction: column !important;
          }
        }
      `}</style>

      <div
        className="login-wrapper"
        style={{
          display: 'flex',
          flexDirection: 'row',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        {/* ── LEFT PANEL ── */}
        <div
          className="login-left-panel"
          style={{
            position: 'relative',
            width: '55%',
            minHeight: '100vh',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* Background image */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${heroImage})`,
              backgroundPosition: 'center center',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
            }}
          />
          {/* Dark overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(13,37,80,0.85) 100%)',
            }}
          />

          {/* Content */}
          <div
            className="login-left-content"
            style={{
              position: 'relative',
              zIndex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              padding: '48px',
            }}
          >
            {/* Spacer — keeps tagline pushed down from top */}
            <div />

            {/* Tagline — bottom left */}
            <div style={{ marginTop: '80px' }}>
              <div
                className="login-tagline"
                style={{
                  fontSize: 56,
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.15,
                  marginBottom: 16,
                }}
              >
                Acquisition, simplified.
              </div>
              <div
                className="login-subtitle"
                style={{
                  fontSize: 20,
                  color: 'rgba(255,255,255,0.75)',
                  marginBottom: 24,
                }}
              >
                The private wholesale marketplace for your team.
              </div>
              <div
                className="login-powered"
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Powered by McDonald Auto Group
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
          className="login-right-panel"
          style={{
            flex: 1,
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
          }}
        >
          <div style={{ width: '100%', maxWidth: 380, padding: '0 40px' }}>
            {/* Wordmark — right panel */}
            <div style={{ borderLeft: '4px solid #e8b84b', paddingLeft: 16 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#0d2550', letterSpacing: '0.06em', lineHeight: 1 }}>
                STOCKYARD
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e8b84b', letterSpacing: '0.14em', marginTop: 6 }}>
                DEALER MARKETPLACE
              </div>
            </div>

            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#0d2550',
                marginTop: 32,
                marginBottom: 4,
              }}
            >
              Welcome back
            </div>
            <div
              style={{
                fontSize: 14,
                color: '#6b7280',
                marginBottom: 32,
              }}
            >
              Sign in to your account
            </div>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#374151',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Email
                </label>
                <input
                  className="login-email-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    height: 44,
                    padding: '0 14px',
                    fontSize: 14,
                    border: '1.5px solid #e5e7eb',
                    borderRadius: 8,
                    color: '#111827',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 0 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#374151',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      height: 44,
                      padding: '0 44px 0 14px',
                      fontSize: 14,
                      border: '1.5px solid #e5e7eb',
                      borderRadius: 8,
                      color: '#111827',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Sign In button */}
              <button
                className="login-submit-btn"
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: 44,
                  marginTop: 24,
                  background: '#0d2550',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.15s, opacity 0.15s',
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#ffffff',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                        display: 'inline-block',
                      }}
                    />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Error */}
              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: 12,
                    marginTop: 16,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, marginTop: 1 }}
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span style={{ fontSize: 13, color: '#dc2626', lineHeight: 1.4 }}>
                    {error}
                  </span>
                </div>
              )}

              <div
                style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  textAlign: 'center',
                  marginTop: 20,
                }}
              >
                Having trouble signing in? Contact your administrator.
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
