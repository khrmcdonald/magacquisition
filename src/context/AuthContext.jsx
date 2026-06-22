import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Static store list — used by components that need to enumerate stores.
// PINs removed; auth is now handled by Supabase.
export const USERS = [
  { id: 'SAG', name: 'GMC',       role: 'bidder',    color: '#1a3d76' },
  { id: 'KIA', name: 'KIA',       role: 'bidder',    color: '#2a5298' },
  { id: 'CLR', name: 'Clare',     role: 'bidder',    color: '#0f3460' },
  { id: 'MIL', name: 'Millington',role: 'bidder',    color: '#16213e' },
  { id: 'MAR', name: 'Marlette',  role: 'bidder',    color: '#0d2137' },
  { id: 'TRI', name: 'Tri-State', role: 'wholesale', color: '#1a3d76' },
  { id: 'GM',  name: 'Group GM',  role: 'gm',        color: '#1a3d76' },
  { id: 'ADM', name: 'Admin',     role: 'admin',     color: '#1a3d76' },
];

const AuthContext = createContext(null);

function fallbackProfile(supabaseUser) {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: supabaseUser.email,
    role: 'admin',
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user);
        setUser(profile);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('Supabase auth result:', error, data);
    if (error) return null;
    const profile = await fetchProfile(data.user);
    setUser(profile);
    return profile; // always non-null if auth succeeded
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
