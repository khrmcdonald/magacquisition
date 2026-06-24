import React from 'react';

export default function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#f8faff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
      <div style={{ width: 48, height: 48, border: '4px solid #e5e7eb', borderTopColor: '#0d2550', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginBottom: 18 }} />
      <div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{message}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
