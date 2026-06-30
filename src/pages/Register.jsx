import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import heroImage from '../assets/gmc-hero.jpg';

const ORG_ID = 'bf236d2b-4693-4606-bf3d-ece1767690ab';

const ROLE_LABELS = {
  bidder:    'Retail Store',
  wholesale: 'Wholesale',
  gm:        'Group GM',
  admin:     'Admin',
};

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tokenId = params.get('token');

  const [phase, setPhase] = useState('loading'); // loading | invalid | form | success
  const [tokenData, setTokenData] = useState(null);
  const [locationName, setLocationName] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [buyerNumber, setBuyerNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tokenId) { setPhase('invalid'); return; }
    supabase
      .from('invite_tokens')
      .select('*, locations(name)')
      .eq('id', tokenId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setPhase('invalid'); return; }
        if (data.used_at) { setPhase('invalid'); return; }
        if (new Date(data.expires_at) < new Date()) { setPhase('invalid'); return; }
        setTokenData(data);
        if (data.locations?.name) setLocationName(data.locations.name);
        if (data.email) setEmail(data.email);
        setPhase('form');
      });
  }, [tokenId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSubmitting(true);
    setError('');

    try {
      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Signup did not return a user.');

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        org_id: ORG_ID,
        name: name.trim(),
        role: tokenData.role,
        location_id: tokenData.location_id || null,
        buyer_number: tokenData.role === 'wholesale' && buyerNumber.trim() ? buyerNumber.trim() : null,
      });
      if (profileError) throw profileError;

      // Mark token used
      await supabase.from('invite_tokens').update({ used_at: new Date().toISOString() }).eq('id', tokenId);

      // Sign out — let them log in fresh
      await supabase.auth.signOut();
      setPhase('success');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .reg-input:focus { border-color: #0d2550 !important; outline: none; }
        .reg-btn:hover:not(:disabled) { background: #142d58 !important; }
        @media (max-width: 768px) {
          .reg-left { width: 100% !important; height: 180px !important; flex-shrink: 0; }
          .reg-right { width: 100% !important; min-height: 0 !important; flex: 1; }
          .reg-wrapper { flex-direction: column !important; }
        }
      `}</style>
      <div className="reg-wrapper" style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>

        {/* Left panel */}
        <div className="reg-left" style={{ position: 'relative', width: '45%', minHeight: '100vh', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${heroImage})`, backgroundPosition: 'center', backgroundSize: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.3) 0%, rgba(13,37,80,.88) 100%)' }} />
          <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: 48 }}>
            <div style={{ marginTop: 80 }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 12 }}>
                Welcome to Stockyard.
              </div>
              <div style={{ fontSize: 16, color: 'rgba(255,255,255,.7)', marginBottom: 24 }}>
                The private wholesale marketplace for McDonald Auto Group.
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>Powered by McDonald Auto Group</div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="reg-right" style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ width: '100%', maxWidth: 400, padding: '0 40px' }}>

            <div style={{ borderLeft: '4px solid #e8b84b', paddingLeft: 16, marginBottom: 32 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0d2550', letterSpacing: '.06em', lineHeight: 1 }}>STOCKYARD</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e8b84b', letterSpacing: '.14em', marginTop: 4 }}>DEALER MARKETPLACE</div>
            </div>

            {phase === 'loading' && (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#0d2550', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 16px' }} />
                Validating invite…
              </div>
            )}

            {phase === 'invalid' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>⛔</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Invalid invite link</div>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
                  This link is expired, already used, or invalid. Contact your administrator for a new invite.
                </p>
                <button onClick={() => navigate('/login')} style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Back to login
                </button>
              </div>
            )}

            {phase === 'form' && tokenData && (
              <>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0d2550', marginBottom: 4 }}>Create your account</div>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>You've been invited to join Stockyard.</div>

                {/* Role badge */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
                  <span style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700 }}>
                    {ROLE_LABELS[tokenData.role] || tokenData.role}
                  </span>
                  {locationName && (
                    <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 600 }}>
                      {locationName}
                    </span>
                  )}
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>Full name *</label>
                    <input
                      className="reg-input"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Jane Smith"
                      required
                      autoFocus
                      style={{ width: '100%', boxSizing: 'border-box', height: 44, padding: '0 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 8, color: '#111827', transition: 'border-color .15s' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>Email *</label>
                    <input
                      className="reg-input"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      style={{ width: '100%', boxSizing: 'border-box', height: 44, padding: '0 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 8, color: '#111827', transition: 'border-color .15s' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="reg-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        required
                        minLength={8}
                        style={{ width: '100%', boxSizing: 'border-box', height: 44, padding: '0 44px 0 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 8, color: '#111827', transition: 'border-color .15s' }}
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13 }}>
                        {showPassword ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>

                  {tokenData.role === 'wholesale' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>
                        Buyer number <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                      </label>
                      <input
                        className="reg-input"
                        type="text"
                        value={buyerNumber}
                        onChange={e => setBuyerNumber(e.target.value)}
                        placeholder="e.g. 12345"
                        style={{ width: '100%', boxSizing: 'border-box', height: 44, padding: '0 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 8, color: '#111827', transition: 'border-color .15s' }}
                      />
                    </div>
                  )}

                  {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
                      ⚠ {error}
                    </div>
                  )}

                  <button
                    className="reg-btn"
                    type="submit"
                    disabled={submitting}
                    style={{ height: 44, marginTop: 4, background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .15s' }}
                  >
                    {submitting ? (
                      <>
                        <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                        Creating account…
                      </>
                    ) : 'Create account'}
                  </button>
                </form>

                <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 20 }}>
                  Already have an account? <a href="/login" style={{ color: '#0d2550', fontWeight: 600 }}>Sign in</a>
                </div>
              </>
            )}

            {phase === 'success' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Account created!</div>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>
                  You're all set. Sign in with your email and password to get started.
                </p>
                <button onClick={() => navigate('/login')} style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  Go to login
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
