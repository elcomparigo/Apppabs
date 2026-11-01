import React from 'react';
import { X, ExternalLink, RefreshCw } from 'lucide-react';

interface WebVisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export const WebVisorModal: React.FC<WebVisorModalProps> = ({ isOpen, onClose, url, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-2 sm:p-5">
      <div className="w-full max-w-4xl h-[92vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-sm font-black text-indigo-400 truncate tracking-tight">{title}</span>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-white transition"
                title="Abrir en pestaña nueva"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Iframe View */}
        <div className="flex-1 w-full bg-slate-950 relative">
          <iframe
            src={url}
            title={title}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
};
