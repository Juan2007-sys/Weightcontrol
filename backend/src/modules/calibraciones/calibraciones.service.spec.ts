import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalibracionesService } from './calibraciones.service.js';
import { InstrumentosService } from '../instrumentos/instrumentos.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  Calibracion,
  Instrumento,
  ResultadoCalibracion,
  EstadoInstrumento,
} from '../../schemas/index.js';

describe('CalibracionesService', () => {
  let service: CalibracionesService;
  let mockInstrumentosService: any;
  let mockAuditService: any;

  const mockInstrumentoDoc = {
    _id: '60d0fe4f5311236168a109aa',
    serial: 'BASC-001',
    marca: 'Torrey',
    modelo: 'L-EQ-5/10',
    estado: EstadoInstrumento.VENCIDO,
    fechaUltimaCalibracion: new Date('2025-01-01'),
    fechaProximaCalibracion: new Date('2026-01-01'),
    save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
  };

  const mockCalibracionDoc = {
    _id: '60d0fe4f5311236168a109bb',
    instrumento: '60d0fe4f5311236168a109aa',
    tecnico: 'user_tecnico_123',
    laboratorioAcreditado: 'Laboratorio Metrológico Nacional',
    numeroCertificado: 'CERT-2026-001',
    fechaCalibracion: new Date('2026-02-01'),
    fechaProximaCalibracion: new Date('2027-02-01'),
    resultado: ResultadoCalibracion.CONFORME,
    patronesUtilizados: [],
    erroresMaximosPermitidos: [],
    toObject: vi.fn().mockImplementation(function (this: any) {
      return { ...this };
    }),
    save: vi.fn(),
  };

  class MockCalibracionModel {
    _id = '60d0fe4f5311236168a109bb';
    save = vi.fn().mockResolvedValue(this);
    toObject = vi.fn().mockReturnValue(mockCalibracionDoc);
    constructor(dto: any) {
      Object.assign(this, dto);
      this._id = '60d0fe4f5311236168a109bb';
      this.save = vi.fn().mockResolvedValue(this);
      this.toObject = vi.fn().mockReturnValue({ ...this, _id: '60d0fe4f5311236168a109bb' });
    }
    static findOne = vi.fn();
    static findById = vi.fn();
    static find = vi.fn();
    static countDocuments = vi.fn();
    static findByIdAndDelete = vi.fn();
  }

  class MockInstrumentoModel {
    static findById = vi.fn();
  }

  beforeEach(async () => {
    vi.clearAllMocks();

    MockCalibracionModel.findOne = vi.fn();
    MockCalibracionModel.findById = vi.fn();
    MockCalibracionModel.find = vi.fn();
    MockCalibracionModel.countDocuments = vi.fn();
    MockCalibracionModel.findByIdAndDelete = vi.fn();
    MockInstrumentoModel.findById = vi.fn();

    mockInstrumentosService = {
      calcularEstado: vi.fn().mockReturnValue(EstadoInstrumento.VIGENTE),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalibracionesService,
        {
          provide: getModelToken(Calibracion.name),
          useValue: MockCalibracionModel,
        },
        {
          provide: getModelToken(Instrumento.name),
          useValue: MockInstrumentoModel,
        },
        {
          provide: InstrumentosService,
          useValue: mockInstrumentosService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<CalibracionesService>(CalibracionesService);
  });

  describe('create (Registro de Calibración)', () => {
    it('debe registrar una calibración conforme y actualizar el estado del instrumento a Vigente', async () => {
      const instCopy = { ...mockInstrumentoDoc, save: vi.fn().mockResolvedValue(true) };
      MockInstrumentoModel.findById.mockResolvedValue(instCopy);
      MockCalibracionModel.findOne.mockResolvedValue(null);

      const queryPopulateMock = {
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn(),
      };
      queryPopulateMock.populate.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockCalibracionDoc),
      });
      MockCalibracionModel.findById.mockReturnValue(queryPopulateMock);

      const createDto = {
        instrumentoId: '60d0fe4f5311236168a109aa',
        laboratorioAcreditado: 'Laboratorio Metrológico Nacional',
        numeroCertificado: 'CERT-2026-001',
        fechaCalibracion: '2026-02-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-02-01T00:00:00.000Z',
        resultado: ResultadoCalibracion.CONFORME,
      };

      const result = await service.create(createDto, 'user_tecnico_123', '127.0.0.1', 'Vitest');

      expect(result).toHaveProperty('numeroCertificado', 'CERT-2026-001');
      expect(instCopy.save).toHaveBeenCalled();
      expect(instCopy.estado).toBe(EstadoInstrumento.VIGENTE);
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si el instrumento no existe', async () => {
      MockInstrumentoModel.findById.mockResolvedValue(null);

      const createDto = {
        instrumentoId: 'instrumento_inexistente',
        laboratorioAcreditado: 'Lab',
        numeroCertificado: 'CERT-001',
        fechaCalibracion: '2026-02-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-02-01T00:00:00.000Z',
        resultado: ResultadoCalibracion.CONFORME,
      };

      await expect(service.create(createDto, 'user_123')).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si la fecha proxima es menor a la de calibracion', async () => {
      MockInstrumentoModel.findById.mockResolvedValue(mockInstrumentoDoc);

      const createDto = {
        instrumentoId: '60d0fe4f5311236168a109aa',
        laboratorioAcreditado: 'Lab',
        numeroCertificado: 'CERT-001',
        fechaCalibracion: '2026-06-01T00:00:00.000Z',
        fechaProximaCalibracion: '2026-01-01T00:00:00.000Z',
        resultado: ResultadoCalibracion.CONFORME,
      };

      await expect(service.create(createDto, 'user_123')).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar ConflictException si el número de certificado ya existe', async () => {
      MockInstrumentoModel.findById.mockResolvedValue(mockInstrumentoDoc);
      MockCalibracionModel.findOne.mockResolvedValue(mockCalibracionDoc);

      const createDto = {
        instrumentoId: '60d0fe4f5311236168a109aa',
        laboratorioAcreditado: 'Lab',
        numeroCertificado: 'CERT-2026-001',
        fechaCalibracion: '2026-01-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-01-01T00:00:00.000Z',
        resultado: ResultadoCalibracion.CONFORME,
      };

      await expect(service.create(createDto, 'user_123')).rejects.toThrow(ConflictException);
    });
  });

  describe('findByInstrumento', () => {
    it('debe listar el historial de calibraciones del instrumento', async () => {
      const queryMock = {
        sort: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
      };
      queryMock.populate.mockReturnValue({
        populate: vi.fn().mockResolvedValue([mockCalibracionDoc]),
      });
      MockCalibracionModel.find.mockReturnValue(queryMock);

      const result = await service.findByInstrumento('60d0fe4f5311236168a109aa');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('numeroCertificado', 'CERT-2026-001');
    });
  });
});
