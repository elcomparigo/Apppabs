import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Navigation,
  RefreshCw,
  BarChart3,
  ListFilter,
  Package,
  Settings,
  Search,
  Smartphone,
  Shield,
  Layers,
  MapPin,
  TrendingUp,
  Download,
  AlertCircle,
  Eye,
  DollarSign,
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { Cliente, NormalizedCliente, DisplayRouteMode, ToastMessage } from './types';
import {
  SEED_DATA_RUTA_A,
  SEED_DATA_RUTA_B,
  mapearDatosCliente,
  esDiaDePagoHoy,
  leTocaCobroEnSemanaActual,
  yaSeGestionoEstaSemana,
  enviarBalizaServidor,
} from './utils/pabsLogic';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { MapComponent } from './components/MapComponent';
import { ClientBottomSheet } from './components/ClientBottomSheet';
import { StatsDashboardModal } from './components/StatsDashboardModal';
import { ListsDrawer, DrawerListType } from './components/ListsDrawer';
import { SemaforoNuevasModal } from './components/SemaforoNuevasModal';
import { ExpImpModal } from './components/ExpImpModal';
import { FlutterExportModal } from './components/FlutterExportModal';
import { ConfigModal } from './components/ConfigModal';
import { WebVisorModal } from './components/WebVisorModal';
import { JsonViewerModal } from './components/JsonViewerModal';
import { ToastContainer } from './components/Toast';
import { usePWAInstall } from './hooks/usePWAInstall';

