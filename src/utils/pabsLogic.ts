import { Cliente, NormalizedCliente, PaymentStatus } from '../types';

export function getVal(obj: Record<string, unknown> | null | undefined, names: string[]): string {
  if (!obj) return '';
  const keys = Object.keys(obj);
  for (const n of names) {
    const target = n.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const foundKey = keys.find(
      k => k.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() === target
    );
    if (foundKey) {
      const val = obj[foundKey];
      return val === undefined || val === null ? '' : String(val).trim();
    }
  }
  return '';
}

export function mapearDatosCliente(
  c: Cliente | null | undefined,
  diccionarioRutaB: Record<string, Cliente> = {}
): NormalizedCliente | null {
  if (!c) return null;

  const rawObj = c as Record<string, unknown>;
  const nombreOriginal = getVal(rawObj, ['Nombre Cliente', 'Nombre', 'CLIENTE']).toUpperCase().trim();
  let contratoOriginal = getVal(rawObj, ['contrato', 'CONTRATO']).trim();
  const idUnicoOriginal = getVal(rawObj, ['id', 'ID']).trim();

  if (!contratoOriginal && idUnicoOriginal) contratoOriginal = idUnicoOriginal;

  const cuentaActualizada =
    (idUnicoOriginal && diccionarioRutaB[idUnicoOriginal]) ||
    (contratoOriginal && diccionarioRutaB[contratoOriginal]) ||
    (nombreOriginal && diccionarioRutaB[nombreOriginal]) ||
    null;

  const fuenteDatos = cuentaActualizada ? (cuentaActualizada as Record<string, unknown>) : rawObj;

  const nombre = getVal(fuenteDatos, ['Nombre Cliente', 'Nombre', 'CLIENTE']).toUpperCase().trim() || 'CLIENTE';
  const idUnico = idUnicoOriginal || getVal(fuenteDatos, ['id', 'ID']).trim() || String(Math.floor(Math.random() * 900000 + 100000));
  const idAfiliado = idUnico;
  const contrato = contratoOriginal || idUnico;

  const periodicidad = getVal(fuenteDatos, ['PERIODICIDAD', 'Periodicidad']).toUpperCase().trim() || 'SEMANAL';
  const sa = parseInt(getVal(fuenteDatos, ['DIAS SIN ABONAR', 'DIAS SIN APORTAR', 'sa']), 10) || 0;

  let diaPago = String(getVal(fuenteDatos, ['Dia De Pago', 'DIA DE PAGO', 'Dia Pago', 'diaPago'])).toUpperCase().trim();
  if (diaPago.includes('SEMANAL:')) {
    diaPago = diaPago.split('SEMANAL:')[1].trim();
  }

  const fechaVisita = getVal(fuenteDatos, ['ULTIMA VISITA', 'fechaVisita']).trim();
  const fechaPago = getVal(fuenteDatos, ['ULTIMA APORTACION', 'FECHA DE PAGO', 'fechaPago']).trim();
  const saldo = getVal(fuenteDatos, ['SALDO', 'SALDO TOTAL', 'Saldo', 'saldo']).trim() || '0.00';
  const montoAporte = parseFloat(getVal(fuenteDatos, ['MONTO APORTE', 'MONTO_APORTE', 'CANTIDAD_APORTACION'])) || 150;
  const sistema = getVal(fuenteDatos, ['SISTEMA', 'Sistema']).toUpperCase() || 'PABS';
  const colonia = getVal(fuenteDatos, ['COLONIA', 'Colonia']).trim().replace(/^:/, '') || 'CENTRO';

  let ultimoMotivo = getVal(rawObj, ['ULTIMO MOTIVO']).trim();
  let ultimoComentario = getVal(rawObj, ['ULTIMO COMENTARIO', 'COMENTARIO', 'OBSERVACIONES']).trim();

  if (ultimoMotivo !== 'CUENTA NUEVA') {
    ultimoMotivo = getVal(fuenteDatos, ['ULTIMO MOTIVO', 'MOTIVO', 'RESULTADO']).trim() || 'SIN REGISTRO';
    ultimoComentario = getVal(fuenteDatos, ['ULTIMO COMENTARIO', 'COMENTARIO', 'OBSERVACIONES']).trim() || '';
  }

  const rawTel = String(getVal(fuenteDatos, ['Num. Telefonico', 'TEL', 'TELEFONO'])).replace(/\D/g, '');
  const cleanTel = rawTel.slice(-10);
  const tel = cleanTel.length === 10 ? '521' + cleanTel : rawTel;
  const origenD = c._tagMapaD || '';

  let dirFinal = getVal(rawObj, ['DIRECCION', 'DOMICILIO', 'Direccion', 'UBICACION']).toUpperCase();
  if (dirFinal.includes('MAPS.GOOGLE.COM')) {
    const parts = dirFinal.split('q=');
    dirFinal = parts.length > 1 ? decodeURIComponent(parts[1]).toUpperCase() : 'VER MAPA';
  }
  if (!dirFinal) {
    dirFinal = 'COL. ' + colonia;
  }

  let lat = parseFloat(getVal(rawObj, ['LAT', 'LATITUD', 'lat']));
  let lon = parseFloat(getVal(rawObj, ['LON', 'LONGITUD', 'lon', 'lng']));
  if (isNaN(lat) || isNaN(lon)) {
    const cordsRaw = getVal(rawObj, ['CORDS', 'COORDINADAS']).trim();
    if (cordsRaw && cordsRaw.includes(',')) {
      const parts = cordsRaw.split(',');
      lat = parseFloat(parts[0]);
      lon = parseFloat(parts[1]);
    }
  }

  const appVal = String(getVal(rawObj, ['APP INSTALADA', 'APP_INSTALADA'])).toUpperCase().trim();
  const tieneApp = appVal !== '' && appVal !== 'FALSE' && appVal !== '0' && appVal !== 'NO';

  return {
    idEnrutar: idUnico,
    idAfiliado,
    contrato,
    nombre,
    dirFinal,
    colonia,
    sistema,
    tel,
    telSolo: cleanTel,
    periodicidad,
    sa,
    diaPago: diaPago || 'LUNES',
    fechaVisita,
    fechaPago,
    saldo,
    montoAporte,
    ultimoMotivo,
    ultimoComentario,
    lat: isNaN(lat) ? undefined : lat,
    lon: isNaN(lon) ? undefined : lon,
    origenD,
    tieneApp,
    raw: c,
  };
}

