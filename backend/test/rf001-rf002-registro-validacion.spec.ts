import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InstrumentosService } from '../src/modules/instrumentos/instrumentos.service.js';
import { ValidationEngineService } from '../src/modules/instrumentos/validators/validation-engine.service.js';
import { BasculaValidator } from '../src/modules/instrumentos/validators/bascula.validator.js';
import { PesaValidator } from '../src/modules/instrumentos/validators/pesa.validator.js';
import { DinamometroValidator } from '../src/modules/instrumentos/validators/dinamometro.validator.js';
import {
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
  EstadoInstrumento,
} from '../src/schemas/instrumento.schema.js';

describe('🔴 RF001 & RF002 — Registro y Validación Técnica Metrológica (NTC 2031)', () => {
  let instrumentosService: InstrumentosService;
  let validationEngine: ValidationEngineService;
  let mockAuditService: any;
  let mockInstrumentoModel: any;

  beforeEach(() => {
    const basculaValidator = new BasculaValidator();
    const pesaValidator = new PesaValidator();
    const dinamometroValidator = new DinamometroValidator();
    validationEngine = new ValidationEngineService(basculaValidator, pesaValidator, dinamometroValidator);

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    mockInstrumentoModel = class {
      _id = '60d0fe4f5311236168a109aa';
      save = vi.fn().mockResolvedValue(this);
      toObject = vi.fn().mockReturnValue({
        _id: '60d0fe4f5311236168a109aa',
        serial: 'BASC-001',
        marca: 'Torrey',
        modelo: 'L-EQ-5/10',
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 50,
        unidadMedida: UnidadMedida.KG,
        divisionEscala: 0.01,
        numeroDivisionesVerificacion: 5000,
        fechaUltimaCalibracion: new Date('2026-01-01'),
        fechaProximaCalibracion: new Date('2027-01-01'),
        estado: EstadoInstrumento.VIGENTE,
      });
      constructor(dto: any) {
        Object.assign(this, dto);
      }
      static findOne = vi.fn();
      static findById = vi.fn();
      static find = vi.fn();
      static countDocuments = vi.fn();
      static aggregate = vi.fn();
    };

    instrumentosService = new InstrumentosService(
      mockInstrumentoModel as any,
      validationEngine,
      mockAuditService,
    );
  });

  // ==========================================
  // PARTICIÓN DE EQUIVALENCIA — CASOS VÁLIDOS
  // ==========================================
  describe('Partición de Equivalencia (Válidos)', () => {
    it('TC-RF001-01: Registro exitoso de Báscula comercial Clase III con todos los campos obligatorios', async () => {
      mockInstrumentoModel.findOne = vi.fn().mockResolvedValue(null);

      const validBasculaDto = {
        serial: 'BASC-CL3-001',
        marca: 'Torrey',
        modelo: 'L-EQ-5/10',
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 30,
        unidadMedida: UnidadMedida.KG,
        divisionEscala: 0.005,
        codigoPrecintoSIMEL: 'SIMEL-PREC-2026-001',
        fechaUltimaCalibracion: '2026-01-15T00:00:00.000Z',
        fechaProximaCalibracion: '2027-01-15T00:00:00.000Z',
        propietario: {
          nombreRazonSocial: 'Supermercado Central',
          nitRut: '900.123.456-1',
          ciudad: 'Bogotá',
          departamento: 'Cundinamarca',
        },
      };

      const result = await instrumentosService.create(validBasculaDto as any, 'tech_user_01');
      expect(result.serial).toBe('BASC-CL3-001');
      expect(result.numeroDivisionesVerificacion).toBe(6000); // 30 / 0.005
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('TC-RF001-02: Registro exitoso de Pesa Patrón Clase II', async () => {
      mockInstrumentoModel.findOne = vi.fn().mockResolvedValue(null);

      const validPesaDto = {
        serial: 'PESA-F1-10KG',
        marca: 'Mettler Toledo',
        modelo: 'Class F1',
        tipo: TipoInstrumento.PESA,
        categoriaExactitud: CategoriaExactitud.CLASE_II,
        capacidadMaxima: 10,
        unidadMedida: UnidadMedida.KG,
        fechaUltimaCalibracion: '2026-02-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-02-01T00:00:00.000Z',
      };

      const result = await instrumentosService.create(validPesaDto as any, 'tech_user_01');
      expect(result.serial).toBe('PESA-F1-10KG');
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('TC-RF001-03: Registro exitoso de Dinamómetro Clase I', async () => {
      mockInstrumentoModel.findOne = vi.fn().mockResolvedValue(null);

      const validDinamometroDto = {
        serial: 'DIN-50KN-01',
        marca: 'Chatillon',
        modelo: 'DFS-II',
        tipo: TipoInstrumento.DINAMOMETRO,
        categoriaExactitud: CategoriaExactitud.CLASE_I,
        capacidadMaxima: 50,
        unidadMedida: UnidadMedida.KN,
        fechaUltimaCalibracion: '2026-03-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-03-01T00:00:00.000Z',
      };

      const result = await instrumentosService.create(validDinamometroDto as any, 'tech_user_01');
      expect(result.serial).toBe('DIN-50KN-01');
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });
  });

  // ==========================================
  // PARTICIÓN DE EQUIVALENCIA — CASOS INVÁLIDOS
  // ==========================================
  describe('Partición de Equivalencia (Inválidos)', () => {
    it('TC-RF001-04: Serial duplicado debe disparar ConflictException (409)', async () => {
      mockInstrumentoModel.findOne = vi.fn().mockResolvedValue({ serial: 'BASC-EXISTENTE' });

      const duplicateDto = {
        serial: 'BASC-EXISTENTE',
        marca: 'Torrey',
        modelo: 'L-EQ',
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 50,
        unidadMedida: UnidadMedida.KG,
        divisionEscala: 0.01,
        fechaUltimaCalibracion: '2026-01-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-01-01T00:00:00.000Z',
      };

      await expect(instrumentosService.create(duplicateDto as any, 'user_01')).rejects.toThrow(
        ConflictException,
      );
    });

    it('TC-RF002-01: Rechazo de báscula sin división de escala e/d (NTC 2031)', () => {
      const invalidData = {
        serial: 'BASC-NODIV',
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

      const result = validationEngine.validate(invalidData as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'La división de escala (d o e) es obligatoria y mayor a 0 para básculas según NTC 2031.',
      );
    });

    it('TC-RF002-02: Rechazo si el número de divisiones n < 100 para Clase I, II o III', () => {
      const invalidData = {
        serial: 'BASC-BAD-N',
        marca: 'Torrey',
        modelo: 'L-EQ',
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 10,
        unidadMedida: UnidadMedida.KG,
        divisionEscala: 1, // n = 10 / 1 = 10 (< 100)
        fechaUltimaCalibracion: new Date('2026-01-01'),
        fechaProximaCalibracion: new Date('2027-01-01'),
      };

      const result = validationEngine.validate(invalidData as any);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('El número de divisiones de verificación (n = 10) es inferior al mínimo metrológico');
    });
  });

  // ==========================================
  // VALORES LÍMITE (BOUNDARY VALUE ANALYSIS)
  // ==========================================
  describe('Valores Límite (BVA)', () => {
    it('TC-RF001-05: Capacidad máxima = 0 debe ser rechazada', () => {
      const boundaryData = {
        serial: 'BASC-ZERO',
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

      expect(() => validationEngine.assertValid(boundaryData as any)).toThrow(BadRequestException);
    });

    it('TC-RF001-06: Capacidad máxima negativa (< 0) debe ser rechazada', () => {
      const boundaryData = {
        serial: 'BASC-NEG',
        marca: 'Torrey',
        modelo: 'L-EQ',
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: -15,
        unidadMedida: UnidadMedida.KG,
        divisionEscala: 0.01,
        fechaUltimaCalibracion: new Date('2026-01-01'),
        fechaProximaCalibracion: new Date('2027-01-01'),
      };

      expect(() => validationEngine.assertValid(boundaryData as any)).toThrow(BadRequestException);
    });

    it('TC-RF001-07: Fecha próxima calibración anterior o igual a la última debe ser rechazada', () => {
      const boundaryData = {
        serial: 'BASC-DATE-ERR',
        marca: 'Torrey',
        modelo: 'L-EQ',
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 50,
        unidadMedida: UnidadMedida.KG,
        divisionEscala: 0.01,
        fechaUltimaCalibracion: new Date('2026-05-10'),
        fechaProximaCalibracion: new Date('2026-05-10'), // Mismo día
      };

      expect(() => validationEngine.assertValid(boundaryData as any)).toThrow(BadRequestException);
    });
  });

  // ==========================================
  // CONSULTAS Y BÚSQUEDAS
  // ==========================================
  describe('Consultas y Búsquedas', () => {
    it('TC-RF001-08: Búsqueda por serial existente', async () => {
      const mockDoc = {
        _id: '60d0fe4f5311236168a109aa',
        serial: 'BASC-001',
        marca: 'Torrey',
        modelo: 'L-EQ-5/10',
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 50,
        unidadMedida: UnidadMedida.KG,
        estado: EstadoInstrumento.VIGENTE,
        fechaUltimaCalibracion: new Date('2026-01-01'),
        fechaProximaCalibracion: new Date('2027-01-01'),
      };

      mockInstrumentoModel.findOne = vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockDoc),
        }),
      });

      const found = await instrumentosService.findBySerial('BASC-001');
      expect(found).toBeDefined();
      expect(found.serial).toBe('BASC-001');
    });

    it('TC-RF001-09: Búsqueda por serial inexistente debe lanzar NotFoundException (404)', async () => {
      mockInstrumentoModel.findOne = vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(null),
        }),
      });

      await expect(instrumentosService.findBySerial('SERIAL-INEXISTENTE')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('TC-RF001-10: Consulta con filtros vacíos devuelve estructura con 0 resultados sin romper', async () => {
      mockInstrumentoModel.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      });
      mockInstrumentoModel.countDocuments = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(0),
      });

      const result = await instrumentosService.findAll({ search: 'MARCA_DESCONOCIDA' });
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(1);
    });
  });
});
