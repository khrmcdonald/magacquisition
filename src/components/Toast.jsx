import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const STYLES = {
  success: { bg: '#d1fae5', border: '#6ee7b7', color: '#065f46', icon: '✓' },
  error:   { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b', icon: '✕' },
  info:    { bg: '#dbeafe', border: '#93c5fd', color: '#1e40af', icon: 'i' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400, pointerEvents: 'none' }}>
          {toasts.map(t => {
            const s = STYLES[t.type] || STYLES.info;
            return (
              <div key={t.id} style={{ background: s.bg, border: `1.5px solid ${s.border}`, color: s.color, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.13)', pointerEvents: 'all' }}>
                <span style={{ fontWeight: 800, fontSize: 15, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>{s.icon}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, lineHeight: 1.45 }}>{t.message}</span>
                <button onClick={() => dismiss(t.id)} style={{ background: 'none', border: 'none', color: s.color, cursor: 'pointer', fontSize: 18, padding: 0, opacity: 0.6, lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { showToast: (msg) => alert(msg) };
  return ctx;
}