export function obtenerRangoSemanaOperativa() {
  const hoy = new Date();
  const hoyNorm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const diaSemana = hoyNorm.getDay(); // 0=Dom, 1=Lun, ..., 4=Jue, 5=Vie, 6=Sab

  // PABS operational cycle starts Thursday and finishes Wednesday
  const diasDesdeJueves = diaSemana >= 4 ? diaSemana - 4 : diaSemana + 3;

  const inicioJueves = new Date(hoyNorm);
  inicioJueves.setDate(hoyNorm.getDate() - diasDesdeJueves);

  const finMiercoles = new Date(inicioJueves);
  finMiercoles.setDate(inicioJueves.getDate() + 6);

  return { inicioJueves, finMiercoles, hoyNorm };
}

export function parsearFechaFlexible(fechaStr: string | undefined): Date | null {
  if (!fechaStr) return null;
  const fLimpia = String(fechaStr).trim().replace(/['"]/g, '');
  if (!fLimpia || fLimpia.toUpperCase().includes('NO REGISTRADA')) return null;

  const partes = fLimpia.replace(/-/g, '/').split('/');
  if (partes.length !== 3) return null;

  const p0 = parseInt(partes[0], 10);
  const p1 = parseInt(partes[1], 10);
  const p2 = parseInt(partes[2], 10);

  if (isNaN(p0) || isNaN(p1) || isNaN(p2)) return null;

  let anio: number, mes: number, dia: number;

  if (p0 > 1000) {
    // YYYY/MM/DD
    anio = p0;
    mes = p1 - 1;
    dia = p2;
  } else if (p2 > 1000) {
    anio = p2;
    if (p0 > 12) {
      // DD/MM/YYYY
      dia = p0;
      mes = p1 - 1;
    } else {
      // MM/DD/YYYY
      mes = p0 - 1;
      dia = p1;
    }
  } else {
    return null;
  }

  const fObj = new Date(anio, mes, dia);
  return isNaN(fObj.getTime()) ? null : fObj;
}

export function yaSeGestionoEstaSemana(fechaVisita: string | undefined): boolean {
  const fechaObj = parsearFechaFlexible(fechaVisita);
  if (!fechaObj) return false;

  const fechaVisitaTime = new Date(fechaObj.getFullYear(), fechaObj.getMonth(), fechaObj.getDate()).getTime();
  const { inicioJueves, hoyNorm } = obtenerRangoSemanaOperativa();

  return fechaVisitaTime >= inicioJueves.getTime() && fechaVisitaTime <= hoyNorm.getTime();
}

export function obtenerFechaCobroSemanaActual(diaAsignadoTexto: string): Date | null {
  const { inicioJueves } = obtenerRangoSemanaOperativa();
  const diasNombres = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

  let diaLimpio = String(diaAsignadoTexto || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (diaLimpio.includes('SEMANAL:')) diaLimpio = diaLimpio.split('SEMANAL:')[1].trim();

  const targetDay = diasNombres.indexOf(diaLimpio);
  if (targetDay === -1) return null;

  const cursor = new Date(inicioJueves);
  for (let i = 0; i < 7; i++) {
    if (cursor.getDay() === targetDay) {
      return new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

export function esDiaDePagoHoy(c: Cliente): 'HOY' | { estado: 'PENDIENTE'; diasVencidos: number } | false {
  const datos = mapearDatosCliente(c);
  if (!datos) return false;

  const { hoyNorm } = obtenerRangoSemanaOperativa();
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  const hoyStr = new Date(Date.now() - tzOffset).toISOString().split('T')[0];

  if (c._pausadoHasta && c._pausadoHasta > hoyStr) {
    return false;
  }

  const period = (datos.periodicidad || '').toUpperCase();
  const dPago = (datos.diaPago || '').toUpperCase();
  const diaActual = hoyNorm.getDate();
  const mesActual = hoyNorm.getMonth();
  const anioActual = hoyNorm.getFullYear();
  const sa = parseInt(String(datos.sa), 10) || 0;

  if (period.includes('SEMANAL')) {
    const fechaAsignadaEstaSemana = obtenerFechaCobroSemanaActual(dPago);
    if (fechaAsignadaEstaSemana) {
      if (datos.fechaPago) {
        const pP = datos.fechaPago.trim().replace(/-/g, '/').split('/');
        if (pP.length === 3) {
          const fPagoNorm = new Date(parseInt(pP[0], 10), parseInt(pP[1], 10) - 1, parseInt(pP[2], 10));
          if (fPagoNorm.getTime() >= fechaAsignadaEstaSemana.getTime()) return false;
        }
      }
      if (hoyNorm.getTime() < fechaAsignadaEstaSemana.getTime()) {
        if (sa >= 7) return { estado: 'PENDIENTE', diasVencidos: sa };
        return false;
      }
      return 'HOY';
    }
  }

  if (period.includes('QUINCENAL')) {
    const matchQ = dPago.match(/\[\s*(\d+)\s*Y\s*(\d+)\s*\]/i);
    let q1 = 15;
    let q2 = 30;
    if (matchQ) {
      q1 = parseInt(matchQ[1], 10);
      q2 = parseInt(matchQ[2], 10);
    }

    const ultimoDiaMes = new Date(anioActual, mesActual + 1, 0).getDate();
    if (q2 > ultimoDiaMes) q2 = ultimoDiaMes;

    const diaCobroVigente = diaActual <= 15 ? q1 : q2;

    if (diaActual === q1 || diaActual === q2 || (diaActual >= q2 && diaActual >= ultimoDiaMes)) {
      return 'HOY';
    }

    if (sa >= 14 || diaActual > diaCobroVigente) {
      return { estado: 'PENDIENTE', diasVencidos: sa > 0 ? sa : diaActual - diaCobroVigente };
    }

    return false;
  }

  if (period.includes('MENSUAL')) {
    const matchM = dPago.match(/\[(\d+)\]/);
    const diaCobroOriginal = matchM ? parseInt(matchM[1], 10) : 1;
    const ultimoDiaDelMesActual = new Date(anioActual, mesActual + 1, 0).getDate();
    let diaCobroMensual = diaCobroOriginal;
    if (diaCobroOriginal >= ultimoDiaDelMesActual) {
      diaCobroMensual = ultimoDiaDelMesActual;
    }

    let yaPagoEsteMes = false;
    if (datos.fechaPago) {
      const pP = datos.fechaPago.trim().replace(/-/g, '/').split('/');
      if (pP.length === 3) {
        const fPagoNorm = new Date(parseInt(pP[0], 10), parseInt(pP[1], 10) - 1, parseInt(pP[2], 10));
        if (fPagoNorm.getFullYear() === anioActual && fPagoNorm.getMonth() === mesActual) {
          yaPagoEsteMes = true;
        }
      }
    }

    if (yaPagoEsteMes) return false;

    if (diaActual === diaCobroMensual || (diaCobroOriginal >= 30 && diaActual >= ultimoDiaDelMesActual)) {
      return 'HOY';
    }

    if (diaActual > diaCobroMensual) {
      const diasAtraso = diaActual - diaCobroMensual;
      return { estado: 'PENDIENTE', diasVencidos: sa > 0 ? sa : diasAtraso };
    }

    if (sa >= 30) {
      return { estado: 'PENDIENTE', diasVencidos: sa };
    }

    return false;
  }

  if (sa >= 7) {
    return { estado: 'PENDIENTE', diasVencidos: sa };
  }

  return false;
}

export function calcularProximoPagoDinamico(
  periodicidad: string,
  diaDePagoTexto: string,
  fechaCicloOriginal: string
): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const dia = hoy.getDate();

  if (!periodicidad || !diaDePagoTexto) return fechaCicloOriginal;

  try {
    if (periodicidad.toLowerCase().includes('mensual')) {
      const match = diaDePagoTexto.match(/\[(\d+)\]/);
      if (match) {
        const diaCobro = parseInt(match[1], 10);
        let mesDestino = mes;
        if (dia >= diaCobro) mesDestino += 1;
        const fechaCalc = new Date(anio, mesDestino, diaCobro);
        return new Date(fechaCalc.getTime() - fechaCalc.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      }
    } else if (periodicidad.toLowerCase().includes('quincenal')) {
      const match = diaDePagoTexto.match(/\[\s*(\d+)\s*Y\s*(\d+)\s*\]/i);
      if (match) {
        const q1 = parseInt(match[1], 10);
        const q2 = parseInt(match[2], 10);
        const diasQuincena = [q1, q2].sort((a, b) => a - b);
        let diaDestino: number;
        let mesDestino = mes;
        if (dia < diasQuincena[0]) {
          diaDestino = diasQuincena[0];
        } else if (dia < diasQuincena[1]) {
          diaDestino = diasQuincena[1];
        } else {
          diaDestino = diasQuincena[0];
          mesDestino += 1;
        }
        const fechaCalc = new Date(anio, mesDestino, diaDestino);
        return new Date(fechaCalc.getTime() - fechaCalc.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      }
    } else if (periodicidad.toLowerCase().includes('semanal')) {
      const diasSemana: Record<string, number> = {
        DOMINGO: 0,
        LUNES: 1,
        MARTES: 2,
        MIERCOLES: 3,
        JUEVES: 4,
        VIERNES: 5,
        SABADO: 6,
      };

      let diaTexto = diaDePagoTexto.includes(':') ? diaDePagoTexto.split(':')[1] : diaDePagoTexto;
      if (diaTexto) diaTexto = diaTexto.trim().toUpperCase();

      if (diaTexto && diasSemana[diaTexto] !== undefined) {
        const diaObjetivo = diasSemana[diaTexto];
        const diaActual = hoy.getDay();
        let diasFaltantes = (diaObjetivo + 7 - diaActual) % 7;
        if (diasFaltantes === 0) diasFaltantes = 7;
        const fechaCalc = new Date(anio, mes, dia + diasFaltantes);
        return new Date(fechaCalc.getTime() - fechaCalc.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      }
    }
  } catch (e) {
    console.error('Error calculando fecha dinamica:', e);
  }

  return fechaCicloOriginal;
}

export function leTocaCobroEnSemanaActual(c: Cliente): boolean {
  const datos = mapearDatosCliente(c);
  if (!datos) return false;

  const { inicioJueves, finMiercoles } = obtenerRangoSemanaOperativa();
  const period = (datos.periodicidad || '').toUpperCase();
  const dPago = (datos.diaPago || '').toUpperCase();
  const numeros = (dPago.match(/\d+/g) || []).map(n => parseInt(n, 10));
  const sa = parseInt(String(datos.sa), 10) || 0;

  if (period.includes('SEMANAL')) {
    return true;
  }

  if (period.includes('QUINCENAL')) {
    if (sa >= 14) return true;
    let q1 = 15;
    let q2 = 30;
    if (numeros.length >= 2) {
      q1 = numeros[0];
      q2 = numeros[1];
    } else if (numeros.length === 1) {
      q1 = numeros[0];
      q2 = q1 + 15 > 30 ? 30 : q1 + 15;
    }

    const cursor = new Date(inicioJueves);
    while (cursor <= finMiercoles) {
      const diaCursor = cursor.getDate();
      const ultimoDiaMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      const q2Ajustado = q2 > ultimoDiaMes ? ultimoDiaMes : q2;
      if (diaCursor === q1 || diaCursor === q2Ajustado) return true;
      cursor.setDate(cursor.getDate() + 1);
    }
    return false;
  }

  if (period.includes('MENSUAL')) {
    if (sa >= 30) return true;
    const diaCobroOriginal = numeros.length > 0 ? numeros[0] : 1;
    const cursor = new Date(inicioJueves);
    while (cursor <= finMiercoles) {
      const diaCursor = cursor.getDate();
      const ultimoDiaMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      const diaCobroAjustado = diaCobroOriginal > ultimoDiaMes ? ultimoDiaMes : diaCobroOriginal;
      if (diaCursor === diaCobroAjustado) return true;
      cursor.setDate(cursor.getDate() + 1);
    }
    return false;
  }

  return sa >= 7;
}

export function obtenerColorPeriodicidad(pStr: string): string {
  if (!pStr) return '#3b82f6';
  const p = String(pStr).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (p.includes('semanal')) return '#0f172a'; // Oscuro/Negro
  if (p.includes('quincenal')) return '#3b82f6'; // Azul
  if (p.includes('mensual')) return '#94a3b8'; // Plateado
  return '#3b82f6';
}

export function obtenerColorSemaforoSA(sa: number, periodicidad: string): { color: string; label: string; key: 'verde' | 'amarillo' | 'naranja' | 'rojo' } {
  const pLower = (periodicidad || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (pLower.includes('semanal')) {
    if (sa < 8) return { color: '#10b981', label: 'Al Día (<8d)', key: 'verde' };
    if (sa <= 60) return { color: '#f59e0b', label: '8-60 días', key: 'amarillo' };
    if (sa <= 180) return { color: '#f97316', label: '61-180 días', key: 'naranja' };
    return { color: '#ef4444', label: 'Crítico (+180d)', key: 'rojo' };
  }
  if (pLower.includes('quincenal')) {
    if (sa < 16) return { color: '#10b981', label: 'Al Día (<16d)', key: 'verde' };
    if (sa <= 60) return { color: '#f59e0b', label: '16-60 días', key: 'amarillo' };
    if (sa <= 180) return { color: '#f97316', label: '61-180 días', key: 'naranja' };
    return { color: '#ef4444', label: 'Crítico (+180d)', key: 'rojo' };
  }
  // Mensual u otro
  if (sa < 31) return { color: '#10b981', label: 'Al Día (<31d)', key: 'verde' };
  if (sa <= 60) return { color: '#f59e0b', label: '31-60 días', key: 'amarillo' };
  if (sa <= 180) return { color: '#f97316', label: '61-180 días', key: 'naranja' };
  return { color: '#ef4444', label: 'Crítico (+180d)', key: 'rojo' };
}

export function obtenerLinkWADinamico(c: Cliente): string {
  const datos = mapearDatosCliente(c);
  if (!datos) return '';
  const nombre = datos.nombre || 'CLIENTE';
  const sa = datos.sa || 0;
  const diaPago = datos.diaPago || 'acordado';
  const periodicidad = datos.periodicidad.toUpperCase();
  const rawTel = datos.telSolo || datos.tel || '';
  const numero10Digitos = rawTel.replace(/\D/g, '').slice(-10);

  let limiteDias = 7;
  if (periodicidad.includes('QUINCENAL')) limiteDias = 15;
  else if (periodicidad.includes('MENSUAL')) limiteDias = 31;

  let mensaje = '';
  if (sa > 90) {
    mensaje = `🚨 *AVISO DE ÚLTIMA HORA* 🚨\n\nEstimado/a *${nombre}*, le saluda Rodrigo Valencia de PABS.\n\nSu plan previsor presenta un atraso crítico de *${sa} días* sin aportación, superando el plazo contractual permitido. Su expediente está programado para revisión de suspensión.\n\nPara evitar la cancelación definitiva de sus beneficios y costos por penalización, es indispensable que nos responda hoy mismo para acordar una solución.\n\nQuedamos a la espera de su respuesta inmediata.`;
  } else if (sa > limiteDias) {
    mensaje = `Hola *${nombre}*, le saludamos del área de cobranza de PABS. ⚠️ Notamos que su cuenta registra un atraso de *${sa} días* en sus aportaciones.\n\nLe recordamos que su fecha límite de pago es el *${diaPago}*. Mantener su plan al corriente le garantiza conservar todos sus beneficios sin contratiempos.\n\n¿Podríamos confirmar su pago para el día de hoy? Quedamos atentos para apoyarle.`;
  } else {
    mensaje = `Hola *${nombre}*, le saludamos con mucho gusto de PABS. 👋 Le recordamos que su fecha programada para su aportación es el *${diaPago}*.\n\nAgradecemos de antemano su puntualidad para mantener su plan previsor al día. ¡Que tenga un excelente día! Quedamos a sus órdenes.`;
  }

  return `https://wa.me/521${numero10Digitos}?text=${encodeURIComponent(mensaje)}`;
}

export function obtenerLinkWA_PagoHoy(c: Cliente): string {
  const datos = mapearDatosCliente(c);
  if (!datos) return '';
  const hoy = new Date();
  const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const diaHoy = dias[hoy.getDay()];
  const msg =
    datos.diaPago === diaHoy
      ? `Hola ${datos.nombre}, le contacto de PABS para recordarle que *hoy es su día de pago (${datos.diaPago})*. Quedamos a sus órdenes para recibir su aportación. ¡Saludos!`
      : `Hola ${datos.nombre}, le contacto de PABS para recordarle que su día establecido de pago fue el *${datos.diaPago}*. Quedamos a sus órdenes para registrar su aportación pendiente a la brevedad. ¡Saludos!`;
  return `https://wa.me/521${datos.telSolo}?text=${encodeURIComponent(msg)}`;
}

export function obtenerLinkNoEsta(c: Cliente): string {
  const datos = mapearDatosCliente(c);
  if (!datos) return '';
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const msg = `Hola *${datos.nombre}*, le saluda Rodrigo Valencia de PABS. Pasé a visitarle hoy a las *${hora}* para dar seguimiento a su plan pero lamentablemente no le encontré. 🏠\n\n¿Me regala una llamada o un mensaje cuando vea esto para coordinar su aportación y mantener su cuenta al corriente? Quedo a sus órdenes. ¡Saludos!`;
  return `https://wa.me/521${datos.telSolo}?text=${encodeURIComponent(msg)}`;
}

export function formatearFechaConDia(fechaStr: string | undefined): string {
  const fechaObj = parsearFechaFlexible(fechaStr);
  if (!fechaObj) {
    return fechaStr && String(fechaStr).trim() ? String(fechaStr).trim() : 'No registrada';
  }
  const nombreDia = fechaObj.toLocaleDateString('es-MX', { weekday: 'long' });
  const anio = fechaObj.getFullYear();
  const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
  const dia = String(fechaObj.getDate()).padStart(2, '0');
  return `${nombreDia} ${anio}/${mes}/${dia}`;
}

export function enviarBalizaServidor(url: string) {
  // Anti-CORS Image beacon technique
  try {
    const img = new Image();
    img.src = url;
  } catch (e) {
    console.error('Error enviando baliza:', e);
  }
}

// Initial realistic PABS route data so the application looks and feels complete on first run
export const SEED_DATA_RUTA_A: Cliente[] = [
  {
    ID: '88301',
    CONTRATO: '88301',
    Nombre: 'MARIA GUADALUPE VALENZUELA',
    DOMICILIO: 'AV. SOLIDARIDAD #142',
    COLONIA: 'PALO VERDE',
    TELEFONO: '6621894032',
    PERIODICIDAD: 'SEMANAL',
    'DIA DE PAGO': 'LUNES',
    'DIAS SIN ABONAR': 2,
    SALDO: '1850.00',
    'MONTO APORTE': 150,
    LATITUD: 29.0435,
    LONGITUD: -110.9632,
    'ULTIMA VISITA': '2026/10/24',
    'ULTIMA APORTACION': '2026/10/24',
    'ULTIMO MOTIVO': 'COBRADA',
    'ULTIMO COMENTARIO': 'Abonó puntual',
    'APP INSTALADA': '1',
  },
  {
    ID: '88302',
    CONTRATO: '88302',
    Nombre: 'JOSE LUIS CORONADO',
    DOMICILIO: 'CALLE 12 Y REFORMA #405',
    COLONIA: 'SAN BENITO',
    TELEFONO: '6622457811',
    PERIODICIDAD: 'SEMANAL',
    'DIA DE PAGO': 'LUNES',
    'DIAS SIN ABONAR': 14,
    SALDO: '3200.00',
    'MONTO APORTE': 200,
    LATITUD: 29.0912,
    LONGITUD: -110.9578,
    'ULTIMA VISITA': '2026/10/18',
    'ULTIMA APORTACION': '2026/10/10',
    'ULTIMO MOTIVO': 'NO ESTA',
    'ULTIMO COMENTARIO': 'Trabaja por las tardes',
    'APP INSTALADA': '0',
  },
  {
    ID: '88303',
    CONTRATO: '88303',
    Nombre: 'CARMEN ROSA MORENO',
    DOMICILIO: 'BLVD. LUZ VALENCIA #88',
    COLONIA: 'NUEVO HERMOSILLO',
    TELEFONO: '6623109482',
    PERIODICIDAD: 'QUINCENAL',
    'DIA DE PAGO': '[15 Y 30]',
    'DIAS SIN ABONAR': 35,
    SALDO: '4100.00',
    'MONTO APORTE': 300,
    LATITUD: 29.0121,
    LONGITUD: -110.9419,
    'ULTIMA VISITA': '2026/10/12',
    'ULTIMA APORTACION': '2026/09/25',
    'ULTIMO MOTIVO': 'PROBLEMAS',
    'ULTIMO COMENTARIO': 'Pide prórroga fin de mes',
    'APP INSTALADA': '1',
  },
  {
    ID: '88304',
    CONTRATO: '88304',
    Nombre: 'FRANCISCO JAVIER OCHOA',
    DOMICILIO: 'CALLE ZACATECAS #21',
    COLONIA: 'CENTRO',
    TELEFONO: '6621990432',
    PERIODICIDAD: 'MENSUAL',
    'DIA DE PAGO': '[1]',
    'DIAS SIN ABONAR': 95,
    SALDO: '6800.00',
    'MONTO APORTE': 500,
    LATITUD: 29.0745,
    LONGITUD: -110.9543,
    'ULTIMA VISITA': '2026/09/28',
    'ULTIMA APORTACION': '2026/07/20',
    'ULTIMO MOTIVO': 'POSIBLE CANCELACION',
    'ULTIMO COMENTARIO': 'Atraso crítico sin respuesta',
    'APP INSTALADA': '0',
  },
  {
    ID: '88305',
    CONTRATO: '88305',
    Nombre: 'LORENA PATRICIA ARVIZU',
    DOMICILIO: 'AV. OLIVARES #512',
    COLONIA: 'VALLE HERMOSO',
    TELEFONO: '6622839100',
    PERIODICIDAD: 'SEMANAL',
    'DIA DE PAGO': 'MARTES',
    'DIAS SIN ABONAR': 1,
    SALDO: '1200.00',
    'MONTO APORTE': 150,
    LATITUD: 29.0889,
    LONGITUD: -110.9821,
    'ULTIMA VISITA': '2026/10/25',
    'ULTIMA APORTACION': '2026/10/25',
    'ULTIMO MOTIVO': 'COBRADA',
    'ULTIMO COMENTARIO': 'Al corriente',
    'APP INSTALADA': '1',
  },
];

export const SEED_DATA_RUTA_B: Cliente[] = [
  ...SEED_DATA_RUTA_A,
  {
    ID: '88306',
    CONTRATO: '88306',
    Nombre: 'HECTOR MANUEL DUARTE',
    DOMICILIO: 'CALLE GARCIA MORALES #1002',
    COLONIA: 'LA MANGA',
    TELEFONO: '6621092834',
    PERIODICIDAD: 'SEMANAL',
    'DIA DE PAGO': 'MIERCOLES',
    'DIAS SIN ABONAR': 22,
    SALDO: '2400.00',
    'MONTO APORTE': 200,
    LATITUD: 29.0987,
    LONGITUD: -111.0045,
    'ULTIMA VISITA': '2026/10/15',
    'ULTIMA APORTACION': '2026/10/05',
    'ULTIMO MOTIVO': 'PENDIENTE',
    'ULTIMO COMENTARIO': 'Reagendó para mañana',
    'APP INSTALADA': '0',
  },
  {
    ID: '88307',
    CONTRATO: '88307',
    Nombre: 'ANA BEATRIZ FIGUEROA',
    DOMICILIO: 'CALLE MORELOS #780',
    COLONIA: 'LOMAS DE MADRID',
    TELEFONO: '6624912044',
    PERIODICIDAD: 'QUINCENAL',
    'DIA DE PAGO': '[15 Y 30]',
    'DIAS SIN ABONAR': 5,
    SALDO: '3100.00',
    'MONTO APORTE': 250,
    LATITUD: 29.1154,
    LONGITUD: -110.9631,
    'ULTIMA VISITA': '2026/10/28',
    'ULTIMA APORTACION': '2026/10/28',
    'ULTIMO MOTIVO': 'COBRADA',
    'ULTIMO COMENTARIO': 'Pago quincena adelantado',
    'APP INSTALADA': '1',
  },
  {
    ID: '88308',
    CONTRATO: '88308',
    Nombre: 'GABRIEL ENRIQUE FELIX',
    DOMICILIO: 'BLVD. KINO #312',
    COLONIA: 'PITIC',
    TELEFONO: '6623881290',
    PERIODICIDAD: 'MENSUAL',
    'DIA DE PAGO': '[10]',
    'DIAS SIN ABONAR': 190,
    SALDO: '7500.00',
    'MONTO APORTE': 500,
    LATITUD: 29.0945,
    LONGITUD: -110.9321,
    'ULTIMA VISITA': '2026/08/14',
    'ULTIMA APORTACION': '2026/04/10',
    'ULTIMO MOTIVO': 'DOMICILIO NO EXISTE',
    'ULTIMO COMENTARIO': 'Se mudó de casa',
    'APP INSTALADA': '0',
  },
];
