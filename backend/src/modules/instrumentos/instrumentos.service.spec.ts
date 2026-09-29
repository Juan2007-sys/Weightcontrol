import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstrumentosService } from './instrumentos.service.js';
import { ValidationEngineService } from './validators/validation-engine.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  Instrumento,
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
  EstadoInstrumento,
} from '../../schemas/instrumento.schema.js';

describe('InstrumentosService', () => {
  let service: InstrumentosService;
  let mockValidationEngine: any;
  let mockAuditService: any;

  const mockInstrumentoDoc = {
    _id: '60d0fe4f5311236168a109aa',
    serial: 'BASC-001',
    marca: 'Torrey',
    modelo: 'L-EQ-5/10',
    tipo: TipoInstrumento.BASCULA,
    categoriaExactitud: CategoriaExactitud.CLASE_III,
    capacidadMaxima: 50,
    capacidadMinima: 0.2,
    unidadMedida: UnidadMedida.KG,
    divisionEscala: 0.01,
    numeroDivisionesVerificacion: 5000,
    evidenciasFotograficas: {
      fotoEquipo: 'https://cdn.example.com/foto-eq.jpg',
      fotoPrecinto: 'https://cdn.example.com/foto-prec.jpg',
      fotoUbicacion: 'https://cdn.example.com/foto-ub.jpg',
    },
    propietario: {
      nombreRazonSocial: 'Supermercado Los Andes S.A.S.',
      nitRut: '900.123.456-7',
      direccion: 'Calle 100 # 15-20',
      ciudad: 'Bogotá D.C.',
      departamento: 'Cundinamarca',
    },
    fechaUltimaCalibracion: new Date('2026-01-01'),
    fechaProximaCalibracion: new Date('2027-01-01'),
    estado: EstadoInstrumento.VIGENTE,
    creadoPor: 'user_123',
    actualizadoPor: 'user_123',
    toObject: vi.fn().mockImplementation(function (this: any) {
      return { ...this };
    }),
    save: vi.fn(),
  };

  class MockInstrumentoModel {
    _id = '60d0fe4f5311236168a109aa';
    serial = 'BASC-001';
    save = vi.fn().mockResolvedValue(this);
    toObject = vi.fn().mockReturnValue(mockInstrumentoDoc);
    constructor(dto: any) {
      Object.assign(this, dto);
      this._id = '60d0fe4f5311236168a109aa';
      this.save = vi.fn().mockResolvedValue(this);
      this.toObject = vi.fn().mockReturnValue({ ...this, _id: '60d0fe4f5311236168a109aa' });
    }
    static findOne = vi.fn();
    static findById = vi.fn();
    static findByIdAndDelete = vi.fn();
    static find = vi.fn();
    static countDocuments = vi.fn();
    static aggregate = vi.fn();
  }

  beforeEach(async () => {
    vi.clearAllMocks();

    MockInstrumentoModel.findOne = vi.fn();
    MockInstrumentoModel.findById = vi.fn();
    MockInstrumentoModel.findByIdAndDelete = vi.fn();
    MockInstrumentoModel.find = vi.fn();
    MockInstrumentoModel.countDocuments = vi.fn();
    MockInstrumentoModel.aggregate = vi.fn();

    mockValidationEngine = {
      assertValid: vi.fn(),
      validate: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstrumentosService,
        {
          provide: getModelToken(Instrumento.name),
          useValue: MockInstrumentoModel,
        },
        {
          provide: ValidationEngineService,
          useValue: mockValidationEngine,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<InstrumentosService>(InstrumentosService);
  });

  describe('calcularEstado', () => {
    it('debe marcar como VENCIDO si la fecha proxima ya paso', () => {
      const fechaPasada = new Date('2020-01-01');
      const estado = service.calcularEstado(fechaPasada);
      expect(estado).toBe(EstadoInstrumento.VENCIDO);
    });

    it('debe marcar como POR_VENCER si esta dentro de los 30 dias', () => {
      const fechaDentroDe10Dias = new Date();
      fechaDentroDe10Dias.setDate(fechaDentroDe10Dias.getDate() + 10);
      const estado = service.calcularEstado(fechaDentroDe10Dias);
      expect(estado).toBe(EstadoInstrumento.POR_VENCER);
    });

    it('debe marcar como VIGENTE si falta mas de 30 dias', () => {
      const fechaEn1Ano = new Date();
      fechaEn1Ano.setFullYear(fechaEn1Ano.getFullYear() + 1);
      const estado = service.calcularEstado(fechaEn1Ano);
      expect(estado).toBe(EstadoInstrumento.VIGENTE);
    });
  });

  describe('create (HU-01 & HU-02)', () => {
    it('debe registrar un instrumento exitosamente con fotos y registrar auditoria', async () => {
      MockInstrumentoModel.findOne.mockResolvedValue(null);

      const createDto = {
        serial: 'basc-001',
        marca: 'Torrey',
        modelo: 'L-EQ-5/10',
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 50,
        capacidadMinima: 0.2,
        unidadMedida: UnidadMedida.KG,
        divisionEscala: 0.01,
        evidenciasFotograficas: {
          fotoEquipo: 'https://cdn.example.com/eq.jpg',
          fotoPrecinto: 'https://cdn.example.com/prec.jpg',
          fotoUbicacion: 'https://cdn.example.com/ub.jpg',
        },
        fechaUltimaCalibracion: '2026-01-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-01-01T00:00:00.000Z',
      };

      const result = await service.create(createDto as any, 'user_123', '127.0.0.1', 'Vitest');

      expect(result).toHaveProperty('serial', 'BASC-001');
      expect(mockValidationEngine.assertValid).toHaveBeenCalled();
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('HU-02: debe lanzar ConflictException si el serial ya existe en la consulta previa', async () => {
      MockInstrumentoModel.findOne.mockResolvedValue(mockInstrumentoDoc);

      const createDto = {
        serial: 'BASC-001',
        marca: 'Torrey',
        modelo: 'L-EQ-5/10',
        tipo: TipoInstrumento.BASCULA,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 50,
        unidadMedida: UnidadMedida.KG,
        divisionEscala: 0.01,
        fechaUltimaCalibracion: '2026-01-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-01-01T00:00:00.000Z',
      };

      await expect(service.create(createDto as any, 'user_123')).rejects.toThrow(ConflictException);
    });

    it('HU-02: debe capturar error E11000 de MongoDB y lanzar ConflictException', async () => {
      MockInstrumentoModel.findOne.mockResolvedValue(null);

      // Simular constructor y save arrojando error E11000
      const createDto = {
        serial: 'BASC-DUP-MONGO',
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

      // Mock save to throw E11000
      const errorE11000: any = new Error('E11000 duplicate key error collection: weightcontrol.instrumentos index: serial_1 dup key');
      errorE11000.code = 11000;

      const OrigMock = MockInstrumentoModel;
      class FailingMockModel extends OrigMock {
        override save = vi.fn().mockRejectedValue(errorE11000);
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          InstrumentosService,
          {
            provide: getModelToken(Instrumento.name),
            useValue: FailingMockModel,
          },
          {
            provide: ValidationEngineService,
            useValue: mockValidationEngine,
          },
          {
            provide: AuditService,
            useValue: mockAuditService,
          },
        ],
      }).compile();

      const testService = module.get<InstrumentosService>(InstrumentosService);
      await expect(testService.create(createDto as any, 'user_123')).rejects.toThrow(ConflictException);
    });
  });

  describe('HU-05: Consulta Pública Sanitizada (Habeas Data)', () => {
    it('debe retornar únicamente información pública sin filtrar datos sensibles del propietario ni creador', async () => {
      MockInstrumentoModel.findOne.mockResolvedValue(mockInstrumentoDoc);

      const publicDto = await service.verifyPublic('BASC-001');

      // Campos metrológicos públicos permitidos
      expect(publicDto.serial).toBe('BASC-001');
      expect(publicDto.marca).toBe('Torrey');
      expect(publicDto.modelo).toBe('L-EQ-5/10');
      expect(publicDto.tipo).toBe(TipoInstrumento.BASCULA);
      expect(publicDto.categoriaExactitud).toBe(CategoriaExactitud.CLASE_III);
      expect(publicDto.estadoMetrologico).toBe(EstadoInstrumento.VIGENTE);
      expect(publicDto.esVigente).toBe(true);
      expect(publicDto.mensajeVerificacion).toContain('RUMP');

      // Protección de datos personales (Habeas Data): NINGÚN dato de propietario expuesto
      expect((publicDto as any).propietario).toBeUndefined();
      expect((publicDto as any).nit).toBeUndefined();
      expect((publicDto as any).creadoPor).toBeUndefined();
      expect((publicDto as any).actualizadoPor).toBeUndefined();
      expect((publicDto as any).establecimiento).toBeUndefined();
    });

    it('debe lanzar NotFoundException con mensaje certificado no verificable si el serial no existe', async () => {
      MockInstrumentoModel.findOne.mockResolvedValue(null);

      await expect(service.verifyPublic('SERIAL_INEXISTENTE')).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.verifyPublic('SERIAL_INEXISTENTE')).rejects.toThrow(
        /certificado no verificable/i,
      );
    });
  });

  describe('findAll (HU-03 Consulta y Paginacion)', () => {
    it('debe retornar resultados paginados con metadata', async () => {
      const mockQueryChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([mockInstrumentoDoc]),
      };
      MockInstrumentoModel.find.mockReturnValue(mockQueryChain);
      MockInstrumentoModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const query = { page: 1, limit: 10, search: 'Torrey' };
      const result = await service.findAll(query);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(false);
    });
  });

  describe('getStats (HU-03 Resumen Metrológico)', () => {
    it('debe retornar métricas consolidadas', async () => {
      MockInstrumentoModel.countDocuments.mockResolvedValue(15);
      MockInstrumentoModel.aggregate
        .mockResolvedValueOnce([{ _id: EstadoInstrumento.VIGENTE, count: 10 }])
        .mockResolvedValueOnce([{ _id: TipoInstrumento.BASCULA, count: 8 }])
        .mockResolvedValueOnce([{ _id: CategoriaExactitud.CLASE_III, count: 12 }]);

      const stats = await service.getStats();

      expect(stats.total).toBe(15);
      expect(stats.porEstado.vigentes).toBe(10);
      expect(stats.porTipo.basculas).toBe(8);
      expect(stats.porCategoriaExactitud.claseIII).toBe(12);
    });
  });

  describe('update', () => {
    it('debe actualizar el instrumento correctamente', async () => {
      const doc = {
        ...mockInstrumentoDoc,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };
      MockInstrumentoModel.findById.mockResolvedValue(doc);
      MockInstrumentoModel.findOne.mockResolvedValue(null);

      const updateDto = {
        marca: 'Torrey Modificado',
      };

      const result = await service.update('60d0fe4f5311236168a109aa', updateDto, 'user_123');

      expect(result).toHaveProperty('marca', 'Torrey Modificado');
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si no existe el instrumento', async () => {
      MockInstrumentoModel.findById.mockResolvedValue(null);

      await expect(
        service.update('no_existe', { marca: 'Test' }, 'user_123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('debe eliminar el instrumento y registrar evento de auditoria', async () => {
      MockInstrumentoModel.findById.mockResolvedValue(mockInstrumentoDoc);
      MockInstrumentoModel.findByIdAndDelete.mockResolvedValue(mockInstrumentoDoc);

      const result = await service.delete('60d0fe4f5311236168a109aa', 'user_123');

      expect(result).toHaveProperty('id', '60d0fe4f5311236168a109aa');
      expect(MockInstrumentoModel.findByIdAndDelete).toHaveBeenCalledWith('60d0fe4f5311236168a109aa');
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });
  });
});