export default function App() {
  // PWA Install Hook
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // App State: Active Route Mode
  const [currentMode, setCurrentMode] = useState<DisplayRouteMode>('A');
  const [selectedVerTodas, setSelectedVerTodas] = useState<string[]>(['A', 'B', 'C', 'D']);
  const [userRole, setUserRole] = useState<'admin' | 'operador'>('admin');

  // Route Data Cache
  const [routesData, setRoutesData] = useState<Record<string, Cliente[]>>({
    A: [],
    B: [],
    C: [],
    D: [],
    EMISION: [],
  });
  const [trashData, setTrashData] = useState<Record<string, Cliente[]>>({
    A: [],
    B: [],
    C: [],
    D: [],
    EMISION: [],
  });

  // Active filter override (e.g. from Dashboard or Quick Filter)
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string | null>(null);

  // GPS tracking
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Sync Progress
  const [syncProgress, setSyncProgress] = useState<number | null>(null);

  // Aportacion Real state
  const [isAportacionOn, setIsAportacionOn] = useState(false);

  // UI Modals
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSemaforoOpen, setIsSemaforoOpen] = useState(false);
  const [isExpImpOpen, setIsExpImpOpen] = useState(false);
  const [isFlutterExportOpen, setIsFlutterExportOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<DrawerListType>('activos');
  const [isWebVisorOpen, setIsWebVisorOpen] = useState(false);
  const [visorUrl, setVisorUrl] = useState('');
  const [visorTitle, setVisorTitle] = useState('');
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonTargetCliente, setJsonTargetCliente] = useState<NormalizedCliente | null>(null);
  const [showListDropdown, setShowListDropdown] = useState(false);

  // Search input
  const [mapSearchText, setMapSearchText] = useState('');
  const [globalSearchText, setGlobalSearchText] = useState('');

  // Floating Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  // Load Initial Storage Data
  useEffect(() => {
    const loadedRoutes: Record<string, Cliente[]> = {};
    const loadedTrash: Record<string, Cliente[]> = {};

    ['A', 'B', 'C', 'D', 'EMISION'].forEach(r => {
      const stored = localStorage.getItem(`pabs_act_${r}`);
      if (stored) {
        try {
          loadedRoutes[r] = JSON.parse(stored);
        } catch {
          loadedRoutes[r] = [];
        }
      } else {
        // Seed default initial data for Route A and B so app is ready to test immediately
        if (r === 'A') loadedRoutes[r] = SEED_DATA_RUTA_A;
        else if (r === 'B') loadedRoutes[r] = SEED_DATA_RUTA_B;
        else loadedRoutes[r] = [];
      }

      const storedTrash = localStorage.getItem(`trash_${r}`);
      if (storedTrash) {
        try {
          loadedTrash[r] = JSON.parse(storedTrash);
        } catch {
          loadedTrash[r] = [];
        }
      } else {
        loadedTrash[r] = [];
      }
    });

    setRoutesData(loadedRoutes);
    setTrashData(loadedTrash);

    const savedRole = localStorage.getItem('pabs_user_role');
    if (savedRole === 'operador' || savedRole === 'admin') {
      setUserRole(savedRole);
    }

    const savedVerTodas = localStorage.getItem('rutas_visibles');
    if (savedVerTodas) {
      try {
        setSelectedVerTodas(JSON.parse(savedVerTodas));
      } catch {
        // fallback
      }
    }

    // Check remote Aportacion Real status silently
    checkAportacionStatus();
    const intervalAport = setInterval(checkAportacionStatus, 60000);
    return () => clearInterval(intervalAport);
  }, []);

  // Save changes to localStorage
  const saveRouteData = (routeKey: string, data: Cliente[]) => {
    setRoutesData(prev => ({ ...prev, [routeKey]: data }));
    localStorage.setItem(`pabs_act_${routeKey}`, JSON.stringify(data));
  };

  const saveTrashData = (routeKey: string, data: Cliente[]) => {
    setTrashData(prev => ({ ...prev, [routeKey]: data }));
    localStorage.setItem(`trash_${routeKey}`, JSON.stringify(data));
  };

  // Build Route B dictionary for normalization
  const diccionarioRutaB = useMemo(() => {
    const dict: Record<string, Cliente> = {};
    const rutaB = routesData['B'] || [];
    rutaB.forEach(c => {
      const d = mapearDatosCliente(c);
      if (d) {
        if (d.idEnrutar) dict[d.idEnrutar] = c;
        if (d.contrato) dict[d.contrato] = c;
        if (d.nombre) dict[d.nombre] = c;
      }
    });
    return dict;
  }, [routesData]);

  // Check Aportacion Real on server
  const checkAportacionStatus = async () => {
    try {
      const res = await fetch('https://apkrigo.devlara.us.ci/configs.php?id=879&api');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const val = data[0].aportacion_real === true || data[0].aportacion_real === 1 || data[0].aportacion_real === '1';
          setIsAportacionOn(val);
        }
      }
    } catch {
      // Ignore network errors in preview
    }
  };

  const toggleAportacionReal = async () => {
    const nextVal = !isAportacionOn;
    setIsAportacionOn(nextVal);
    showToast(`⏳ Guardando Aportación Real: ${nextVal ? 'ACTIVADA' : 'DESACTIVADA'}`, 'info');
    try {
      await fetch(`https://apkrigo.devlara.us.ci/configs.php?id=879&conf=aportacion_real&val=${nextVal ? 'true' : 'false'}`);
      showToast(`✅ Aportación Real ${nextVal ? 'ACTIVADA' : 'DESACTIVADA'}`, 'success');
    } catch {
      showToast(`⚠️ Estado actualizado localmente`, 'warning');
    }
  };

  // GPS Tracking Toggle
  const toggleGps = () => {
    if (isGpsActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsGpsActive(false);
      setUserLocation(null);
      showToast('🏍️ Rastreo GPS desactivado', 'info');
    } else {
      if (!navigator.geolocation) {
        showToast('⚠️ Tu dispositivo o navegador no soporta geolocalización', 'warning');
        return;
      }
      showToast('🛰️ Conectando satélites GPS de alta precisión...', 'info');
      setIsGpsActive(true);

      const id = navigator.geolocation.watchPosition(
        pos => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation([lat, lng]);
        },
        err => {
          console.warn('GPS error:', err);
          showToast('❌ Señal GPS débil o denegada', 'warning');
          setIsGpsActive(false);
        },
        { enableHighAccuracy: true, maximumAge: 8000, timeout: 10000 }
      );
      watchIdRef.current = id;
    }
  };

  // Remote Sync via Excel
  const sincronizarRuta = async () => {
    if (currentMode === 'VER_TODAS' || currentMode === 'FILTRO_ACTIVO') {
      showToast('⚠️ Selecciona una ruta específica (A, B o C) para sincronizar', 'warning');
      return;
    }

    setSyncProgress(10);
    showToast(`🔄 Iniciando sincronización de Ruta ${currentMode}...`, 'info');

    try {
      let url = '';
      if (currentMode === 'A' || currentMode === 'B') {
        url = 'https://s.devlara.us.ci/excel.xlsx?target=1&full=true&t=' + Date.now();
      } else if (currentMode === 'C') {
        url = 'https://s.devlara.us.ci/pagos-rodrigo-excel.xlsx?t=' + Date.now();
      }

      const res = await fetch(url);
      setSyncProgress(60);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = await res.arrayBuffer();
      setSyncProgress(85);
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Cliente>(sheet, { defval: '' });

      if (json && json.length > 0) {
        saveRouteData(currentMode, json);
        showToast(`✅ Ruta ${currentMode} sincronizada (${json.length} cuentas descargadas)`, 'success');
      } else {
        throw new Error('Archivo recibido sin registros');
      }
    } catch (err: unknown) {
      showToast('⚠️ Error al conectar con servidor de sincronización. Manteniendo datos locales.', 'warning');
    } finally {
      setSyncProgress(null);
    }
  };

  // Filtered Client List for Map & List Display
  const displayedClientes = useMemo(() => {
    let rawList: Cliente[] = [];

    if (currentMode === 'VER_TODAS') {
      selectedVerTodas.forEach(r => {
        const items = routesData[r] || [];
        rawList.push(...items);
      });
    } else if (currentMode === 'FILTRO_ACTIVO' && activeFilterTag) {
      // Evaluate across all routes
      ['A', 'B', 'C', 'D', 'EMISION'].forEach(r => {
        const items = routesData[r] || [];
        rawList.push(...items);
      });
    } else {
      rawList = routesData[currentMode] || [];
    }

    // Apply specific filter if active
    if (filterType && filterValue) {
      return rawList.filter(c => {
        const d = mapearDatosCliente(c, diccionarioRutaB);
        if (!d) return false;

        if (filterType === 'HOY') {
          return esDiaDePagoHoy(c) === 'HOY';
        }
        if (filterType === 'VENCIDOS') {
          const st = esDiaDePagoHoy(c);
          return typeof st === 'object' && st.estado === 'PENDIENTE';
        }
        if (filterType === 'CRITICOS') {
          return d.sa > 90;
        }
        if (filterType === 'SA') {
          const pLower = d.periodicidad.toLowerCase();
          const sa = d.sa;
          let keySA = 'rojo';
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
          return keySA === filterValue;
        }
        if (filterType === 'COLONIA') {
          return d.colonia.toUpperCase() === filterValue.toUpperCase();
        }
        if (filterType === 'MOTIVO') {
          return d.ultimoMotivo.toUpperCase() === filterValue.toUpperCase();
        }
        if (filterType === 'PERIODICIDAD') {
          return d.periodicidad.toUpperCase().includes(filterValue.toUpperCase());
        }
        return true;
      });
    }

    // Route A default filter: show today or overdue
    if (currentMode === 'A') {
      return rawList.filter(c => {
        return esDiaDePagoHoy(c) !== false;
      });
    }

    // EMISION default filter: show weekly billing cycle & not visited yet this week
    if (currentMode === 'EMISION') {
      const unicosMap = new Map<string, Cliente>();
      rawList.forEach(c => {
        const d = mapearDatosCliente(c, diccionarioRutaB);
        if (d) {
          const key = d.idEnrutar || d.contrato || d.nombre;
          if (key && !unicosMap.has(key)) unicosMap.set(key, c);
        }
      });
      return Array.from(unicosMap.values()).filter(c => {
        const d = mapearDatosCliente(c, diccionarioRutaB);
        if (!d) return false;
        if (yaSeGestionoEstaSemana(d.fechaVisita)) return false;
        return leTocaCobroEnSemanaActual(c);
      });
    }

    return rawList;
  }, [currentMode, routesData, selectedVerTodas, activeFilterTag, filterType, filterValue, diccionarioRutaB]);

  // Handle Map Search query
  const handleMapSearch = (query: string) => {
    setMapSearchText(query);
    const q = query.toLowerCase().trim();
    if (q.length < 2) return;

    const match = displayedClientes.find(c => {
      const d = mapearDatosCliente(c, diccionarioRutaB);
      if (!d) return false;
      return (
        d.nombre.toLowerCase().includes(q) ||
        d.idEnrutar.toLowerCase().includes(q) ||
        d.contrato.toLowerCase().includes(q) ||
        d.dirFinal.toLowerCase().includes(q)
      );
    });

    if (match) {
      setSelectedCliente(match);
      const d = mapearDatosCliente(match, diccionarioRutaB);
      showToast(`🔍 Encontrado: ${d?.nombre}`, 'success');
    }
  };

  // Handle Global Search Form
  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = globalSearchText.trim();
    if (!q) return;
    const url = `https://webrigo.devlara.us.ci/buscar/?buscar=${encodeURIComponent(q)}`;
    window.open(url, '_blank');
    setGlobalSearchText('');
  };

  // Client modification handlers
  const handleUpdateCliente = (updatedCliente: Cliente) => {
    const d = mapearDatosCliente(updatedCliente, diccionarioRutaB);
    if (!d) return;

    ['A', 'B', 'C', 'D', 'EMISION'].forEach(r => {
      const list = routesData[r] || [];
      const idx = list.findIndex(i => {
        const di = mapearDatosCliente(i, diccionarioRutaB);
        return di && di.idEnrutar === d.idEnrutar;
      });
      if (idx > -1) {
        const copy = [...list];
        copy[idx] = updatedCliente;
        saveRouteData(r, copy);
      }
    });

    setSelectedCliente(updatedCliente);
  };

  const handleSendToTrash = (idEnrutar: string) => {
    let targetRuta: string = currentMode === 'VER_TODAS' || currentMode === 'FILTRO_ACTIVO' ? 'A' : currentMode;
    let foundClient: Cliente | null = null;

    ['A', 'B', 'C', 'D', 'EMISION'].forEach(r => {
      const list = routesData[r] || [];
      const idx = list.findIndex(i => {
        const di = mapearDatosCliente(i, diccionarioRutaB);
        return di && di.idEnrutar === idEnrutar;
      });
      if (idx > -1) {
        foundClient = list[idx];
        targetRuta = r;
        const copy = [...list];
        copy.splice(idx, 1);
        saveRouteData(r, copy);
      }
    });

    if (foundClient) {
      const currentTrash = trashData[targetRuta] || [];
      const updatedTrash = [...currentTrash, foundClient];
      saveTrashData(targetRuta, updatedTrash);
      showToast(`🗑️ Cuenta enviada a finalizados / papelera (${targetRuta})`, 'warning');
    }
  };

  const handleRestoreFromTrash = (idEnrutar: string) => {
    let restoredClient: Cliente | null = null;
    let fromRuta = 'A';

    ['A', 'B', 'C', 'D', 'EMISION'].forEach(r => {
      const list = trashData[r] || [];
      const idx = list.findIndex(i => {
        const di = mapearDatosCliente(i, diccionarioRutaB);
        return di && di.idEnrutar === idEnrutar;
      });
      if (idx > -1) {
        restoredClient = list[idx];
        fromRuta = r;
        const copy = [...list];
        copy.splice(idx, 1);
        saveTrashData(r, copy);
      }
    });

    if (restoredClient) {
      const currentActivos = routesData[fromRuta] || [];
      saveRouteData(fromRuta, [...currentActivos, restoredClient]);
      showToast(`✅ Cuenta restaurada a Ruta ${fromRuta}`, 'success');
    }
  };

  const handleRemovePausa = (idEnrutar: string) => {
    ['A', 'B', 'C', 'D', 'EMISION'].forEach(r => {
      const list = routesData[r] || [];
      const idx = list.findIndex(i => {
        const di = mapearDatosCliente(i, diccionarioRutaB);
        return di && di.idEnrutar === idEnrutar;
      });
      if (idx > -1) {
        const copy = [...list];
        delete copy[idx]._pausadoHasta;
        delete copy[idx]._motivoPausa;
        delete copy[idx]._fechaPausa;
        saveRouteData(r, copy);
      }
    });
    showToast('✅ Pausa removida. Cuenta devuelta al mapa', 'success');
  };

  const handleApplyFilter = (type: string, value: string) => {
    setFilterType(type);
    setFilterValue(value);
    setActiveFilterTag(`${type}: ${value}`);
    setCurrentMode('FILTRO_ACTIVO');
    showToast(`📍 Mapa filtrado por [${value}]`, 'info');
  };

  const clearFilter = () => {
    setFilterType(null);
    setFilterValue(null);
    setActiveFilterTag(null);
    setCurrentMode('A');
  };

  const handleResetCurrentRoute = () => {
    const r = currentMode === 'VER_TODAS' || currentMode === 'FILTRO_ACTIVO' ? 'A' : currentMode;
    saveRouteData(r, []);
    saveTrashData(r, []);
    showToast(`🔥 Datos y papelera de Ruta ${r} reiniciados`, 'warning');
  };

  // Export report of current active accounts as CSV
  const handleExportCsvReport = () => {
    const listToExport = displayedClientes.map(c => {
      const d = mapearDatosCliente(c, diccionarioRutaB);
      return {
        ID: d?.idEnrutar,
        CONTRATO: d?.contrato,
        CLIENTE: d?.nombre,
        DOMICILIO: d?.dirFinal,
        COLONIA: d?.colonia,
        TELEFONO: d?.telSolo,
        PERIODICIDAD: d?.periodicidad,
        DIA_PAGO: d?.diaPago,
        DIAS_SIN_ABONAR: d?.sa,
        SALDO: d?.saldo,
        ULTIMO_MOTIVO: d?.ultimoMotivo,
        ULTIMO_COMENTARIO: d?.ultimoComentario,
      };
    });

    const ws = XLSX.utils.json_to_sheet(listToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Ruta_${currentMode}`);
    XLSX.writeFile(wb, `Reporte_Ruta_${currentMode}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast(`📥 Reporte Excel exportado con éxito`, 'success');
  };

  return (
    <div className="relative w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Android Top System Status Bar */}
      <AndroidStatusBar isGpsActive={isGpsActive} />

      {/* 2. Mobile App Header */}
      <header className="w-full bg-slate-900/95 backdrop-blur-md border-b border-white/10 px-3 py-2 z-30 shadow-lg flex flex-col gap-2">
        {/* Top Controls Row */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          {/* Logo / Brand badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-white shadow-md shadow-orange-950/40 text-sm">
              P
            </div>
            <div className="leading-tight hidden sm:block">
              <span className="font-black text-xs tracking-tight text-white block">PABS PRO</span>
              <span className="text-[9px] font-bold text-orange-400 block tracking-widest">VALENCIA</span>
            </div>
          </div>

          {/* Route Selector Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={currentMode}
              onChange={e => {
                const val = e.target.value as DisplayRouteMode;
                setCurrentMode(val);
                setFilterType(null);
                setFilterValue(null);
                setActiveFilterTag(null);
              }}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-black rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-500 transition cursor-pointer shadow-sm"
            >
              <option value="A">RUTA A</option>
              <option value="B">RUTA B</option>
              <option value="C">RUTA C</option>
              <option value="D">RUTA D</option>
              <option value="EMISION">🚀 EMISIÓN</option>
              <option value="VER_TODAS">VER TODAS</option>
              {activeFilterTag && <option value="FILTRO_ACTIVO">🔍 {activeFilterTag}</option>}
            </select>
          </div>

          {/* SINC Button with download percentage */}
          <button
            onClick={sincronizarRuta}
            disabled={syncProgress !== null}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition shrink-0"
            title="Sincronizar ruta desde servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncProgress !== null ? 'animate-spin' : ''}`} />
            <span>{syncProgress !== null ? `${syncProgress}%` : 'SINC'}</span>
          </button>

          {/* Stats Button */}
          <button
            onClick={() => setIsStatsOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition shrink-0"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">STATS</span>
          </button>

          {/* Listas Dropdown Button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowListDropdown(!showListDropdown)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-extrabold text-xs flex items-center gap-1 active:scale-95 transition"
            >
              <ListFilter className="w-3.5 h-3.5 text-indigo-400" />
              <span>LISTAS ▾</span>
            </button>

            {showListDropdown && (
              <div
                className="absolute left-0 top-10 z-50 w-48 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 text-xs"
                onClick={() => setShowListDropdown(false)}
              >
                <button
                  onClick={() => {
                    setDrawerType('activos');
                    setIsDrawerOpen(true);
                  }}
                  className="w-full py-2 px-2.5 text-left font-bold rounded-xl hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                >
                  📋 ACTIVOS
                </button>
                <button
                  onClick={() => {
                    setDrawerType('papelera');
                    setIsDrawerOpen(true);
                  }}
                  className="w-full py-2 px-2.5 text-left font-bold rounded-xl hover:bg-slate-800 text-rose-300 flex items-center gap-2"
                >
                  🗑️ FINALIZADOS (PAPELERA)
                </button>
                <button
                  onClick={() => {
                    setDrawerType('reagendados');
                    setIsDrawerOpen(true);
                  }}
                  className="w-full py-2 px-2.5 text-left font-bold rounded-xl hover:bg-slate-800 text-sky-300 flex items-center gap-2"
                >
                  📅 REAGENDADOS
                </button>
                <button
                  onClick={() => {
                    setDrawerType('pausadas');
                    setIsDrawerOpen(true);
                  }}
                  className="w-full py-2 px-2.5 text-left font-bold rounded-xl hover:bg-slate-800 text-amber-300 flex items-center gap-2"
                >
                  ⏸️ PAUSADAS
                </button>
                <button
                  onClick={() => {
                    setDrawerType('con_app');
                    setIsDrawerOpen(true);
                  }}
                  className="w-full py-2 px-2.5 text-left font-bold rounded-xl hover:bg-slate-800 text-emerald-300 flex items-center gap-2"
                >
                  📱 CON APP
                </button>
              </div>
            )}
          </div>

          {/* Nuevas Accounts Button */}
          <button
            onClick={() => setIsSemaforoOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition shrink-0"
          >
            <span>🚦 NUEVAS</span>
          </button>

          {/* Aportacion Real Button */}
          <button
            onClick={toggleAportacionReal}
            className={`px-2.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 transition active:scale-95 shrink-0 ${
              isAportacionOn
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-emerald-950/40 shadow-sm'
                : 'bg-gradient-to-r from-rose-700 to-red-800 text-white shadow-rose-950/40 shadow-sm'
            }`}
          >
            <span>{isAportacionOn ? '💰 APORT: ON' : '💰 APORT: OFF'}</span>
          </button>

          {/* Exp / Imp Button */}
          <button
            onClick={() => setIsExpImpOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-extrabold text-xs flex items-center gap-1 active:scale-95 transition shrink-0"
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">EXP/IMP</span>
          </button>

          {/* Flutter Export Button */}
          <button
            onClick={() => setIsFlutterExportOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition shrink-0"
            title="Ver y exportar código nativo de Flutter para Android"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>FLUTTER</span>
          </button>

          {/* Config Button */}
          <button
            onClick={() => setIsConfigOpen(true)}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center transition active:scale-95 shrink-0"
            title="Ajustes"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Search Row */}
        <div className="flex items-center gap-2">
          {/* Active filter badge if any */}
          {activeFilterTag && (
            <div className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded-xl text-xs font-bold shrink-0">
              <span>{activeFilterTag}</span>
              <button onClick={clearFilter} className="hover:text-white font-black ml-1">
                ✕
              </button>
            </div>
          )}

          {/* Map Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={mapSearchText}
              onChange={e => handleMapSearch(e.target.value)}
              placeholder="📍 Buscar en mapa (nombre, contrato, calle)..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none focus:border-orange-500 transition"
            />
          </div>

          {/* Global Search Affiliate Form */}
          <form onSubmit={handleGlobalSearch} className="flex gap-1 shrink-0">
            <input
              type="text"
              value={globalSearchText}
              onChange={e => setGlobalSearchText(e.target.value)}
              placeholder="🔍 Afiliado Web..."
              className="w-28 sm:w-36 bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-400 outline-none focus:border-indigo-500 transition"
            />
          </form>
        </div>
      </header>

      {/* 3. Main Map Canvas Area */}
      <main className="flex-1 w-full h-full relative overflow-hidden">
        <MapComponent
          clientes={displayedClientes}
          currentMode={currentMode}
          userLocation={userLocation}
          isGpsActive={isGpsActive}
          onSelectCliente={c => setSelectedCliente(c)}
          onLocationUpdated={(id, lat, lon) => {
            const currentRuta = currentMode === 'VER_TODAS' || currentMode === 'FILTRO_ACTIVO' ? 'A' : currentMode;
            const list = routesData[currentRuta] || [];
            const idx = list.findIndex(i => {
              const d = mapearDatosCliente(i, diccionarioRutaB);
              return d && d.idEnrutar === id;
            });
            if (idx > -1) {
              const copy = [...list];
              copy[idx] = { ...copy[idx], LATITUD: lat, LONGITUD: lon, LAT: lat, LON: lon };
              saveRouteData(currentRuta, copy);
            }
          }}
          onShowToast={showToast}
          diccionarioRutaB={diccionarioRutaB}
        />

        {/* Floating Android Action Buttons (FAB) */}
        <div className="absolute right-4 bottom-20 z-20 flex flex-col gap-2.5">
          {/* Recenter on User GPS Location */}
          <button
            onClick={() => {
              if (userLocation) {
                showToast('🎯 Mapa enfocado en tu ubicación', 'success');
              } else {
                showToast('⚠️ Activa el GPS para localizar tu posición', 'info');
              }
            }}
            className="w-12 h-12 rounded-2xl bg-slate-900/90 border border-slate-700 text-sky-400 shadow-xl backdrop-blur-md flex items-center justify-center active:scale-90 transition hover:bg-slate-800"
            title="Centrar en mi ubicación"
          >
            <MapPin className="w-5 h-5" />
          </button>

          {/* Motorcycle GPS Tracking Toggle */}
          <button
            onClick={toggleGps}
            className={`w-12 h-12 rounded-2xl shadow-xl backdrop-blur-md flex items-center justify-center active:scale-90 transition border ${
              isGpsActive
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-950/60'
                : 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-950/60'
            }`}
            title="Activar o apagar GPS en tiempo real"
          >
            <span className="text-xl">🏍️</span>
          </button>
        </div>

        {/* In-App PWA Install Banner */}
        {isInstallable && !isInstalled && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-indigo-500/50 rounded-2xl p-2.5 px-4 shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <span className="text-xl">📲</span>
            <div className="text-xs">
              <span className="font-extrabold text-white block">Instalar PABS Pro App</span>
              <span className="text-[10px] text-slate-400">Acceso rápido y offline en tu celular</span>
            </div>
            <button
              onClick={install}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition active:scale-95"
            >
              Instalar
            </button>
          </div>
        )}
      </main>

      {/* 4. Android Bottom Navigation Bar */}
      <nav className="w-full bg-slate-950/95 backdrop-blur-md border-t border-white/10 px-4 py-2 z-30 flex items-center justify-around select-none">
        <button
          onClick={() => {
            clearFilter();
            showToast('🗺️ Vista de Mapa activa', 'info');
          }}
          className={`flex flex-col items-center gap-1 transition ${
            !activeFilterTag ? 'text-orange-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[10px] font-bold">Mapa ({displayedClientes.length})</span>
        </button>

        <button
          onClick={() => {
            setDrawerType('activos');
            setIsDrawerOpen(true);
          }}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition"
        >
          <ListFilter className="w-5 h-5" />
          <span className="text-[10px] font-bold">Activos</span>
        </button>

        <button
          onClick={() => setIsStatsOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-bold">Stats</span>
        </button>

        <button
          onClick={() => setIsSemaforoOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition"
        >
          <span className="text-lg leading-none">🚦</span>
          <span className="text-[10px] font-bold">Nuevas</span>
        </button>

        <button
          onClick={() => setIsFlutterExportOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-indigo-400 transition"
        >
          <Smartphone className="w-5 h-5 text-indigo-400" />
          <span className="text-[10px] font-bold text-indigo-300">Flutter</span>
        </button>
      </nav>

      {/* 5. Modals & Dialogs */}
      <ClientBottomSheet
        cliente={selectedCliente}
        isOpen={!!selectedCliente}
        onClose={() => setSelectedCliente(null)}
        currentMode={currentMode}
        onUpdateCliente={handleUpdateCliente}
        onSendToTrash={handleSendToTrash}
        onViewJson={c => {
          setJsonTargetCliente(c);
          setIsJsonModalOpen(true);
        }}
        onOpenWebVisor={(url, title) => {
          setVisorUrl(url);
          setVisorTitle(title);
          setIsWebVisorOpen(true);
        }}
        onShowToast={showToast}
        diccionarioRutaB={diccionarioRutaB}
      />

      <StatsDashboardModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        currentMode={currentMode}
        clientes={displayedClientes}
        onApplyFilter={handleApplyFilter}
        diccionarioRutaB={diccionarioRutaB}
      />

      <ListsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        listType={drawerType}
        currentMode={currentMode}
        activos={routesData[currentMode === 'VER_TODAS' || currentMode === 'FILTRO_ACTIVO' ? 'A' : currentMode] || []}
        papelera={trashData[currentMode === 'VER_TODAS' || currentMode === 'FILTRO_ACTIVO' ? 'A' : currentMode] || []}
        onSelectCliente={c => setSelectedCliente(c)}
        onRestoreCliente={handleRestoreFromTrash}
        onClearPapelera={() => {
          const r = currentMode === 'VER_TODAS' || currentMode === 'FILTRO_ACTIVO' ? 'A' : currentMode;
          saveTrashData(r, []);
          showToast(`🔥 Papelera de Ruta ${r} vaciada`, 'info');
        }}
        onRemovePausa={handleRemovePausa}
        onExportReporte={handleExportCsvReport}
        diccionarioRutaB={diccionarioRutaB}
      />

      <SemaforoNuevasModal
        isOpen={isSemaforoOpen}
        onClose={() => setIsSemaforoOpen(false)}
        onSelectNewClient={c => setSelectedCliente(c)}
        onShowToast={showToast}
      />

      <ExpImpModal
        isOpen={isExpImpOpen}
        onClose={() => setIsExpImpOpen(false)}
        currentMode={currentMode}
        activos={routesData[currentMode === 'VER_TODAS' || currentMode === 'FILTRO_ACTIVO' ? 'A' : currentMode] || []}
        papelera={trashData[currentMode === 'VER_TODAS' || currentMode === 'FILTRO_ACTIVO' ? 'A' : currentMode] || []}
        onImportCategory={(cat, data) => {
          const r = currentMode === 'VER_TODAS' || currentMode === 'FILTRO_ACTIVO' ? 'A' : currentMode;
          if (cat === 'papelera') {
            saveTrashData(r, data);
          } else if (cat === 'completa') {
            saveRouteData(r, data);
          } else {
            // Merge into active route
            const currentList = routesData[r] || [];
            const merged = [...currentList];
            data.forEach(item => {
              const d = mapearDatosCliente(item, diccionarioRutaB);
              const idx = merged.findIndex(m => {
                const dm = mapearDatosCliente(m, diccionarioRutaB);
                return dm && d && dm.idEnrutar === d.idEnrutar;
              });
              if (idx > -1) {
                merged[idx] = { ...merged[idx], ...item };
              } else {
                merged.push(item);
              }
            });
            saveRouteData(r, merged);
          }
        }}
        onImportExcel={(data, targetRuta) => {
          saveRouteData(targetRuta, data);
        }}
        onShowToast={showToast}
      />

      <FlutterExportModal
        isOpen={isFlutterExportOpen}
        onClose={() => setIsFlutterExportOpen(false)}
        onShowToast={showToast}
      />

      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        currentMode={currentMode}
        userRole={userRole}
        onToggleUserRole={() => {
          const next = userRole === 'admin' ? 'operador' : 'admin';
          setUserRole(next);
          localStorage.setItem('pabs_user_role', next);
          showToast(`Modo cambiado a: ${next.toUpperCase()}`, 'info');
        }}
        selectedVerTodasRutas={selectedVerTodas}
        onToggleVerTodasRuta={r => {
          let updated = [...selectedVerTodas];
          if (updated.includes(r)) {
            if (updated.length === 1) {
              showToast('Debe quedar al menos una ruta seleccionada', 'warning');
              return;
            }
            updated = updated.filter(item => item !== r);
          } else {
            updated.push(r);
          }
          setSelectedVerTodas(updated);
          localStorage.setItem('rutas_visibles', JSON.stringify(updated));
        }}
        isAportacionOn={isAportacionOn}
        onToggleAportacion={toggleAportacionReal}
        onFilterHoy={() => handleApplyFilter('HOY', 'HOY')}
        onFilterVencidos={() => handleApplyFilter('VENCIDOS', 'VENCIDOS')}
        onFilterCriticos={() => handleApplyFilter('CRITICOS', '+90 DÍAS')}
        onResetRoute={handleResetCurrentRoute}
        onOpenVisor={(url, title) => {
          setVisorUrl(url);
          setVisorTitle(title);
          setIsWebVisorOpen(true);
        }}
        onShowToast={showToast}
      />

      <WebVisorModal
        isOpen={isWebVisorOpen}
        onClose={() => setIsWebVisorOpen(false)}
        url={visorUrl}
        title={visorTitle}
      />

      <JsonViewerModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        cliente={jsonTargetCliente}
        onShowToast={showToast}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}
