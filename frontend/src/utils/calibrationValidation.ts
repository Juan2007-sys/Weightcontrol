/**
 * Validación por campo del formulario de calibración (HU-04). Función pura, sin dependencias de UI.
 * Las claves de error son los ids de los controles del formulario, para enlazar mensaje, foco y aria.
 */
export interface CalibrationFormValues {
  instrumentoId: string;
  numeroCertificado: string;
  fechaCalibracion: string;
  fechaProximaCalibracion: string;
  resultado: string;
  patrones: { codigoPatron: string; certificadoTrazabilidad: string; fechaVencimientoPatron?: string }[];
  puntos: { cargaNominal: number; errorMaximoPermitido: number }[];
}

export type CalibrationFieldErrors = Record<string, string>;

/** Orden visual de los campos (para enfocar el primero con error). */
export const CALIBRATION_FIELD_ORDER = [
  'cal-inst-select',
  'cal-num-cert',
  'cal-date-cal',
  'cal-date-prox',
  'cal-res',
  'cal-patrones',
  'cal-puntos',
] as const;

export function validateCalibrationForm(v: CalibrationFormValues): CalibrationFieldErrors {
  const e: CalibrationFieldErrors = {};
  if (!v.instrumentoId) e['cal-inst-select'] = 'Seleccione el instrumento a calibrar.';
  if (!v.numeroCertificado.trim()) e['cal-num-cert'] = 'El número de certificado es obligatorio.';
  if (!v.fechaCalibracion) e['cal-date-cal'] = 'La fecha de calibración es obligatoria.';
  if (!v.fechaProximaCalibracion) {
    e['cal-date-prox'] = 'La fecha de próxima calibración es obligatoria.';
  } else if (v.fechaCalibracion && v.fechaProximaCalibracion <= v.fechaCalibracion) {
    e['cal-date-prox'] = 'La fecha de próxima calibración debe ser posterior a la fecha de calibración.';
  }
  if (!v.resultado) e['cal-res'] = 'Seleccione el dictamen metrológico.';

  if (v.patrones.length === 0) {
    e['cal-patrones'] = 'Debe declarar al menos 1 patrón trazable.';
  } else if (v.patrones.some((p) => !p.codigoPatron.trim() || !p.certificadoTrazabilidad.trim())) {
    e['cal-patrones'] = 'Cada patrón requiere código y certificado de trazabilidad.';
  } else if (v.patrones.some((p) => p.fechaVencimientoPatron !== undefined && !p.fechaVencimientoPatron)) {
    e['cal-patrones'] = 'Cada patrón requiere fecha de vencimiento.';
  }

  if (v.puntos.length === 0) {
    e['cal-puntos'] = 'Debe registrar al menos 1 punto de ensayo contra el EMP.';
  } else if (v.puntos.some((p) => !(p.errorMaximoPermitido > 0))) {
    e['cal-puntos'] = 'Cada punto de ensayo requiere un EMP límite mayor que cero.';
  }
  return e;
}

/** Mapea un error del servidor (ApiError.data) a un campo del formulario cuando es posible. */
export function mapServerErrorToFields(data: unknown, fallbackMessage = ''): CalibrationFieldErrors {
  const out: CalibrationFieldErrors = {};
  const raw = (data as { message?: unknown } | null | undefined)?.message;
  const messages: string[] = Array.isArray(raw) ? raw.map(String) : [String(raw ?? fallbackMessage)];
  const rules: [RegExp, string][] = [
    [/numeroCertificado|n[uú]mero de certificado|certificado '/i, 'cal-num-cert'],
    [/fechaProximaCalibracion|pr[oó]xima calibraci[oó]n/i, 'cal-date-prox'],
    [/fechaCalibracion|fecha de calibraci[oó]n/i, 'cal-date-cal'],
    [/instrumentoId|instrumento con id/i, 'cal-inst-select'],
    [/patronesUtilizados|patr[oó]n/i, 'cal-patrones'],
    [/erroresMaximosPermitidos|punto de medici[oó]n|punto de ensayo/i, 'cal-puntos'],
    [/resultado|dictamen/i, 'cal-res'],
  ];
  for (const m of messages) {
    const rule = rules.find(([re]) => re.test(m));
    if (rule && !out[rule[1]]) out[rule[1]] = m;
  }
  return out;
}
