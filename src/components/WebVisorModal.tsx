import React, { useRef } from 'react';
import { X, ExternalLink, RefreshCw, Globe, ChevronLeft } from 'lucide-react';

interface WebVisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export const WebVisorModal: React.FC<WebVisorModalProps> = ({ isOpen, onClose, url, title }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!isOpen) return null;

  const handleOpenExternal = () => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleReload = () => {
    if (iframeRef.current && url) {
      iframeRef.current.src = url;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
      <div className="w-full sm:max-w-4xl h-[92vh] sm:h-[88vh] bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in slide-in-from-bottom duration-200">
        {/* Header (Android Material 3 Style) */}
        <div className="px-4 sm:px-5 py-3 border-b border-white/10 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <span className="text-xs sm:text-sm font-black text-indigo-300 truncate tracking-tight uppercase">
              {title || 'VISOR WEB PABS'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Direct Open in New Tab Button */}
            {url && (
              <button
                onClick={handleOpenExternal}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition"
                title="Abrir en pestaña nueva o app externa"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pestaña</span>
              </button>
            )}

            <button
              onClick={handleReload}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition active:scale-95"
              title="Recargar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-rose-600/80 hover:bg-rose-600 flex items-center justify-center text-white transition active:scale-95"
              title="Cerrar visor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info Helper Strip */}
        <div className="bg-slate-950/90 px-4 py-1.5 border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono overflow-hidden">
          <span className="truncate flex-1 mr-2">{url}</span>
          <button
            onClick={handleOpenExternal}
            className="text-indigo-400 hover:text-indigo-300 font-sans font-bold underline shrink-0"
          >
            Abrir fuera ↗
          </button>
        </div>

        {/* Iframe View (No restrictive sandbox attribute to allow full cookies/PHP sessions) */}
        <div className="flex-1 w-full bg-slate-950 relative">
          <iframe
            ref={iframeRef}
            src={url}
            title={title}
            className="w-full h-full border-0 bg-white"
          />
        </div>

        {/* Mobile Bottom Action Bar */}
        <div className="p-2 sm:hidden bg-slate-950 border-t border-white/10 flex items-center justify-between gap-2">
          <button
            onClick={handleOpenExternal}
            className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <Globe className="w-3.5 h-3.5" />
            ABRIR EN NAVEGADOR COMPLETO
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs active:scale-95 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
