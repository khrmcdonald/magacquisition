import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import LoadingScreen from '../components/LoadingScreen';


const AuthContext = createContext(null);

function fallbackProfile(supabaseUser) {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: supabaseUser.email,
    role: 'bidder', // safe minimum — never fall back to elevated roles
    org_id: 'bf236d2b-4693-4606-bf3d-ece1767690ab',
    color: '#1a3d76',
  };
}

async function fetchProfile(supabaseUser) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', supabaseUser.id)
    .single();

  if (error) {
    console.log('Profile query error:', error);
    return fallbackProfile(supabaseUser);
  }

  if (!profile) {
    console.log('Profile query returned no row for user:', supabaseUser.id);
    return fallbackProfile(supabaseUser);
  }

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: profile.name,
    role: profile.role,
    org_id: profile.org_id,
    color: profile.color,
    buyer_number: profile.buyer_number || null,
    locationId: profile.location_id || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on page refresh
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user);
        setUser(profile);
      }
      setLoading(false);
    });

    // Keep session in sync across tabs / token refresh
    // Only sign out on explicit SIGNED_OUT — never on null sessions during token refresh cycles
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user);
        setUser(profile);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return null;
    const profile = await fetchProfile(data.user);
    setUser(profile);
    return profile; // always non-null if auth succeeded
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return <LoadingScreen message="Signing in…" />;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
