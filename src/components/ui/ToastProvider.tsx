import React, { createContext, useContext, useState, useCallback } from 'react';

type Toast = { id: string; message: string; type?: 'success' | 'error' | 'info' | 'warning'; ttl?: number };

const ToastContext = createContext<{
  push: (msg: string, opts?: Partial<Toast>) => void;
  remove: (id: string) => void;
}>({ push: () => {}, remove: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, opts: Partial<Toast> = {}) => {
    const id = opts.id ?? Math.random().toString(36).slice(2, 9);
    const toast: Toast = { id, message, type: opts.type ?? 'info', ttl: opts.ttl ?? 5000 };
    setToasts((t) => [toast, ...t]);
    if (toast.ttl && toast.ttl > 0) {
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, toast.ttl);
    }
  }, []);

  const remove = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <div style={{ position: 'fixed', right: 16, top: 16, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map((t) => (
          <div key={t.id} role="status" style={{
            minWidth: 260,
            maxWidth: 420,
            padding: '12px 14px',
            borderRadius: 8,
            boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
            background: t.type === 'success' ? 'linear-gradient(90deg,#ECFDF5,#D1FAE5)' : t.type === 'error' ? 'linear-gradient(90deg,#FEF2F2,#FEE2E2)' : 'linear-gradient(90deg,#F8FAFC,#F1F5F9)',
            color: '#0f172a',
            border: '1px solid rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.type?.toUpperCase()}</div>
              <button onClick={() => remove(t.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#475569' }}>✕</button>
            </div>
            <div style={{ marginTop: 6, fontSize: 13, lineHeight: '18px', color: '#0f172a' }}>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
