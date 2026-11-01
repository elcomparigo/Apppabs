import React, { useRef } from 'react';
import { X, Upload, Download, FileSpreadsheet, FileJson, CheckCircle2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Cliente, DisplayRouteMode } from '../types';

interface ExpImpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: DisplayRouteMode;
  activos: Cliente[];
  papelera: Cliente[];
  onImportCategory: (category: 'completa' | 'pausadas' | 'reagendadas' | 'papelera', data: Cliente[]) => void;
  onImportExcel: (data: Cliente[], routeTarget: DisplayRouteMode) => void;
  onShowToast: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ExpImpModal: React.FC<ExpImpModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  activos,
  papelera,
  onImportCategory,
  onImportExcel,
  onShowToast,
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const activeSubcategoryRef = useRef<'completa' | 'pausadas' | 'reagendadas' | 'papelera'>('completa');

  if (!isOpen) return null;

  const targetRoute = currentMode === 'VER_TODAS' || currentMode === 'FILTRO_ACTIVO' ? 'A' : currentMode;

  const handleExportCategory = (subtipo: 'completa' | 'pausadas' | 'reagendadas' | 'papelera') => {
    let filtrados: Cliente[] = [];
    let nombreSufijo = '';

    if (subtipo === 'completa') {
      filtrados = activos;
      nombreSufijo = `Ruta_${targetRoute}_Completa`;
    } else if (subtipo === 'pausadas') {
      filtrados = activos.filter(c => c._pausadoHasta);
      nombreSufijo = `Ruta_${targetRoute}_Pausadas`;
    } else if (subtipo === 'reagendadas') {
      filtrados = activos.filter(c => c._volverDia);
      nombreSufijo = `Ruta_${targetRoute}_Reagendadas`;
    } else if (subtipo === 'papelera') {
      filtrados = papelera;
      nombreSufijo = `Ruta_${targetRoute}_Papelera`;
    }

    const blob = new Blob([JSON.stringify(filtrados, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nombreSufijo}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onShowToast(`📤 ${nombreSufijo} exportado (${filtrados.length} registros)`, 'success');
  };

  const handleTriggerImportJson = (subtipo: 'completa' | 'pausadas' | 'reagendadas' | 'papelera') => {
    activeSubcategoryRef.current = subtipo;
    jsonInputRef.current?.click();
  };

  const handleFileJsonChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          onImportCategory(activeSubcategoryRef.current, json);
          onShowToast(
            `✅ Datos importados en [${activeSubcategoryRef.current}] (${json.length} registros)`,
            'success'
          );
        } else {
          onShowToast('⚠️ El archivo JSON debe contener un arreglo de registros.', 'warning');
        }
      } catch (err: unknown) {
        onShowToast('❌ Error al parsear JSON: ' + (err instanceof Error ? err.message : String(err)), 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFileExcelChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Cliente>(sheet, { defval: '' });

        if (json && json.length > 0) {
          onImportExcel(json, targetRoute);
          onShowToast(`✅ Excel procesado con ${json.length} registros para Ruta ${targetRoute}`, 'success');
        } else {
          onShowToast('⚠️ El archivo Excel está vacío o no contiene registros.', 'warning');
        }
      } catch (err: unknown) {
        onShowToast('❌ Error al leer Excel: ' + (err instanceof Error ? err.message : String(err)), 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-center items-center p-3 sm:p-5">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Hidden File Inputs */}
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileJsonChanged}
        />
        <input
          ref={excelInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileExcelChanged}
        />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <span>📦 EXPORTAR / IMPORTAR</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">Ruta activa: {targetRoute}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Excel File Load Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white text-xs flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Cargar Archivo Excel / CSV
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                Ruta {targetRoute}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Importa archivos `.xlsx` o `.csv` oficiales de PABS. La app cruzará automáticamente con la base de datos de la Ruta B.
            </p>
            <button
              onClick={() => excelInputRef.current?.click()}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
            >
              <Upload className="w-4 h-4" />
              SELECCIONAR EXCEL (.XLSX)
            </button>
          </div>

          {/* Subcategory JSON options */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Gestión Avanzada por Categoría (JSON)
            </span>

            {/* 1. Ruta Completa */}
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Ruta Completa</span>
                <span className="text-[10px] text-slate-400">{activos.length} cuentas activas</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportCategory('completa')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 active:scale-95 transition"
                >
                  <Download className="w-3 h-3" /> Exp
                </button>
                <button
                  onClick={() => handleTriggerImportJson('completa')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 active:scale-95 transition"
                >
                  <Upload className="w-3 h-3" /> Imp
                </button>
              </div>
            </div>

            {/* 2. Solo Pausadas */}
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">⏸️ Solo Pausadas</span>
                <span className="text-[10px] text-slate-400">Cuentas con ciclo temporal oculto</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportCategory('pausadas')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 active:scale-95 transition"
                >
                  <Download className="w-3 h-3" /> Exp
                </button>
                <button
                  onClick={() => handleTriggerImportJson('pausadas')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 active:scale-95 transition"
                >
                  <Upload className="w-3 h-3" /> Imp
                </button>
              </div>
            </div>

            {/* 3. Solo Reagendadas */}
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">📅 Solo Reagendadas</span>
                <span className="text-[10px] text-slate-400">Cuentas con día futuro (L-D)</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportCategory('reagendadas')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 active:scale-95 transition"
                >
                  <Download className="w-3 h-3" /> Exp
                </button>
                <button
                  onClick={() => handleTriggerImportJson('reagendadas')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 active:scale-95 transition"
                >
                  <Upload className="w-3 h-3" /> Imp
                </button>
              </div>
            </div>

            {/* 4. Papelera */}
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">🗑️ Papelera / Finalizados</span>
                <span className="text-[10px] text-slate-400">{papelera.length} cuentas finalizadas</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportCategory('papelera')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 active:scale-95 transition"
                >
                  <Download className="w-3 h-3" /> Exp
                </button>
                <button
                  onClick={() => handleTriggerImportJson('papelera')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 active:scale-95 transition"
                >
                  <Upload className="w-3 h-3" /> Imp
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
