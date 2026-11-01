import React from 'react';
import { X, TrendingUp, DollarSign, Users, AlertCircle, MapPin, Calendar } from 'lucide-react';
import { Cliente, NormalizedCliente, DisplayRouteMode } from '../types';
import { mapearDatosCliente, yaSeGestionoEstaSemana } from '../utils/pabsLogic';

interface StatsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: DisplayRouteMode;
  clientes: Cliente[];
  onApplyFilter: (type: 'SA' | 'COLONIA' | 'MOTIVO' | 'SISTEMA' | 'PERIODICIDAD', value: string) => void;
  diccionarioRutaB?: Record<string, Cliente>;
}

export const StatsDashboardModal: React.FC<StatsDashboardModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  clientes,
  onApplyFilter,
  diccionarioRutaB = {},
}) => {
  if (!isOpen) return null;

  let totalCuentas = 0;
  let saldoTotal = 0;
  let aporteEsperado = 0;
  let visitadasEstaSemana = 0;

  const saCount = { verde: 0, amarillo: 0, naranja: 0, rojo: 0 };
  const saSaldo = { verde: 0, amarillo: 0, naranja: 0, rojo: 0 };

  const colonias: Record<string, { count: number; saldo: number }> = {};
  const motivos: Record<string, { count: number; saldo: number }> = {};
  const sistemas: Record<string, { count: number; saldo: number }> = {};
  const periodicidades: Record<string, { count: number; saldo: number }> = {};

  clientes.forEach(c => {
    const d: NormalizedCliente | null = mapearDatosCliente(c, diccionarioRutaB);
    if (!d) return;

    totalCuentas++;
    const saldoNum = parseFloat(d.saldo) || 0;
    saldoTotal += saldoNum;
    aporteEsperado += d.montoAporte;

    if (yaSeGestionoEstaSemana(d.fechaVisita)) {
      visitadasEstaSemana++;
    }

    // SA Semáforo
    const sa = d.sa;
    const pLower = d.periodicidad.toLowerCase();
    let keySA: 'verde' | 'amarillo' | 'naranja' | 'rojo' = 'rojo';

    if (pLower.includes('semanal')) {
      if (sa < 8) keySA = 'verde';
      else if (sa <= 60) keySA = 'amarillo';
      else if (sa <= 180) keySA = 'naranja';
    } else if (pLower.includes('quincenal')) {
      if (sa < 16) keySA = 'verde';
      else if (sa <= 60) keySA = 'amarillo';
      else if (sa <= 180) keySA = 'naranja';
    } else {
      if (sa < 31) keySA = 'verde';
      else if (sa <= 60) keySA = 'amarillo';
      else if (sa <= 180) keySA = 'naranja';
    }
    saCount[keySA]++;
    saSaldo[keySA] += saldoNum;

    // Colonias
    const col = d.colonia || 'SIN COLONIA';
    if (!colonias[col]) colonias[col] = { count: 0, saldo: 0 };
    colonias[col].count++;
    colonias[col].saldo += saldoNum;

    // Motivos
    const mot = d.ultimoMotivo || 'SIN REGISTRO';
    if (!motivos[mot]) motivos[mot] = { count: 0, saldo: 0 };
    motivos[mot].count++;
    motivos[mot].saldo += saldoNum;

    // Sistemas
    const sys = d.sistema || 'PABS';
    if (!sistemas[sys]) sistemas[sys] = { count: 0, saldo: 0 };
    sistemas[sys].count++;
    sistemas[sys].saldo += saldoNum;

    // Periodicidad
    const per = d.periodicidad || 'SEMANAL';
    if (!periodicidades[per]) periodicidades[per] = { count: 0, saldo: 0 };
    periodicidades[per].count++;
    periodicidades[per].saldo += saldoNum;
  });

  const topColonias = Object.entries(colonias)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  const topMotivos = Object.entries(motivos).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-5">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              📊
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white">DASHBOARD DE CARTERA</h2>
              <p className="text-[11px] text-slate-400">Ruta {currentMode} • Toca para filtrar en mapa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-5 py-4 space-y-4 text-xs">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-2.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cuentas</span>
              <span className="text-xl font-black text-white">{totalCuentas}</span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-2.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Saldo Cartera</span>
              <span className="text-xl font-black text-emerald-400">${Math.round(saldoTotal).toLocaleString('es-MX')}</span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-2.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Aporte Esp.</span>
              <span className="text-xl font-black text-sky-400">${Math.round(aporteEsperado).toLocaleString('es-MX')}</span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-2.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Visitadas</span>
              <span className="text-xl font-black text-indigo-400">
                {visitadasEstaSemana} <span className="text-[10px] text-slate-400 font-normal">/ {totalCuentas}</span>
              </span>
            </div>
          </div>

          {/* SA Semáforo Interactivo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                🚦 Semáforo de Días sin Abonar (SA)
              </span>
              <span className="text-[10px] text-slate-400">Toca para filtrar</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => {
                  onApplyFilter('SA', 'verde');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/50 text-left transition active:scale-95"
              >
                <div className="flex items-center justify-between text-emerald-400 font-black">
                  <span>🟢 Al Día</span>
                  <span className="text-base">{saCount.verde}</span>
                </div>
                <div className="text-[10px] text-emerald-300/80 mt-1 font-mono">
                  ${Math.round(saSaldo.verde).toLocaleString('es-MX')}
                </div>
              </button>

              <button
                onClick={() => {
                  onApplyFilter('SA', 'amarillo');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 hover:bg-amber-900/50 text-left transition active:scale-95"
              >
                <div className="flex items-center justify-between text-amber-400 font-black">
                  <span>🟡 Atraso</span>
                  <span className="text-base">{saCount.amarillo}</span>
                </div>
                <div className="text-[10px] text-amber-300/80 mt-1 font-mono">
                  ${Math.round(saSaldo.amarillo).toLocaleString('es-MX')}
                </div>
              </button>

              <button
                onClick={() => {
                  onApplyFilter('SA', 'naranja');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-orange-950/40 border border-orange-500/40 hover:bg-orange-900/50 text-left transition active:scale-95"
              >
                <div className="flex items-center justify-between text-orange-400 font-black">
                  <span>🟠 En Riesgo</span>
                  <span className="text-base">{saCount.naranja}</span>
                </div>
                <div className="text-[10px] text-orange-300/80 mt-1 font-mono">
                  ${Math.round(saSaldo.naranja).toLocaleString('es-MX')}
                </div>
              </button>

              <button
                onClick={() => {
                  onApplyFilter('SA', 'rojo');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 hover:bg-rose-900/50 text-left transition active:scale-95"
              >
                <div className="flex items-center justify-between text-rose-400 font-black">
                  <span>🔴 Crítico (+180d)</span>
                  <span className="text-base">{saCount.rojo}</span>
                </div>
                <div className="text-[10px] text-rose-300/80 mt-1 font-mono">
                  ${Math.round(saSaldo.rojo).toLocaleString('es-MX')}
                </div>
              </button>
            </div>
          </div>

          {/* Colonias Top Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                📍 Principales Colonias (Top 8)
              </span>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden divide-y divide-white/5">
              {topColonias.map(([col, data]) => (
                <div
                  key={col}
                  onClick={() => {
                    onApplyFilter('COLONIA', col);
                    onClose();
                  }}
                  className="px-3 py-2 flex items-center justify-between hover:bg-slate-700/50 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="font-bold text-slate-200">{col}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-700/60 px-2 py-0.5 rounded text-[11px] font-bold text-slate-300">
                      {data.count} ctas
                    </span>
                    <span className="text-emerald-400 font-mono text-[11px] w-20 text-right">
                      ${Math.round(data.saldo).toLocaleString('es-MX')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Motivos de No Cobro */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                ⚠️ Motivos de No Cobro
              </span>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden divide-y divide-white/5">
              {topMotivos.map(([mot, data]) => (
                <div
                  key={mot}
                  onClick={() => {
                    onApplyFilter('MOTIVO', mot);
                    onClose();
                  }}
                  className="px-3 py-2 flex items-center justify-between hover:bg-slate-700/50 cursor-pointer transition"
                >
                  <span className="font-bold text-slate-300 truncate">{mot}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="bg-slate-700/60 px-2 py-0.5 rounded text-[11px] font-bold text-slate-300">
                      {data.count}
                    </span>
                    <span className="text-rose-400 font-mono text-[11px] w-20 text-right">
                      ${Math.round(data.saldo).toLocaleString('es-MX')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Periodicidad */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                📅 Periodicidad de Cobro
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(periodicidades).map(([per, data]) => (
                <button
                  key={per}
                  onClick={() => {
                    onApplyFilter('PERIODICIDAD', per);
                    onClose();
                  }}
                  className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 text-left transition active:scale-95"
                >
                  <span className="font-bold text-white block truncate">{per}</span>
                  <div className="text-xs font-black text-indigo-400 mt-1">{data.count} cuentas</div>
                  <div className="text-[10px] text-slate-400 font-mono">${Math.round(data.saldo).toLocaleString('es-MX')}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
