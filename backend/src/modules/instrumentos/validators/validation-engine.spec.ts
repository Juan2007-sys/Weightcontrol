import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ValidationEngineService } from './validation-engine.service.js';
import { BasculaValidator } from './bascula.validator.js';
import { PesaValidator } from './pesa.validator.js';
import { DinamometroValidator } from './dinamometro.validator.js';
import {
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
} from '../../../schemas/instrumento.schema.js';

describe('ValidationEngineService (NTC 2031 & OCP)', () => {
  let service: ValidationEngineService;

  beforeEach(() => {
    const basculaValidator = new BasculaValidator();
    const pesaValidator = new PesaValidator();
    const dinamometroValidator = new DinamometroValidator();
    service = new ValidationEngineService(basculaValidator, pesaValidator, dinamometroValidator);
  });

  describe('Validación de Básculas (IPFNA - NTC 2031)', () => {
    it('debe validar exitosamente una báscula conforme', () => {
      const validData = {
        serial: 'BASC-001',
        marca: 'Torrey',
        modelo: 'L-EQ-5/10',
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 50,
        unidadMedida: UnidadMedida.KG,
        divisionEscala: 0.01,
        fechaUltimaCalibracion: new Date('2026-01-01'),
        fechaProximaCalibracion: new Date('2027-01-01'),
      };

      const result = service.validate(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(() => service.assertValid(validData)).not.toThrow();
    });

    it('debe rechazar báscula con capacidad máxima <= 0', () => {
      const invalidData = {
        serial: 'BASC-002',
        marca: 'Torrey',
        modelo: 'L-EQ',
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 0,
        unidadMedida: UnidadMedida.KG,
        divisionEscala: 0.01,
        fechaUltimaCalibracion: new Date('2026-01-01'),
        fechaProximaCalibracion: new Date('2027-01-01'),
      };

      expect(() => service.assertValid(invalidData)).toThrow(BadRequestException);
    });

    it('debe rechazar báscula sin división de escala (d o e)', () => {
      const invalidData = {
        serial: 'BASC-003',
        marca: 'Torrey',
        modelo: 'L-EQ',
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 50,
        unidadMedida: UnidadMedida.KG,
        divisionEscala: undefined,
        fechaUltimaCalibracion: new Date('2026-01-01'),
        fechaProximaCalibracion: new Date('2027-01-01'),
      };

      expect(() => service.assertValid(invalidData)).toThrow(BadRequestException);
    });

    it('debe rechazar si la fecha próxima es anterior o igual a la última calibración', () => {
      const invalidData = {
        serial: 'BASC-004',
        marca: 'Torrey',
        modelo: 'L-EQ',
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 50,
        unidadMedida: UnidadMedida.KG,
        divisionEscala: 0.01,
        fechaUltimaCalibracion: new Date('2026-06-01'),
        fechaProximaCalibracion: new Date('2026-01-01'),
      };

      expect(() => service.assertValid(invalidData)).toThrow(BadRequestException);
    });
  });

  describe('Validación de Pesas Patrón', () => {
    it('debe validar exitosamente una pesa patrón conforme', () => {
      const validData = {
        serial: 'PESA-M1-001',
        marca: 'Mettler Toledo',
        modelo: 'M1-10KG',
        tipo: TipoInstrumento.PESA,
        categoriaExactitud: CategoriaExactitud.CLASE_II,
        capacidadMaxima: 10,
        unidadMedida: UnidadMedida.KG,
        fechaUltimaCalibracion: new Date('2026-01-01'),
        fechaProximaCalibracion: new Date('2027-01-01'),
      };

      const result = service.validate(validData);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Validación de Dinamómetros', () => {
    it('debe validar exitosamente un dinamómetro conforme', () => {
      const validData = {
        serial: 'DIN-50KN',
        marca: 'Chatillon',
        modelo: 'DFS-II',
        tipo: TipoInstrumento.DINAMOMETRO,
        categoriaExactitud: CategoriaExactitud.CLASE_I,
        capacidadMaxima: 50,
        unidadMedida: UnidadMedida.KN,
        fechaUltimaCalibracion: new Date('2026-01-01'),
        fechaProximaCalibracion: new Date('2027-01-01'),
      };

      const result = service.validate(validData);
      expect(result.isValid).toBe(true);
    });
  });
});
