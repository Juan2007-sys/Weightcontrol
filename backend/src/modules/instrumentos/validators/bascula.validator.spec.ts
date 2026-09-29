import { describe, it, expect, beforeEach } from 'vitest';
import { BasculaValidator } from './bascula.validator.js';
import { TipoInstrumento, CategoriaExactitud, UnidadMedida } from '../../../schemas/instrumento.schema.js';
import { InstrumentoValidationData } from './instrumento-validator.interface.js';

describe('BasculaValidator (NTC 2031 / OIML R 76-1)', () => {
  let validator: BasculaValidator;

  beforeEach(() => {
    validator = new BasculaValidator();
  });

  const baseValidData: InstrumentoValidationData = {
    serial: 'BAL-2026-TEST-001',
    marca: 'Torrey',
    modelo: 'L-EQ-10/20',
    tipo: TipoInstrumento.BASCULA,
    categoriaExactitud: CategoriaExactitud.CLASE_III,
    capacidadMaxima: 30,
    capacidadMinima: 0.1,
    unidadMedida: UnidadMedida.KG,
    divisionEscala: 0.005, // n = 30 / 0.005 = 6000 (Clase III: 500 <= n <= 10000)
    fechaUltimaCalibracion: new Date('2026-01-01'),
    fechaProximaCalibracion: new Date('2027-01-01'),
    evidenciasFotograficas: {
      fotoEquipo: 'https://cdn.example.com/foto-equipo.jpg',
      fotoPrecinto: 'https://cdn.example.com/foto-precinto.jpg',
      fotoUbicacion: 'https://cdn.example.com/foto-ubicacion.jpg',
    },
  };

  it('debe validar exitosamente una báscula comercial Clase III que cumpla todas las reglas', () => {
    const result = validator.validate(baseValidData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  describe('HU-02: Consistencia de Capacidades (Min vs Max)', () => {
    it('debe rechazar si capacidadMinima >= capacidadMaxima', () => {
      const data: InstrumentoValidationData = {
        ...baseValidData,
        capacidadMinima: 30,
        capacidadMaxima: 30,
      };
      const result = validator.validate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Inconsistencia de capacidades'))).toBe(true);
    });

    it('debe rechazar si capacidadMinima > capacidadMaxima', () => {
      const data: InstrumentoValidationData = {
        ...baseValidData,
        capacidadMinima: 35,
        capacidadMaxima: 30,
      };
      const result = validator.validate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Inconsistencia de capacidades'))).toBe(true);
    });

    it('debe rechazar si capacidadMinima es negativa', () => {
      const data: InstrumentoValidationData = {
        ...baseValidData,
        capacidadMinima: -0.5,
      };
      const result = validator.validate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('no puede ser un valor negativo'))).toBe(true);
    });

    it('debe rechazar si capacidadMaxima <= 0', () => {
      const data: InstrumentoValidationData = {
        ...baseValidData,
        capacidadMaxima: 0,
        divisionEscala: 0.001,
      };
      const result = validator.validate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('mayor a 0'))).toBe(true);
    });
  });

  describe('HU-02: Escalones Metrológicos n = Max / e por Clase de Exactitud', () => {
    // CLASE I: Especial (n >= 50.000)
    describe('Clase I (Especial: n >= 50.000)', () => {
      it('debe aceptar n = 50.000 (límite inferior)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_I,
          capacidadMaxima: 1, // 1 kg
          divisionEscala: 0.00002, // n = 50.000
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(true);
      });

      it('debe aceptar n = 100.000 (> 50.000)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_I,
          capacidadMaxima: 1,
          divisionEscala: 0.00001, // n = 100.000
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(true);
      });

      it('debe rechazar n = 49.999 (< 50.000)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_I,
          capacidadMaxima: 1,
          divisionEscala: 0.000021, // n ~ 47.619
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('Clase I') && e.includes('50.000'))).toBe(true);
      });
    });

    // CLASE II: Fina (100 <= n <= 100.000)
    describe('Clase II (Fina: 100 <= n <= 100.000)', () => {
      it('debe aceptar n = 100 (límite inferior)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_II,
          capacidadMaxima: 10,
          divisionEscala: 0.1, // n = 100
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(true);
      });

      it('debe aceptar n = 100.000 (límite superior)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_II,
          capacidadMaxima: 10,
          divisionEscala: 0.0001, // n = 100.000
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(true);
      });

      it('debe rechazar n = 99 (< 100)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_II,
          capacidadMaxima: 9.9,
          divisionEscala: 0.1, // n = 99
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('Clase II') && e.includes('inferior'))).toBe(true);
      });

      it('debe rechazar n = 100.001 (> 100.000)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_II,
          capacidadMaxima: 10.0001,
          divisionEscala: 0.0001, // n = 100.001
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('Clase II') && e.includes('excede'))).toBe(true);
      });
    });

    // CLASE III: Media (500 <= n <= 10.000)
    describe('Clase III (Media: 500 <= n <= 10.000)', () => {
      it('debe aceptar n = 500 (límite inferior)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_III,
          capacidadMaxima: 2.5,
          divisionEscala: 0.005, // n = 500
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(true);
      });

      it('debe aceptar n = 10.000 (límite superior)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_III,
          capacidadMaxima: 50,
          divisionEscala: 0.005, // n = 10.000
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(true);
      });

      it('debe rechazar n = 499 (< 500)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_III,
          capacidadMaxima: 2.495,
          divisionEscala: 0.005, // n = 499
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('Clase III') && e.includes('inferior'))).toBe(true);
      });

      it('debe rechazar n = 10.001 (> 10.000)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_III,
          capacidadMaxima: 50.005,
          divisionEscala: 0.005, // n = 10.001
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('Clase III') && e.includes('excede'))).toBe(true);
      });
    });

    // CLASE IIII: Ordinaria (100 <= n <= 1.000)
    describe('Clase IIII (Ordinaria: 100 <= n <= 1.000)', () => {
      it('debe aceptar n = 100 (límite inferior)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_IIII,
          capacidadMaxima: 100,
          divisionEscala: 1, // n = 100
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(true);
      });

      it('debe aceptar n = 1.000 (límite superior)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_IIII,
          capacidadMaxima: 1000,
          divisionEscala: 1, // n = 1.000
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(true);
      });

      it('debe rechazar n = 99 (< 100)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_IIII,
          capacidadMaxima: 99,
          divisionEscala: 1, // n = 99
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('Clase IIII') && e.includes('inferior'))).toBe(true);
      });

      it('debe rechazar n = 1.001 (> 1.000)', () => {
        const data: InstrumentoValidationData = {
          ...baseValidData,
          categoriaExactitud: CategoriaExactitud.CLASE_IIII,
          capacidadMaxima: 1001,
          divisionEscala: 1, // n = 1.001
        };
        const result = validator.validate(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('Clase IIII') && e.includes('excede'))).toBe(true);
      });
    });
  });

  describe('HU-01: Evidencias Fotográficas Obligatorias', () => {
    it('debe rechazar si falta la foto del equipo', () => {
      const data: InstrumentoValidationData = {
        ...baseValidData,
        evidenciasFotograficas: {
          fotoEquipo: '',
          fotoPrecinto: 'https://cdn.example.com/precinto.jpg',
          fotoUbicacion: 'https://cdn.example.com/ubicacion.jpg',
        },
      };
      const result = validator.validate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('foto') && e.includes('equipo'))).toBe(true);
    });

    it('debe rechazar si falta la foto del precinto', () => {
      const data: InstrumentoValidationData = {
        ...baseValidData,
        evidenciasFotograficas: {
          fotoEquipo: 'https://cdn.example.com/equipo.jpg',
          fotoPrecinto: '  ',
          fotoUbicacion: 'https://cdn.example.com/ubicacion.jpg',
        },
      };
      const result = validator.validate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('foto') && e.includes('precinto'))).toBe(true);
    });

    it('debe rechazar si falta la foto de la ubicación física', () => {
      const data: InstrumentoValidationData = {
        ...baseValidData,
        evidenciasFotograficas: {
          fotoEquipo: 'https://cdn.example.com/equipo.jpg',
          fotoPrecinto: 'https://cdn.example.com/precinto.jpg',
          fotoUbicacion: '',
        },
      };
      const result = validator.validate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('foto') && e.includes('ubicación'))).toBe(true);
    });
  });
});
