import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  Clock,
  Calendar,
  AlertTriangle,
  FileText,
  MapPin,
  ExternalLink,
  ChevronDown,
  Pause,
  Trash2,
  Send,
  Code2,
} from 'lucide-react';
import { Cliente, NormalizedCliente, DisplayRouteMode } from '../types';
import {
  mapearDatosCliente,
  esDiaDePagoHoy,
  formatearFechaConDia,
  obtenerLinkWADinamico,
  obtenerLinkWA_PagoHoy,
  obtenerLinkNoEsta,
  calcularProximoPagoDinamico,
  obtenerRangoSemanaOperativa,
  enviarBalizaServidor,
  enviarApiWhaConBaliza,
  obtenerMensajeWADinamico,
  obtenerMensajeWA_PagoHoy,
  obtenerMensajeProntoPaso,
} from '../utils/pabsLogic';

interface ClientBottomSheetProps {
  cliente: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
  currentMode: DisplayRouteMode;
  onUpdateCliente: (updated: Cliente) => void;
  onSendToTrash: (idEnrutar: string) => void;
  onViewJson: (cliente: NormalizedCliente) => void;
  onOpenWebVisor: (url: string, title: string) => void;
  onShowToast: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  diccionarioRutaB?: Record<string, Cliente>;
}

