import React, { useState } from 'react';
import {
  X,
  Settings,
  Shield,
  Trash2,
  Filter,
  DollarSign,
  Upload,
  RefreshCw,
  ExternalLink,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import { DisplayRouteMode } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: DisplayRouteMode;
  userRole: 'admin' | 'operador';
  onToggleUserRole: () => void;
  selectedVerTodasRutas: string[];
  onToggleVerTodasRuta: (ruta: string) => void;
  isAportacionOn: boolean;
  onToggleAportacion: () => void;
  onFilterHoy: () => void;
  onFilterVencidos: () => void;
  onFilterCriticos: () => void;
  onResetRoute: () => void;
  onOpenVisor: (url: string, title: string) => void;
  onShowToast: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  userRole,
  onToggleUserRole,
  selectedVerTodasRutas,
  onToggleVerTodasRuta,
  isAportacionOn,
  onToggleAportacion,
  onFilterHoy,
  onFilterVencidos,
  onFilterCriticos,
  onResetRoute,
  onOpenVisor,
  onShowToast,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-5">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-black text-white tracking-tight">AJUSTES Y CONFIGURACIÓN</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-4 text-xs">
          {/* Mode Operador / Admin Toggle */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className={`w-5 h-5 ${userRole === 'admin' ? 'text-indigo-400' : 'text-slate-400'}`} />
              <div>
                <span className="font-bold text-white block">Modo de Operación</span>
                <span className="text-[10px] text-slate-400">
                  {userRole === 'admin' ? '🔓 Administrador completo' : '🔒 Modo Operador restringido'}
                </span>
              </div>
            </div>
            <button
              onClick={onToggleUserRole}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 ${
                userRole === 'admin'
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {userRole === 'admin' ? 'ADMIN' : 'OPERADOR'}
            </button>
          </div>

          {/* Aportacion Real Toggle */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DollarSign className={`w-5 h-5 ${isAportacionOn ? 'text-emerald-400' : 'text-rose-400'}`} />
              <div>
                <span className="font-bold text-white block">Aportación Real (Servidor)</span>
                <span className="text-[10px] text-slate-400">Estado en base de datos 879</span>
              </div>
            </div>
            <button
              onClick={onToggleAportacion}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 shadow-md ${
                isAportacionOn
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {isAportacionOn ? '💰 ON' : '💰 OFF'}
            </button>
          </div>

          {/* Rutas en "VER TODAS" Selector */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-2">
            <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block">
              Rutas activas en "VER TODAS":
            </span>
            <div className="grid grid-cols-4 gap-2">
              {['A', 'B', 'C', 'D'].map(r => {
                const isSelected = selectedVerTodasRutas.includes(r);
                return (
                  <button
                    key={r}
                    onClick={() => onToggleVerTodasRuta(r)}
                    className={`py-2 rounded-xl font-black text-xs transition active:scale-95 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md border border-indigo-400'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    RUTA {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="space-y-1.5">
            <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider block">
              Filtros Rápidos en Mapa
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  onFilterHoy();
                  onClose();
                }}
                className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-[11px] shadow-md flex items-center justify-center gap-1 active:scale-95 transition"
              >
                <Flame className="w-3.5 h-3.5" />
                HOY
              </button>
              <button
                onClick={() => {
                  onFilterVencidos();
                  onClose();
                }}
                className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-[11px] shadow-md flex items-center justify-center gap-1 active:scale-95 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                VENCIDOS
              </button>
              <button
                onClick={() => {
                  onFilterCriticos();
                  onClose();
                }}
                className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-rose-700 to-red-900 hover:from-rose-600 hover:to-red-800 text-white font-black text-[11px] shadow-md flex items-center justify-center gap-1 active:scale-95 transition border border-red-500/40"
              >
                🚨 +90 DÍAS
              </button>
            </div>
          </div>

          {/* Remote Services and Visors */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider block">
              Accesos a Servidores PABS
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onOpenVisor('https://apkrigo.devlara.us.ci/clon/', 'PABS WEB')}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-between transition"
              >
                <span>PABS WEB</span>
                <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              </button>
              <button
                onClick={() => onOpenVisor('https://webrigo.devlara.us.ci/avances/admin/', 'CORTE GENERAL')}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-between transition"
              >
                <span>CORTE AVANCE</span>
                <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
              </button>
              <button
                onClick={() => onOpenVisor('https://apkrigo.devlara.us.ci/verfakes.php', 'RECIBOS')}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-between transition"
              >
                <span>RECIBOS</span>
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              </button>
              <button
                onClick={() => onOpenVisor('https://apkrigo.devlara.us.ci/configs.php?id=879', 'CONFIGS 879')}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-between transition"
              >
                <span>CONFIGS 879</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </div>

          {/* Danger Zone: Reset Route */}
          <div className="pt-2 border-t border-white/10">
            <button
              onClick={() => {
                if (window.confirm(`¿Estás seguro de que deseas limpiar la memoria y papelera de la RUTA ${currentMode}?`)) {
                  onResetRoute();
                  onClose();
                }
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
            >
              <Trash2 className="w-4 h-4" />
              RESET TOTAL DE RUTA {currentMode}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
