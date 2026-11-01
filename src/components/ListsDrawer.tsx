import React, { useState } from 'react';
import {
  X,
  Search,
  RotateCcw,
  Trash2,
  Calendar,
  Pause,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Download,
  MapPin,
} from 'lucide-react';
import { Cliente, NormalizedCliente, DisplayRouteMode } from '../types';
import { mapearDatosCliente, esDiaDePagoHoy } from '../utils/pabsLogic';

export type DrawerListType = 'activos' | 'papelera' | 'reagendados' | 'pausadas' | 'con_app';

interface ListsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  listType: DrawerListType;
  currentMode: DisplayRouteMode;
  activos: Cliente[];
  papelera: Cliente[];
  onSelectCliente: (cliente: Cliente) => void;
  onRestoreCliente: (idEnrutar: string) => void;
  onClearPapelera: () => void;
  onRemovePausa: (idEnrutar: string) => void;
  onExportReporte: () => void;
  diccionarioRutaB?: Record<string, Cliente>;
}

export const ListsDrawer: React.FC<ListsDrawerProps> = ({
  isOpen,
  onClose,
  listType,
  currentMode,
  activos,
  papelera,
  onSelectCliente,
  onRestoreCliente,
  onClearPapelera,
  onRemovePausa,
  onExportReporte,
  diccionarioRutaB = {},
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  let title = '📋 ACTIVOS';
  let badgeColor = 'bg-blue-500/20 text-blue-400';
  let displayList: Cliente[] = [];

  if (listType === 'activos') {
    title = `📋 ACTIVOS (RUTA ${currentMode})`;
    badgeColor = 'bg-blue-500/20 text-blue-400';
    displayList = activos;
  } else if (listType === 'papelera') {
    title = `🗑️ FINALIZADOS / PAPELERA`;
    badgeColor = 'bg-rose-500/20 text-rose-400';
    displayList = papelera;
  } else if (listType === 'reagendados') {
    title = `📅 REAGENDADOS`;
    badgeColor = 'bg-sky-500/20 text-sky-400';
    displayList = activos.filter(c => c._volverDia);
  } else if (listType === 'pausadas') {
    title = `⏸️ CUENTAS PAUSADAS`;
    badgeColor = 'bg-amber-500/20 text-amber-400';
    displayList = activos.filter(c => c._pausadoHasta);
  } else if (listType === 'con_app') {
    title = `📱 CLIENTES CON APP`;
    badgeColor = 'bg-emerald-500/20 text-emerald-400';
    displayList = activos.filter(c => {
      const d = mapearDatosCliente(c, diccionarioRutaB);
      return d && d.tieneApp;
    });
  }

  const q = query.toLowerCase().trim();
  const filtered = displayList.filter(c => {
    const d = mapearDatosCliente(c, diccionarioRutaB);
    if (!d) return false;
    return (
      d.nombre.toLowerCase().includes(q) ||
      d.idEnrutar.toLowerCase().includes(q) ||
      d.contrato.toLowerCase().includes(q) ||
      d.dirFinal.toLowerCase().includes(q) ||
      d.colonia.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-700/80 h-full flex flex-col text-slate-100 shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between bg-slate-950/70">
          <div>
            <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              <span>{title}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeColor}`}>
                {displayList.length}
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {listType === 'papelera' && papelera.length > 0 && (
              <button
                onClick={onClearPapelera}
                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 shadow-sm transition active:scale-95"
              >
                <Trash2 className="w-3 h-3" />
                VACIAR
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="p-3 bg-slate-950/40 border-b border-white/5 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nombre, ID, contrato o calle..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-indigo-500 transition"
            />
          </div>

          {listType === 'activos' && (
            <button
              onClick={onExportReporte}
              className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
            >
              <Download className="w-3.5 h-3.5" />
              DESCARGAR REPORTE EXCEL/CSV
            </button>
          )}
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto p-3 space-y-2.5 flex-1 text-xs">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="font-semibold">No se encontraron cuentas en esta lista.</p>
            </div>
          ) : (
            filtered.map(c => {
              const d = mapearDatosCliente(c, diccionarioRutaB);
              if (!d) return null;

              const estadoHoy = esDiaDePagoHoy(c);
              const isHoy = estadoHoy === 'HOY';
              const isVencido = typeof estadoHoy === 'object' && estadoHoy.estado === 'PENDIENTE';

              return (
                <div
                  key={d.idEnrutar}
                  onClick={() => {
                    if (listType !== 'papelera') {
                      onSelectCliente(c);
                      onClose();
                    }
                  }}
                  className={`bg-slate-800/40 border border-slate-700/60 rounded-2xl p-3 space-y-1.5 transition ${
                    listType !== 'papelera' ? 'cursor-pointer hover:bg-slate-800/80 hover:border-slate-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-black text-sm text-white tracking-tight flex items-center gap-1.5">
                        <span>{d.nombre}</span>
                        {isHoy && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-extrabold es-hoy">
                            HOY
                          </span>
                        )}
                        {isVencido && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-600 text-white font-extrabold">
                            VENCIDO
                          </span>
                        )}
                        {c._volverDia && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-600 text-white font-extrabold">
                            👉 {c._volverDia}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        ID: {d.idEnrutar} • Contrato: {d.contrato}
                      </span>
                    </div>

                    {listType === 'papelera' ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onRestoreCliente(d.idEnrutar);
                        }}
                        className="p-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition active:scale-95 shrink-0"
                        title="Restaurar a activos"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : listType === 'pausadas' ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onRemovePausa(d.idEnrutar);
                        }}
                        className="px-2 py-1 text-[10px] rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shrink-0 transition active:scale-95"
                      >
                        Quitar pausa
                      </button>
                    ) : (
                      <span className="text-emerald-400 font-bold font-mono text-xs shrink-0">
                        ${d.saldo}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-orange-400 shrink-0 mt-0.5" />
                    <span className="truncate">{d.dirFinal}</span>
                  </div>

                  {listType === 'pausadas' && (
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5 text-[10px] space-y-0.5 text-slate-300">
                      <div>
                        <strong>Motivo:</strong> {c._motivoPausa || 'Pausado manualmente'}
                      </div>
                      <div>
                        <strong>Fecha pausa:</strong> {c._fechaPausa || 'Sin dato'}
                      </div>
                      <div className="text-emerald-400 font-bold">
                        <strong>Reaparece:</strong> {c._pausadoHasta}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-white/5">
                    <span>
                      📅 {d.periodicidad} • {d.diaPago}
                    </span>
                    <span className={d.sa > 30 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                      ⚠️ {d.sa}d sin abonar
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
