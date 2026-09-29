import { describe, it, expect } from 'vitest';
import { BasculaValidator } from '../src/modules/instrumentos/validators/bascula.validator.js';
import {
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
} from '../src/schemas/instrumento.schema.js';

describe('🔬 HU-01 & HU-02: Pruebas Unitarias de Fórmulas Matemáticas, Capacidades y Evidencias', () => {
  const validator = new BasculaValidator();

  describe('📐 Fórmulas Matemáticas Metrológicas (HU-02 Criterio 4)', () => {
    // 1. Rango de capacidad: R = C_max - C_min
    const calcularRango = (cMax: number, cMin: number) => Number((cMax - cMin).toFixed(4));

    // 2. Promedio de capacidad: C_prom = (C_max + C_min) / 2
    const calcularPromedio = (cMax: number, cMin: number) => Number(((cMax + cMin) / 2).toFixed(4));

    // 3. Porcentaje de diferencia respecto a la máxima: P = ((C_max - C_min) / C_max) * 100
    const calcularPorcentajeDiferencia = (cMax: number, cMin: number) => {
      if (cMax <= 0) return 0;
      return Number((((cMax - cMin) / cMax) * 100).toFixed(2));
    };

    it('Fórmula 1 (Rango): R = C_max - C_min debe calcular la amplitud operativa exacta', () => {
      expect(calcularRango(30, 0.1)).toBe(29.9);
      expect(calcularRango(150, 5)).toBe(145);
      expect(calcularRango(5000, 20)).toBe(4980);
      expect(calcularRango(0.5, 0.005)).toBe(0.495);
    });

    it('Fórmula 2 (Promedio): C_prom = (C_max + C_min) / 2 debe calcular el punto medio de carga', () => {
      expect(calcularPromedio(30, 0.1)).toBe(15.05);
      expect(calcularPromedio(100, 10)).toBe(55);
      expect(calcularPromedio(5000, 20)).toBe(2510);
      expect(calcularPromedio(1, 0.1)).toBe(0.55);
    });

    it('Fórmula 3 (Porcentaje): P = ((C_max - C_min) / C_max) * 100 debe calcular la cobertura relativa respecto a Max', () => {
      // Si C_max = 100 y C_min = 10 -> (90 / 100) * 100 = 90%
      expect(calcularPorcentajeDiferencia(100, 10)).toBe(90);

      // Si C_max = 30 y C_min = 0.1 -> (29.9 / 30) * 100 = 99.67%
      expect(calcularPorcentajeDiferencia(30, 0.1)).toBe(99.67);

      // Si C_max = 50 y C_min = 25 -> (25 / 50) * 100 = 50%
      expect(calcularPorcentajeDiferencia(50, 25)).toBe(50);
    });
  });

  describe('⚖️ Consistencia de Capacidades y NTC 2031 (HU-02 Criterios 2 y 3)', () => {
    it('Debe rechazar si Capacidad Mínima >= Capacidad Máxima (C_min = C_max)', () => {
      const data = {
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 30,
        capacidadMinima: 30, // C_min == C_max
        divisionEscala: 0.005,
      };

      const result = validator.validate(data as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Inconsistencia de capacidades'))).toBe(true);
    });

    it('Debe rechazar si Capacidad Mínima > Capacidad Máxima (C_min > C_max)', () => {
      const data = {
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 30,
        capacidadMinima: 35, // C_min > C_max
        divisionEscala: 0.005,
      };

      const result = validator.validate(data as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Inconsistencia de capacidades'))).toBe(true);
    });

    it('Debe validar escalones metrológicos NTC 2031 para Clase III (500 <= n <= 10.000)', () => {
      // n = 30 / 0.005 = 6000 escalones (Conforme para Clase III)
      const validData = {
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 30,
        capacidadMinima: 0.1,
        divisionEscala: 0.005,
      };
      const validResult = validator.validate(validData as any);
      expect(validResult.isValid).toBe(true);

      // n = 10 / 1 = 10 escalones (Rechazado para Clase III: < 500)
      const invalidData = {
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 10,
        capacidadMinima: 0.1,
        divisionEscala: 1,
      };
      const invalidResult = validator.validate(invalidData as any);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0]).toContain('inferior al mínimo metrológico para Básculas Clase III');
    });
  });

  describe('📸 Evidencias Fotográficas Obligatorias (HU-01 Criterio 2)', () => {
    it('Debe rechazar el instrumento si falta la foto del equipo', () => {
      const data = {
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 30,
        capacidadMinima: 0.1,
        divisionEscala: 0.005,
        evidenciasFotograficas: {
          fotoEquipo: '', // Vacío
          fotoPrecinto: 'https://cdn.example.com/precinto.jpg',
          fotoUbicacion: 'https://cdn.example.com/ubicacion.jpg',
        },
      };

      const result = validator.validate(data as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('La evidencia fotográfica del equipo es requerida.');
    });

    it('Debe rechazar el instrumento si falta la foto del precinto', () => {
      const data = {
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 30,
        capacidadMinima: 0.1,
        divisionEscala: 0.005,
        evidenciasFotograficas: {
          fotoEquipo: 'https://cdn.example.com/equipo.jpg',
          fotoPrecinto: '', // Vacío
          fotoUbicacion: 'https://cdn.example.com/ubicacion.jpg',
        },
      };

      const result = validator.validate(data as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('La evidencia fotográfica del precinto es requerida.');
    });

    it('Debe rechazar el instrumento si falta la foto de ubicación', () => {
      const data = {
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 30,
        capacidadMinima: 0.1,
        divisionEscala: 0.005,
        evidenciasFotograficas: {
          fotoEquipo: 'https://cdn.example.com/equipo.jpg',
          fotoPrecinto: 'https://cdn.example.com/precinto.jpg',
          fotoUbicacion: '', // Vacío
        },
      };

      const result = validator.validate(data as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('La evidencia fotográfica de la ubicación física es requerida.');
    });

    it('Debe ser conforme cuando las 3 evidencias fotográficas son provistas', () => {
      const data = {
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 30,
        capacidadMinima: 0.1,
        divisionEscala: 0.005,
        evidenciasFotograficas: {
          fotoEquipo: 'https://cdn.example.com/equipo.jpg',
          fotoPrecinto: 'https://cdn.example.com/precinto.jpg',
          fotoUbicacion: 'https://cdn.example.com/ubicacion.jpg',
        },
      };

      const result = validator.validate(data as any);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
