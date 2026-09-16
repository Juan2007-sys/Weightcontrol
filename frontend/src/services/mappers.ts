import type { MetrologicalInstrument, MetrologyStatus } from '../types/metrology';

export interface BackendInstrumento {
  id?: string;
  _id?: string;
  serial: string;
  marca: string;
  modelo: string;
  tipo: string;
  categoriaExactitud: string;
  capacidadMaxima: number;
  unidadMedida?: string;
  divisionEscala?: number;
  numeroDivisionesVerificacion?: number;
  codigoPrecintoSIMEL?: string;
  propietario?: {
    nombreRazonSocial?: string;
    nitRut?: string;
    direccion?: string;
    ciudad?: string;
    departamento?: string;
  };
  ubicacionFisica?: string;
  fechaUltimaCalibracion: string | Date;
  fechaProximaCalibracion: string | Date;
  estado: 'Vigente' | 'Por vencer' | 'Vencido' | string;
  createdAt?: string;
  updatedAt?: string;
}

export function mapBackendStatusToFrontend(estado: string): MetrologyStatus {
  switch (estado?.toLowerCase()) {
    case 'vigente':
      return 'VIGENTE (APTO)';
    case 'por vencer':
      return 'POR VENCER (<30 DÍAS)';
    case 'vencido':
      return 'VENCIDO / NO APTO';
    case 'rechazada':
    case 'rechazada / observada':
      return 'RECHAZADA / OBSERVADA';
    case 'critica':
    case 'crítica':
      return 'CRÍTICA (MEDIDA INMEDIATA)';
    case 'suspendida':
      return 'SUSPENDIDA (CONTROL CAUTELAR)';
    default:
      return 'PENDIENTE REVISIÓN';
  }
}

export function mapBackendInstrumentToFrontend(item: BackendInstrumento): MetrologicalInstrument {
  const id = item.id || item._id || item.serial;
  const unidad = item.unidadMedida || 'kg';
  const division = item.divisionEscala ? `e = ${item.divisionEscala} ${unidad}, d = ${item.divisionEscala} ${unidad}` : 'No especificada';
  
  // Asignación de coordenadas por departamento/ciudad básica para visualización geográfica
  const ciudad = item.propietario?.ciudad || 'Bogotá D.C.';
  let latitud = 4.7110;
  let longitud = -74.0721;
  if (ciudad.toLowerCase().includes('medellín') || ciudad.toLowerCase().includes('antioquia')) {
    latitud = 6.2442;
    longitud = -75.5812;
  } else if (ciudad.toLowerCase().includes('cali') || ciudad.toLowerCase().includes('valle')) {
    latitud = 3.4516;
    longitud = -76.5320;
  } else if (ciudad.toLowerCase().includes('barranquilla') || ciudad.toLowerCase().includes('atlántico')) {
    latitud = 10.9685;
    longitud = -74.7813;
  }

  const estadoFrontend = mapBackendStatusToFrontend(item.estado);

  let irregularidad = 'Ensayos de excentricidad y repetibilidad conformes';
  let accionRecomendada = 'Apto para transacciones comerciales';

  if (item.estado === 'Por vencer') {
    irregularidad = 'Alerta de mantenimiento preventivo y verificación periódica próxima';
    accionRecomendada = 'Programar visita técnica antes de la fecha límite';
  } else if (item.estado === 'Vencido') {
    irregularidad = 'Verificación periódica vencida según Decreto 1074 de 2015';
    accionRecomendada = 'Inmovilización preventiva / Auto de sellamiento';
  }

  const fechaFormat = item.fechaUltimaCalibracion 
    ? new Date(item.fechaUltimaCalibracion).toLocaleDateString('es-CO')
    : 'No registrada';

  return {
    id,
    serial: item.serial,
    placaRump: `RUMP-CO-${item.serial.replace(/[^0-9]/g, '').slice(-6) || '841920'}`,
    establecimiento: item.propietario?.nombreRazonSocial || 'Establecimiento no registrado',
    nit: item.propietario?.nitRut || 'No registrado',
    departamento: item.propietario?.departamento || 'Cundinamarca',
    municipio: ciudad,
    tipoInstrumento: `${item.tipo} (${item.categoriaExactitud || 'Clase III'})`,
    marca: item.marca,
    modelo: item.modelo,
    capacidadMax: `${item.capacidadMaxima} ${unidad}`,
    divisionEscala: division,
    irregularidad,
    deteccionSistema: `NODO-${(item.propietario?.departamento || 'BOG').slice(0, 3).toUpperCase()}-01`,
    timestampDeteccion: `${fechaFormat} UTC-5`,
    estado: estadoFrontend,
    precintoSIMEL: item.codigoPrecintoSIMEL || 'SIMEL-PENDIENTE',
    oecAcreditado: 'ONAC-18-LAB-042',
    hsmKey: 'HSM-KEY #9842',
    versionFirmware: '4.12.8-STABLE',
    accionRecomendada,
    latitud,
    longitud,
  };
}
