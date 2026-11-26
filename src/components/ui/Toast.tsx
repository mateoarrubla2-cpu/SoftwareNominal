import * as React from 'react';

interface ToastProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

const typeConfig = {
  success: { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200', iconColor: 'text-emerald-600' },
  error: { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200', iconColor: 'text-red-600' },
  info: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', iconColor: 'text-blue-600' },
};

export function Toast({ type, message, onClose }: ToastProps) {
  const config = typeConfig[type];

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-xl border flex items-center gap-3 min-w-[320px] animate-slide-in-right ${config.bg} ${config.text} ${config.border}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.iconColor} bg-white/50`}>
        {type === 'success' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : type === 'error' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-auto text-slate-400 hover:text-slate-600 transition-colors p-1"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

import { X } from 'lucide-react';
