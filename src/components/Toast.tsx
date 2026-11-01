import React from 'react';
import { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map(toast => {
        let borderClass = 'border-l-4 border-l-blue-500';
        let icon = '🔔';
        if (toast.type === 'success') {
          borderClass = 'border-l-4 border-l-emerald-500';
          icon = '✅';
        } else if (toast.type === 'warning') {
          borderClass = 'border-l-4 border-l-amber-500';
          icon = '⚠️';
        } else if (toast.type === 'error') {
          borderClass = 'border-l-4 border-l-rose-500';
          icon = '❌';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-slate-900/95 backdrop-blur-md text-slate-100 text-xs font-bold py-2.5 px-3.5 rounded-2xl shadow-2xl border border-white/10 ${borderClass} flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200`}
          >
            <span className="text-sm shrink-0">{icon}</span>
            <span className="flex-1 leading-snug">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
