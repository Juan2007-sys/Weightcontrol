import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { BasculaValidator } from './bascula.validator.js';
import { TipoInstrumento, CategoriaExactitud } from '../../../schemas/instrumento.schema.js';

describe('BasculaValidator · Property-Based Testing (fast-check / NTC 2031)', () => {
  const validator = new BasculaValidator();

  const validPhotos = {
    fotoEquipo: 'https://cdn.example.com/foto-equipo.jpg',
    fotoPrecinto: 'https://cdn.example.com/foto-precinto.jpg',
    fotoUbicacion: 'https://cdn.example.com/foto-ubicacion.jpg',
  };

  const baseDates = {
    fechaUltimaCalibracion: '2025-01-01T00:00:00.000Z',
    fechaProximaCalibracion: '2026-01-01T00:00:00.000Z',
  };

  it('Propiedad 1: Para cualquier combinación de Min >= Max, SIEMPRE debe rechazar por inconsistencia de capacidades', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(100000), noNaN: true }),
        fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }),
        (valA, valB) => {
          const max = Math.min(valA, valB);
          const min = Math.max(valA, valB); // garantizamos min >= max

          const result = validator.validate({
            tipo: TipoInstrumento.BASCULA,
            categoriaExactitud: CategoriaExactitud.CLASE_III,
            capacidadMaxima: max,
            capacidadMinima: min,
            divisionEscala: max / 1000,
            evidenciasFotograficas: validPhotos,
            ...baseDates,
          });

          expect(result.isValid).toBe(false);
          expect(result.errors.some((err) => err.includes('Inconsistencia de capacidades'))).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('Propiedad 2: Para Clase III, cualquier n dentro de [500, 10.000] con Min < Max y fotos válidas SIEMPRE es metrológicamente Conforme', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 10000 }), // n dentro de norma Clase III
        fc.float({ min: Math.fround(5), max: Math.fround(100000), noNaN: true }), // Max kg
        (n, maxKg) => {
          const divisionEscala = maxKg / n;
          const minKg = maxKg * 0.01; // Min siempre < Max

          const result = validator.validate({
            tipo: TipoInstrumento.BASCULA,
            categoriaExactitud: CategoriaExactitud.CLASE_III,
            capacidadMaxima: maxKg,
            capacidadMinima: minKg,
            divisionEscala: divisionEscala,
            evidenciasFotograficas: validPhotos,
            ...baseDates,
          });

          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('Propiedad 3: Para Clase I, si n < 50.000 SIEMPRE debe rechazar por número insuficiente de divisiones', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 49999 }), // n < 50.000
        fc.float({ min: Math.fround(1), max: Math.fround(500), noNaN: true }),
        (n, maxKg) => {
          const divisionEscala = maxKg / n;
          const minKg = maxKg * 0.001;

          const result = validator.validate({
            tipo: TipoInstrumento.BASCULA,
            categoriaExactitud: CategoriaExactitud.CLASE_I,
            capacidadMaxima: maxKg,
            capacidadMinima: minKg,
            divisionEscala: divisionEscala,
            evidenciasFotograficas: validPhotos,
            ...baseDates,
          });

          expect(result.isValid).toBe(false);
          expect(result.errors.some((err) => err.includes('Clase I (Especial)'))).toBe(true);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('Propiedad 4: Para Clase IIII, si n > 1.000 SIEMPRE debe rechazar por exceder el límite superior', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1001, max: 50000 }), // n > 1.000
        fc.float({ min: Math.fround(10), max: Math.fround(50000), noNaN: true }),
        (n, maxKg) => {
          const divisionEscala = maxKg / n;
          const minKg = maxKg * 0.05;

          const result = validator.validate({
            tipo: TipoInstrumento.BASCULA,
            categoriaExactitud: CategoriaExactitud.CLASE_IIII,
            capacidadMaxima: maxKg,
            capacidadMinima: minKg,
            divisionEscala: divisionEscala,
            evidenciasFotograficas: validPhotos,
            ...baseDates,
          });

          expect(result.isValid).toBe(false);
          expect(result.errors.some((err) => err.includes('Clase IIII (Ordinaria)'))).toBe(true);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('Propiedad 5: Si cualquiera de las 3 fotos obligatorias está vacía o contiene solo espacios, SIEMPRE debe rechazar', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('fotoEquipo', 'fotoPrecinto', 'fotoUbicacion'),
        fc.constantFrom('', '   ', '\t', '\n'),
        (missingField, emptyVal) => {
          const invalidPhotos = { ...validPhotos, [missingField]: emptyVal };

          const result = validator.validate({
            tipo: TipoInstrumento.BASCULA,
            categoriaExactitud: CategoriaExactitud.CLASE_III,
            capacidadMaxima: 30,
            capacidadMinima: 0.1,
            divisionEscala: 30 / 6000,
            evidenciasFotograficas: invalidPhotos,
            ...baseDates,
          });

          expect(result.isValid).toBe(false);
          expect(result.errors.some((err) => err.toLowerCase().includes('fotográfica'))).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
