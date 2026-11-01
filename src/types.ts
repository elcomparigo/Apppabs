export type RouteKey = 'A' | 'B' | 'C' | 'D' | 'EMISION';
export type DisplayRouteMode = RouteKey | 'VER_TODAS' | 'FILTRO_ACTIVO';

export interface Cliente {
  id?: string | number;
  ID?: string | number;
  idEnrutar?: string;
  idAfiliado?: string;
  contrato?: string;
  CONTRATO?: string;
  nombre?: string;
  'Nombre Cliente'?: string;
  Nombre?: string;
  CLIENTE?: string;
  dirFinal?: string;
  DIRECCION?: string;
  DOMICILIO?: string;
  COLONIA?: string;
  UBICACION?: string;
  tel?: string;
  telSolo?: string;
  TEL?: string;
  'Num. Telefonico'?: string;
  TELEFONO?: string;
  periodicidad?: string;
  PERIODICIDAD?: string;
  sa?: number;
  'DIAS SIN ABONAR'?: string | number;
  'DIAS SIN APORTAR'?: string | number;
  diaPago?: string;
  'Dia De Pago'?: string;
  'DIA DE PAGO'?: string;
  fechaVisita?: string;
  'ULTIMA VISITA'?: string;
  fechaPago?: string;
  'ULTIMA APORTACION'?: string;
  'FECHA DE PAGO'?: string;
  saldo?: string;
  SALDO?: string;
  'SALDO TOTAL'?: string;
  'MONTO APORTE'?: string | number;
  SISTEMA?: string;
  ultimoMotivo?: string;
  'ULTIMO MOTIVO'?: string;
  ultimoComentario?: string;
  'ULTIMO COMENTARIO'?: string;
  COMENTARIO?: string;
  OBSERVACIONES?: string;
  LAT?: string | number;
  LON?: string | number;
  LATITUD?: string | number;
  LONGITUD?: string | number;
  CORDS?: string;
  COORDINADAS?: string;
  _pausadoHasta?: string;
  _motivoPausa?: string;
  _fechaPausa?: string;
  _volverDia?: string;
  _volverFecha?: string;
  _visitasTotal?: number;
  _modoOriginal?: string;
  _tagMapaD?: string;
  'APP INSTALADA'?: string | boolean;
  'URL INCI'?: string;
  'URL INCI1'?: string;
  [key: string]: unknown;
}

export interface NormalizedCliente {
  idEnrutar: string;
  idAfiliado: string;
  contrato: string;
  nombre: string;
  dirFinal: string;
  colonia: string;
  sistema: string;
  tel: string;
  telSolo: string;
  periodicidad: string;
  sa: number;
  diaPago: string;
  fechaVisita: string;
  fechaPago: string;
  saldo: string;
  montoAporte: number;
  ultimoMotivo: string;
  ultimoComentario: string;
  lat?: number;
  lon?: number;
  origenD?: string;
  tieneApp: boolean;
  raw: Cliente;
}

export interface PaymentStatus {
  estado: 'HOY' | 'PENDIENTE' | 'AL_DIA' | false;
  diasVencidos?: number;
}

export interface QuickStats {
  Semanal: { total: number; dias: Record<string, number> };
  Quincenal: { total: number; dias: Record<string, number> };
  Mensual: { total: number; dias: Record<string, number> };
  Total: number;
}

export interface CuentaNuevaApi {
  id: number | string;
  nombre?: string;
  paterno?: string;
  materno?: string;
  domicilio_cobro?: string;
  numero_exterior_cobro?: string;
  colonia_cobro?: string;
  num_telefonico?: string;
  tipo_aportacion?: string;
  dia_preferido?: number;
  dia_preferido_mensual?: number;
  cantidad_aportacion?: string | number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
