/* ==========================================================================
   WEIGHTCONTROL · TIPOS DE DATOS Y CONTRATOS DE METROLOGÍA LEGAL (SICM-COL)
   ========================================================================== */

export type MetrologyStatus =
  | 'VIGENTE (APTO)'
  | 'POR VENCER (<30 DÍAS)'
  | 'VENCIDO / NO APTO'
  | 'PENDIENTE REVISIÓN'
  | 'RECHAZADA / OBSERVADA'
  | 'CRÍTICA (MEDIDA INMEDIATA)'
  | 'SUSPENDIDA (CONTROL CAUTELAR)';

export interface MetrologicalInstrument {
  id: string;
  serial: string;               // BAL-2025-99201-BOG
  placaRump: string;            // RUMP-CO-841920
  establecimiento: string;      // Almacenes Éxito S.A.
  nit: string;                  // 890.900.608-9
  departamento: string;         // Cundinamarca
  municipio: string;            // Bogotá D.C.
  tipoInstrumento: string;      // IPFNA Clase III Báscula Comercial
  marca: string;                // Torrey / Toledo / Gilbarco
  modelo: string;               // L-EQ-10/20
  capacidadMax: string;         // 30 kg
  divisionEscala: string;       // e = 5 g, d = 5 g
  irregularidad: string;        // Desviación EMP > 1.5e en carga máxima
  deteccionSistema: string;     // Sensor Forense NODO-BOG-01
  timestampDeteccion: string;   // 14/05/2025 09:15 UTC-5
  estado: MetrologyStatus;
  precintoSIMEL: string;        // STAMP-CO-9982415
  oecAcreditado: string;        // ONAC-18-LAB-042
  hsmKey: string;               // HSM-KEY #9842
  versionFirmware: string;      // 4.12.8-STABLE
  accionRecomendada: string;    // Auto de Sellamiento Inmediato
  latitud: number;
  longitud: number;
}

export interface KpiIndicator {
  id: string;
  microlabel: string;
  valor: string;
  pillText: string;
  pillType: 'navy' | 'ok' | 'warn' | 'danger' | 'info';
  borderColor: 'navy' | 'ok' | 'warn' | 'danger';
  lineaTecnica1: string;
  lineaTecnica2: string;
}

export interface FilterCriteria {
  busquedaGeneral: string;
  tipoIrregularidad: string;
  estadoLegal: string;
  oecAcreditado: string;
  jurisdiccion: string;
}

export type ActiveScreen =
  | 'auditoria'
  | 'registro'
  | 'instrumentos'
  | 'validaciones'
  | 'administracion'
  | 'login';

// Exportaciones en tiempo de ejecución para garantizar compatibilidad con bundlers ESM (Vite / Rollup)
export const MetrologicalInstrument = {};
export const KpiIndicator = {};
export const FilterCriteria = {};
