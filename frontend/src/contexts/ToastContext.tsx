import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast { id: string; type: ToastType; message: string; }
interface ToastContextType { showToast: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastContextType | null>(null);

const ICONS = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertCircle className="w-5 h-5 text-yellow-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};
const COLORS = {
  success: 'border-green-500/30 bg-dark-900',
  error: 'border-red-500/30 bg-dark-900',
  warning: 'border-yellow-500/30 bg-dark-900',
  info: 'border-primary-500/30 bg-dark-900',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-enter flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl pointer-events-auto max-w-sm ${COLORS[toast.type]}`}>
            {ICONS[toast.type]}
            <span className="text-sm text-dark-100 flex-1">{toast.message}</span>
            <button onClick={() => remove(toast.id)} className="text-dark-500 hover:text-dark-200 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
};
