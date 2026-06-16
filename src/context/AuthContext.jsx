import React, { createContext, useContext, useState, useEffect } from 'react';

export const USERS = [
  { id: 'SAG', name: 'SAG GMC', role: 'bidder', pin: '1111', color: '#1a3d76' },
  { id: 'KIA', name: 'KIA', role: 'bidder', pin: '2222', color: '#2a5298' },
  { id: 'CLR', name: 'Clare', role: 'bidder', pin: '3333', color: '#0f3460' },
  { id: 'MIL', name: 'Millington', role: 'bidder', pin: '4444', color: '#16213e' },
  { id: 'MAR', name: 'Marlette', role: 'bidder', pin: '5555', color: '#0d2137' },
  { id: 'TRI', name: 'Tri-State', role: 'wholesale', pin: '1234', color: '#1a3d76' },
  { id: 'GM',  name: 'Group GM', role: 'gm', pin: '7777', color: '#1a3d76' },
  { id: 'ADM', name: 'Admin', role: 'admin', pin: '1224', color: '#1a3d76' },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mag_user')); } catch { return null; }
  });

  const login = (pin) => {
    const found = USERS.find(u => u.pin === pin.trim());
    if (found) {
      setUser(found);
      localStorage.setItem('mag_user', JSON.stringify(found));
      return found;
    }
    return null;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mag_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