export const ClientBottomSheet: React.FC<ClientBottomSheetProps> = ({
  cliente,
  isOpen,
  onClose,
  currentMode,
  onUpdateCliente,
  onSendToTrash,
  onViewJson,
  onOpenWebVisor,
  onShowToast,
  diccionarioRutaB = {},
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showReagendarMenu, setShowReagendarMenu] = useState(false);
  const [showNoEstaMenu, setShowNoEstaMenu] = useState(false);
  const [notaTexto, setNotaTexto] = useState('');

  if (!isOpen || !cliente) return null;

  const datos: NormalizedCliente | null = mapearDatosCliente(cliente, diccionarioRutaB);
  if (!datos) return null;

  const estadoHoy = esDiaDePagoHoy(cliente);
  const isHoy = estadoHoy === 'HOY';
  const isVencido = typeof estadoHoy === 'object' && estadoHoy.estado === 'PENDIENTE';
  const diasVencidos = typeof estadoHoy === 'object' ? estadoHoy.diasVencidos || datos.sa : datos.sa;

  const totalVisitas = cliente._visitasTotal || 0;

  // Retrieve saved local note
  const notasLocales = JSON.parse(localStorage.getItem('pabs_notas_rapidas') || '{}');
  const notaPrevia = notasLocales[datos.idEnrutar]?.texto || '';

  // WhatsApp links
  const linkWA_Dinamico = obtenerLinkWADinamico(cliente);
  const linkWA_Hoy = obtenerLinkWA_PagoHoy(cliente);
  const linkWA_NoEsta = obtenerLinkNoEsta(cliente);
  const mensajeProntoPaso = `Hola ${datos.nombre}, le saluda Rodrigo Valencia de PABS. Pasaremos en unos minutos a su domicilio por su aportación al plan. De no encontrarse apóyeme indicándolo, ¡Saludos!`;
  const linkWA_ProntoPaso = `https://wa.me/521${datos.telSolo}?text=${encodeURIComponent(mensajeProntoPaso)}`;

  // Handle local note save
  const handleGuardarNota = () => {
    const texto = notaTexto.trim();
    if (texto) {
      notasLocales[datos.idEnrutar] = { texto, fecha: new Date().toLocaleString() };
      localStorage.setItem('pabs_notas_rapidas', JSON.stringify(notasLocales));
    }

    // Send anti-CORS beacon to server
    const urlInci = `https://webrigo.devlara.us.ci/addinci.php?afil=${datos.idEnrutar}&dia=&m=0&come=${encodeURIComponent(texto)}`;
    enviarBalizaServidor(urlInci);

    const updatedCliente: Cliente = {
      ...cliente,
      _visitasTotal: totalVisitas + 1,
      'ULTIMO MOTIVO': 'COMENTARIO',
      'ULTIMO COMENTARIO': texto || cliente['ULTIMO COMENTARIO'],
      'ULTIMA VISITA': new Date().toISOString().split('T')[0],
    };
    onUpdateCliente(updatedCliente);
    setNotaTexto('');
    onShowToast('📝 Gestión y nota guardadas con éxito', 'success');
  };

  // Pause account until next dynamic billing cycle
  const handlePausarCuenta = () => {
    const { finMiercoles } = obtenerRangoSemanaOperativa();
    const tzOffset = finMiercoles.getTimezoneOffset() * 60000;
    const fechaFinPausaOriginal = new Date(finMiercoles.getTime() - tzOffset).toISOString().split('T')[0];
    const fechaPausa = calcularProximoPagoDinamico(datos.periodicidad, datos.diaPago, fechaFinPausaOriginal);
    const fechaHoy = new Date().toLocaleDateString('es-MX');

    const updatedCliente: Cliente = {
      ...cliente,
      _pausadoHasta: fechaPausa,
      _motivoPausa: 'Pausado manualmente',
      _fechaPausa: fechaHoy,
    };
    onUpdateCliente(updatedCliente);
    onShowToast(`⏸️ ${datos.nombre} pausado hasta ${fechaPausa}`, 'warning');
    onClose();
  };

  // Handle rapid status (Problemas, Cancelar, No Existe, Domicilio)
  const handleGestionStatus = (motivoCode: number, textoMotivo: string) => {
    const urlInci = `https://webrigo.devlara.us.ci/addinci.php?id=879&afil=${datos.idEnrutar}&dia=&m=${motivoCode}&come=${encodeURIComponent(textoMotivo)}`;
    enviarBalizaServidor(urlInci);

    const hoyObj = new Date();
    const diaSemanaHoy = hoyObj.getDay();
    let fechaPausa = '';

    if (diaSemanaHoy === 4 || diaSemanaHoy === 5) {
      // Thursday or Friday rule (+7 days)
      const proxima = new Date(hoyObj);
      proxima.setDate(hoyObj.getDate() + 7);
      fechaPausa = new Date(proxima.getTime() - proxima.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    } else {
      const { finMiercoles } = obtenerRangoSemanaOperativa();
      const fechaFin = new Date(finMiercoles.getTime() - finMiercoles.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      fechaPausa = calcularProximoPagoDinamico(datos.periodicidad, datos.diaPago, fechaFin);
    }

    const updatedCliente: Cliente = {
      ...cliente,
      _pausadoHasta: fechaPausa,
      _motivoPausa: textoMotivo,
      _fechaPausa: new Date().toLocaleDateString('es-MX'),
      'ULTIMO MOTIVO': textoMotivo,
      'ULTIMO COMENTARIO': 'Cambio de estatus',
      'ULTIMA VISITA': new Date().toISOString().split('T')[0],
      _visitasTotal: totalVisitas + 1,
    };
    onUpdateCliente(updatedCliente);
    onShowToast(`🚩 Estatus registrado: ${textoMotivo} (Reagendado a ${fechaPausa})`, 'warning');
    setShowStatusMenu(false);
    onClose();
  };

  // Handle rescheduling to target weekday (L, M, X, J, V, S, D)
  const handleReagendarDia = (diaLetra: string) => {
    const mapDias: Record<string, string> = {
      L: 'LUNES',
      M: 'MARTES',
      X: 'MIERCOLES',
      J: 'JUEVES',
      V: 'VIERNES',
      S: 'SABADO',
      D: 'DOMINGO',
    };
    const diaDestino = mapDias[diaLetra] || 'LUNES';

    // Dispatch WhatsApp beacon
    const msg = `Hola ${datos.nombre}, le saluda Rodrigo Valencia de PABS. Registré su visita para el próximo ${diaDestino}. Quedamos pendientes para su aportación. ¡Excelente día!`;
    const apiWha = `https://rigo.devlara.us.ci/apiwha.php?a=msg&numero=${datos.telSolo}&mensaje=${encodeURIComponent(msg)}`;
    enviarBalizaServidor(apiWha);

    const updatedCliente: Cliente = {
      ...cliente,
      _volverDia: diaDestino,
    };
    onUpdateCliente(updatedCliente);
    onShowToast(`📅 Reagendado para el próximo ${diaDestino}`, 'success');
    setShowReagendarMenu(false);
    setShowNoEstaMenu(false);
    onClose();
  };

  // Handle "No Está" options
  const handleNoEstaOpcion = (opcion: 'hoy' | 'finalizar') => {
    if (opcion === 'hoy') {
      const urlInci = `https://webrigo.devlara.us.ci/addinci.php?afil=${datos.idEnrutar}&dia=&m=0&come=`;
      enviarBalizaServidor(urlInci);
      const msg = `Hola ${datos.nombre}, pasé a visitarle hoy y no le encontré. Trataré de volver más tarde para dar seguimiento a su aportación. ¡Saludos!`;
      const apiWha = `https://rigo.devlara.us.ci/apiwha.php?a=msg&numero=${datos.telSolo}&mensaje=${encodeURIComponent(msg)}`;
      enviarBalizaServidor(apiWha);

      const updatedCliente: Cliente = {
        ...cliente,
        'ULTIMO MOTIVO': 'NO ESTÁ',
        'ULTIMO COMENTARIO': 'Volveré más tarde hoy',
        'ULTIMA VISITA': new Date().toISOString().split('T')[0],
        _visitasTotal: totalVisitas + 1,
      };
      onUpdateCliente(updatedCliente);
      onShowToast(`🕐 No está: Notificado por WhatsApp (Volveré hoy)`, 'info');
      onClose();
    } else if (opcion === 'finalizar') {
      const urlInci = `https://webrigo.devlara.us.ci/addinci.php?afil=${datos.idEnrutar}&dia=&m=0&come=${encodeURIComponent('no se encontro')}`;
      enviarBalizaServidor(urlInci);
      const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msg = `Hola ${datos.nombre}, le saluda Rodrigo Valencia de PABS. Pasé a visitarle a las ${hora} y no logré encontrarle. Por favor comuníquese para coordinar su pago. Saludos.`;
      const apiWha = `https://rigo.devlara.us.ci/apiwha.php?a=msg&numero=${datos.telSolo}&mensaje=${encodeURIComponent(msg)}`;
      enviarBalizaServidor(apiWha);

      onSendToTrash(datos.idEnrutar);
      onShowToast(`🧹 ${datos.nombre} finalizado por hoy (enviado a papelera)`, 'warning');
      onClose();
    }
  };

  // Handle "NO" desenrutar
  const handleDesenrutarNo = () => {
    const urlConfig = `https://webrigo.devlara.us.ci/configg.php?id=${datos.idEnrutar}&conf=enrutar&config=false`;
    enviarBalizaServidor(urlConfig);
    onSendToTrash(datos.idEnrutar);
    onShowToast(`🗺️ Cuenta quitada del mapa y desenrutada`, 'warning');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:p-4">
      <div
        className="w-full sm:max-w-md bg-slate-900 border border-slate-700/60 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col text-slate-100 animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1.5 bg-slate-600/60 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold">
              ID: {datos.idEnrutar}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
              Ruta {currentMode}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 active:scale-95 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content scrollable area */}
        <div className="overflow-y-auto px-4 py-3 space-y-3 flex-1 text-sm">
          {/* Client Name with Link to Web Profile (afiliado-${idAfiliado}) */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  const urlAfi = `https://webrigo.devlara.us.ci/afiliado-${datos.idAfiliado}`;
                  onOpenWebVisor(urlAfi, `AFILIADO: ${datos.nombre}`);
                }}
                className="text-lg sm:text-xl font-black text-white hover:text-indigo-300 transition text-center tracking-tight underline decoration-indigo-400/50 hover:decoration-indigo-300 active:scale-95"
                title="Ver ficha web del afiliado"
              >
                {datos.nombre || 'SIN NOMBRE'}
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  window.open(`https://webrigo.devlara.us.ci/afiliado-${datos.idAfiliado}`, '_blank');
                }}
                className="p-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 transition active:scale-90"
                title="Abrir ficha en pestaña nueva"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-indigo-400/90 font-medium tracking-wide">
              🌐 Toca el nombre para abrir ficha oficial en PABS Web
            </p>
          </div>

          {/* Top 3 Badges */}
          <div className="grid grid-cols-3 gap-2">
            {/* 1. Payment status (Dispatches via api_wha baliza) */}
            <div className="flex">
              {isHoy ? (
                <button
                  onClick={() => {
                    const msg = obtenerMensajeWA_PagoHoy(cliente);
                    enviarApiWhaConBaliza(cliente, msg);
                    onShowToast(`💬 Mensaje de pago de hoy enviado a ${datos.nombre} vía api_wha`, 'success');
                  }}
                  className="w-full py-2 px-1 text-center font-extrabold text-[11px] rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-950/40 es-hoy flex items-center justify-center gap-1 leading-tight active:scale-95 transition"
                  title="Enviar aviso de pago de hoy vía servidor api_wha"
                >
                  🔥 HOY PAGO
                </button>
              ) : isVencido ? (
                <button
                  onClick={() => {
                    const msg = obtenerMensajeWADinamico(cliente);
                    enviarApiWhaConBaliza(cliente, msg);
                    onShowToast(`💬 Aviso de atraso enviado a ${datos.nombre} vía api_wha`, 'success');
                  }}
                  className="w-full py-2 px-1 text-center font-extrabold text-[11px] rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md flex items-center justify-center gap-1 leading-tight active:scale-95 transition"
                  title="Enviar recordatorio de atraso vía servidor api_wha"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {diasVencidos}D VENC.
                </button>
              ) : (
                <div className="w-full py-2 px-1 text-center font-extrabold text-[11px] rounded-xl bg-slate-800/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center leading-tight">
                  ✅ AL DÍA
                </div>
              )}
            </div>

            {/* 2. Frequency & Day */}
            <div className="w-full py-2 px-1 text-center font-extrabold text-[11px] rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 flex items-center justify-center gap-1 leading-tight">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {datos.periodicidad.slice(0, 4)}. [{datos.diaPago}]
              </span>
            </div>

            {/* 3. Days Overdue & WhatsApp via api_wha baliza */}
            <button
              onClick={() => {
                const msg = obtenerMensajeWADinamico(cliente);
                enviarApiWhaConBaliza(cliente, msg);
                onShowToast(`💬 Mensaje enviado a ${datos.nombre} vía servidor api_wha`, 'success');
              }}
              className={`w-full py-2 px-1 text-center font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1 leading-tight transition active:scale-95 ${
                datos.sa > 30
                  ? 'bg-gradient-to-r from-red-600/80 to-rose-700/80 text-white border border-red-500/50 shadow-md'
                  : 'bg-slate-800 text-slate-200 border border-slate-700'
              }`}
              title="Toca para enviar WhatsApp vía baliza api_wha"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>{datos.sa}D 💬</span>
            </button>
          </div>

          {/* Account Details Box */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-3 space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
              <span>
                <strong className="text-slate-100">Contrato:</strong> {datos.contrato}
              </span>
              <span className="font-bold text-emerald-400 text-sm">
                Saldo: ${datos.saldo}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span>
                <strong>Última visita:</strong> {formatearFechaConDia(datos.fechaVisita)}
              </span>
              <span className="bg-slate-700/60 px-2 py-0.5 rounded text-amber-300 font-bold">
                Visitas: {totalVisitas}
              </span>
            </div>
            <div className="text-[11px]">
              <strong>Último Pago:</strong> {formatearFechaConDia(datos.fechaPago)}
            </div>
            <div className="pt-1 border-t border-white/5 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Status: </span>
              <span className="text-indigo-300 font-bold">{datos.ultimoMotivo}</span>
              {datos.ultimoComentario && (
                <p className="mt-0.5 italic text-slate-400 line-clamp-2">"{datos.ultimoComentario}"</p>
              )}
            </div>
          </div>

          {/* Address Box (Exact PABS Intranet Search function from original HTML + GPS) */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const rawUrlApp = (cliente['URL APP'] || cliente['urlApp'] || cliente['URL_APP']) as string | undefined;
                const urlBuscar =
                  rawUrlApp ||
                  `https://webrigo.devlara.us.ci/buscar/?buscar=${encodeURIComponent(datos.nombre)}`;
                onOpenWebVisor(urlBuscar, `BUSCAR PABS: ${datos.nombre}`);
              }}
              className="flex-1 p-2.5 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/40 text-slate-100 text-xs flex flex-col items-center justify-center text-center transition active:scale-95 shadow-sm group"
              title="Toca para buscar este afiliado en el sistema PABS Web"
            >
              <div className="flex items-center gap-1.5 font-bold text-white group-hover:text-indigo-200 max-w-full">
                <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="truncate">{datos.dirFinal}</span>
              </div>
              <span className="text-[10px] text-indigo-300 font-medium mt-0.5 flex items-center gap-1">
                🔍 Toca para buscar en PABS Web ({datos.nombre})
              </span>
            </button>

            <button
              onClick={() => {
                const rawUrlApp = (cliente['URL APP'] || cliente['urlApp'] || cliente['URL_APP']) as string | undefined;
                const urlBuscar =
                  rawUrlApp ||
                  `https://webrigo.devlara.us.ci/buscar/?buscar=${encodeURIComponent(datos.nombre)}`;
                window.open(urlBuscar, '_blank');
              }}
              className="px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 font-bold text-[11px] flex items-center justify-center transition active:scale-95"
              title="Abrir búsqueda en ventana nueva"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(datos.dirFinal)}`,
                  '_blank'
                )
              }
              className="px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-black text-[10px] flex items-center justify-center transition active:scale-95"
              title="Abrir en Google Maps GPS"
            >
              GPS
            </button>
          </div>

          {/* Follow-up & Pause row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleGuardarNota}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
            >
              🚶 SEGUIR VISITANDO
            </button>
            <button
              onClick={handlePausarCuenta}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-600 active:scale-95 transition"
            >
              <Pause className="w-3.5 h-3.5" />
              PAUSAR CUENTA
            </button>
          </div>

          {/* Status Submenu Accordion */}
          <div>
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-800 text-white font-bold text-xs flex items-center justify-between shadow-md active:scale-95 transition"
            >
              <span>🚩 GESTIONAR STATUS</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
            </button>

            {showStatusMenu && (
              <div className="mt-2 grid grid-cols-2 gap-1.5 p-2 bg-slate-800/80 border border-slate-700 rounded-xl">
                <button
                  onClick={() => handleGestionStatus(1, 'posible cancelacion')}
                  className="py-2 px-2 text-xs font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200"
                >
                  PROBLEMAS
                </button>
                <button
                  onClick={() => handleGestionStatus(3, 'Cliente solicita cancelación')}
                  className="py-2 px-2 text-xs font-bold rounded-lg bg-red-700 hover:bg-red-600 text-white"
                >
                  CANCELAR
                </button>
                <button
                  onClick={() => handleGestionStatus(4, 'Domicilio no existe')}
                  className="py-2 px-2 text-xs font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200"
                >
                  NO EXISTE
                </button>
                <button
                  onClick={() => handleGestionStatus(5, 'ya no vive en domicilio')}
                  className="py-2 px-2 text-xs font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200"
                >
                  DOMICILIO
                </button>
              </div>
            )}
          </div>

          {/* Reschedule Button & Days Picker */}
          <div>
            <button
              onClick={() => setShowReagendarMenu(!showReagendarMenu)}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-white font-bold text-xs flex items-center justify-between shadow-md active:scale-95 transition"
            >
              <span>📅 REAGENDAR CUENTA</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showReagendarMenu ? 'rotate-180' : ''}`} />
            </button>

            {showReagendarMenu && (
              <div className="mt-2 p-2 bg-slate-800/80 border border-slate-700 rounded-xl flex justify-between gap-1">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(dia => (
                  <button
                    key={dia}
                    onClick={() => handleReagendarDia(dia)}
                    className="flex-1 py-2 font-black text-xs rounded-lg bg-slate-700 hover:bg-indigo-600 text-white transition active:scale-90"
                  >
                    {dia}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Call & Pronto Paso */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${datos.telSolo}`}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
            >
              <Phone className="w-3.5 h-3.5" />
              LLAMAR
            </a>
            <button
              onClick={() => {
                const msg = obtenerMensajeProntoPaso(datos.nombre);
                enviarApiWhaConBaliza(cliente, msg);
                onShowToast(`💬 Mensaje de Pronto Paso enviado a ${datos.nombre} vía api_wha`, 'success');
              }}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
              title="Avisar que pasas en unos minutos vía api_wha"
            >
              <Clock className="w-3.5 h-3.5" />
              PRONTO PASO
            </button>
          </div>

          {/* I, PDF, JSON & WhatsApp Row (From original HTML) */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => {
                const urlInci1 = (cliente['URL INCI1'] || cliente['URL INCI']) as string | undefined;
                const targetUrl =
                  urlInci1 ||
                  `https://webrigo.devlara.us.ci/addinci.php?afil=${datos.idAfiliado}&dia=&m=0&come=`;
                onOpenWebVisor(targetUrl, `INCIDENCIA: ${datos.nombre}`);
              }}
              className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition"
              title="Abrir formulario de Incidencia (I)"
            >
              <span>ℹ️ I</span>
            </button>
            <button
              onClick={() =>
                onOpenWebVisor(
                  `https://webrigo.devlara.us.ci/${datos.idAfiliado}-estado.pdf`,
                  `PDF ESTADO: ${datos.nombre}`
                )
              }
              className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => onViewJson(datos)}
              className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition"
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>JSON</span>
            </button>
            <button
              onClick={() => {
                const msg = obtenerMensajeWADinamico(cliente);
                enviarApiWhaConBaliza(cliente, msg);
                onShowToast(`💬 Mensaje enviado a ${datos.nombre} vía servidor api_wha`, 'success');
              }}
              className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition"
              title="Enviar WhatsApp de cobranza vía servidor api_wha"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>WHA</span>
            </button>
          </div>

          {/* "No Está" Management */}
          <div>
            <button
              onClick={() => setShowNoEstaMenu(!showNoEstaMenu)}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-between border border-slate-600 active:scale-95 transition"
            >
              <span>🏠 GESTIÓN "NO ESTÁ"</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showNoEstaMenu ? 'rotate-180' : ''}`} />
            </button>

            {showNoEstaMenu && (
              <div className="mt-2 p-2.5 bg-slate-800/90 border border-slate-700 rounded-xl space-y-2">
                <button
                  onClick={() => handleNoEstaOpcion('hoy')}
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs"
                >
                  🕐 VOLVERÉ HOY
                </button>
                <button
                  onClick={() => handleNoEstaOpcion('finalizar')}
                  className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-slate-200 text-xs"
                >
                  🧹 FINALIZAR HOY (PAPELERA)
                </button>
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                    📅 Volveré otro día (Reagendar):
                  </span>
                  <div className="flex gap-1">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(dia => (
                      <button
                        key={dia}
                        onClick={() => handleReagendarDia(dia)}
                        className="flex-1 py-1.5 font-bold text-xs rounded bg-slate-700 hover:bg-indigo-600 text-white"
                      >
                        {dia}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action buttons: Finalizar & No */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onSendToTrash(datos.idEnrutar);
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              FINALIZAR
            </button>
            <button
              onClick={handleDesenrutarNo}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-600 active:scale-95 transition"
            >
              🗺️ NO (QUITAR)
            </button>
          </div>

          {/* Note Input Box */}
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <textarea
              value={notaTexto}
              onChange={e => setNotaTexto(e.target.value)}
              placeholder={notaPrevia ? `💬 Nota previa: ${notaPrevia}` : '✍️ Escribe nota o acuerdo de pago...'}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none resize-none"
              rows={2}
            />
            <button
              onClick={handleGuardarNota}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
            >
              <Send className="w-3 h-3" />
              ENVIAR NOTA A SERVIDOR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
