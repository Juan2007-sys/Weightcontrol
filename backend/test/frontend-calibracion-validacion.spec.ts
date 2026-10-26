import { describe, it, expect } from 'vitest';
import {
  validateCalibrationForm,
  mapServerErrorToFields,
// @ts-ignore: util pura del frontend, fuera del rootDir del backend
} from '../../frontend/src/utils/calibrationValidation.js';

const ok = {
  instrumentoId: 'i1',
  numeroCertificado: 'C-1',
  fechaCalibracion: '2026-01-01',
  fechaProximaCalibracion: '2027-01-01',
  resultado: 'Conforme',
  patrones: [{ codigoPatron: 'P', certificadoTrazabilidad: 'T', fechaVencimientoPatron: '2028-01-01' }],
  puntos: [{ cargaNominal: 5, errorMaximoPermitido: 0.005 }],
};

describe('HU-04 validación por campo del formulario de calibración (frontend)', () => {
  it('un formulario completo no tiene errores (patrón y punto llenos no disparan el aviso)', () => {
    expect(validateCalibrationForm(ok)).toEqual({});
  });
  it('señala cada campo faltante con su propio mensaje', () => {
    const e = validateCalibrationForm({ ...ok, numeroCertificado: ' ', fechaCalibracion: '', fechaProximaCalibracion: '' });
    expect(Object.keys(e).sort()).toEqual(['cal-date-cal', 'cal-date-prox', 'cal-num-cert']);
    expect(e['cal-num-cert']).toMatch(/certificado/i);
  });
  it('patrón o punto ausentes se reportan solo cuando realmente faltan', () => {
    expect(Object.keys(validateCalibrationForm({ ...ok, patrones: [] }))).toEqual(['cal-patrones']);
    expect(Object.keys(validateCalibrationForm({ ...ok, puntos: [] }))).toEqual(['cal-puntos']);
  });
  it('próxima fecha no posterior se marca', () => {
    expect(validateCalibrationForm({ ...ok, fechaProximaCalibracion: '2026-01-01' })['cal-date-prox']).toMatch(/posterior/);
  });
  it('mapea errores del servidor a campos', () => {
    const m = mapServerErrorToFields({
      message: ['numeroCertificado should not be empty', 'La fecha de próxima calibración debe ser estrictamente posterior a la fecha de calibración.'],
    });
    expect(Object.keys(m).sort()).toEqual(['cal-date-prox', 'cal-num-cert']);
    expect(Object.keys(mapServerErrorToFields({ message: "Ya existe una calibración registrada con el número de certificado 'X'." }))).toEqual(['cal-num-cert']);
    expect(Object.keys(mapServerErrorToFields({ message: 'Calibración incompleta: Debe declarar al menos 1 patrón de calibración trazable' }))).toEqual(['cal-patrones']);
  });
});
