import React, { useState } from 'react';
import { X, Copy, Check, Code } from 'lucide-react';
import { NormalizedCliente } from '../types';

interface JsonViewerModalProps {
  cliente: NormalizedCliente | null;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const JsonViewerModal: React.FC<JsonViewerModalProps> = ({ cliente, isOpen, onClose, onShowToast }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !cliente) return null;

  const jsonStr = JSON.stringify(cliente.raw || cliente, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    onShowToast('📋 JSON copiado al portapapeles', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-5">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">DATOS RAW JSON</h2>
              <p className="text-[11px] text-slate-400">{cliente.nombre} (ID: {cliente.idEnrutar})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 border border-white/10"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-emerald-400 bg-slate-950 leading-relaxed">
          <code>{jsonStr}</code>
        </pre>
      </div>
    </div>
  );
};
