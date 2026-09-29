import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalibracionesService } from './calibraciones.service.js';
import { InstrumentosService } from '../instrumentos/instrumentos.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PdfGeneratorService } from './pdf-generator.service.js';
import {
  Calibracion,
  Instrumento,
  Certificado,
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
    codigoFolio: 'CERT-FOLIO-1234',
    bloqueadoInmutable: true,
    fechaCalibracion: new Date('2026-02-01'),
    fechaProximaCalibracion: new Date('2027-02-01'),
    resultado: ResultadoCalibracion.CONFORME,
    patronesUtilizados: [
      {
        codigoPatron: 'PAT-01',
        descripcion: 'Pesa patrón 10kg M1',
        certificadoTrazabilidad: 'CERT-PAT-001',
        fechaVencimientoPatron: new Date('2027-06-01'),
      },
    ],
    erroresMaximosPermitidos: [
      {
        cargaNominal: 10,
        errorEncontrado: 0.02,
        errorMaximoPermitido: 0.05,
        cumple: true,
      },
    ],
    toObject: vi.fn().mockImplementation(function (this: any) {
      return { ...this };
    }),
    save: vi.fn(),
  };

  const validPatrones = [
    {
      codigoPatron: 'PAT-01',
      descripcion: 'Pesa patrón 10kg M1',
      certificadoTrazabilidad: 'CERT-PAT-001',
      fechaVencimientoPatron: '2027-06-01T00:00:00.000Z',
    },
  ];

  const validErrores = [
    {
      cargaNominal: 10,
      errorEncontrado: 0.02,
      errorMaximoPermitido: 0.05,
      cumple: true,
    },
  ];

  class MockCalibracionModel {
    _id = '60d0fe4f5311236168a109bb';
    numeroCertificado = 'CERT-2026-001';
    codigoFolio = 'CERT-FOLIO-1234';
    bloqueadoInmutable = true;
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

  class MockCertificadoModel {
    save = vi.fn().mockResolvedValue(this);
    constructor(dto: any) {
      Object.assign(this, dto);
    }
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
        PdfGeneratorService,
        {
          provide: getModelToken(Calibracion.name),
          useValue: MockCalibracionModel,
        },
        {
          provide: getModelToken(Instrumento.name),
          useValue: MockInstrumentoModel,
        },
        {
          provide: getModelToken(Certificado.name),
          useValue: MockCertificadoModel,
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

  describe('create (Registro de Calibración & HU-04)', () => {
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
        patronesUtilizados: validPatrones,
        erroresMaximosPermitidos: validErrores,
      };

      const result = await service.create(createDto as any, 'user_tecnico_123', '127.0.0.1', 'Vitest');

      expect(result).toHaveProperty('numeroCertificado', 'CERT-2026-001');
      expect(instCopy.save).toHaveBeenCalled();
      expect(instCopy.estado).toBe(EstadoInstrumento.VIGENTE);
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('HU-04: debe bloquear emisión si falta patronesUtilizados (completitud)', async () => {
      MockInstrumentoModel.findById.mockResolvedValue(mockInstrumentoDoc);

      const incompleteDto = {
        instrumentoId: '60d0fe4f5311236168a109aa',
        laboratorioAcreditado: 'Lab',
        numeroCertificado: 'CERT-INCOMPLETE-1',
        fechaCalibracion: '2026-02-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-02-01T00:00:00.000Z',
        resultado: ResultadoCalibracion.CONFORME,
        patronesUtilizados: [],
        erroresMaximosPermitidos: validErrores,
      };

      await expect(service.create(incompleteDto as any, 'user_123')).rejects.toThrow(BadRequestException);
    });

    it('HU-04: debe bloquear emisión si falta erroresMaximosPermitidos (completitud)', async () => {
      MockInstrumentoModel.findById.mockResolvedValue(mockInstrumentoDoc);

      const incompleteDto = {
        instrumentoId: '60d0fe4f5311236168a109aa',
        laboratorioAcreditado: 'Lab',
        numeroCertificado: 'CERT-INCOMPLETE-2',
        fechaCalibracion: '2026-02-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-02-01T00:00:00.000Z',
        resultado: ResultadoCalibracion.CONFORME,
        patronesUtilizados: validPatrones,
        erroresMaximosPermitidos: [],
      };

      await expect(service.create(incompleteDto as any, 'user_123')).rejects.toThrow(BadRequestException);
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
        patronesUtilizados: validPatrones,
        erroresMaximosPermitidos: validErrores,
      };

      await expect(service.create(createDto as any, 'user_123')).rejects.toThrow(NotFoundException);
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
        patronesUtilizados: validPatrones,
        erroresMaximosPermitidos: validErrores,
      };

      await expect(service.create(createDto as any, 'user_123')).rejects.toThrow(BadRequestException);
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
        patronesUtilizados: validPatrones,
        erroresMaximosPermitidos: validErrores,
      };

      await expect(service.create(createDto as any, 'user_123')).rejects.toThrow(ConflictException);
    });
  });

  describe('Inmutabilidad (HU-04 Criterio 3)', () => {
    it('debe rechazar modificación (update) de certificado sellado/inmutable con ForbiddenException', async () => {
      const immutableDoc = {
        ...mockCalibracionDoc,
        bloqueadoInmutable: true,
        toObject: vi.fn().mockReturnValue(mockCalibracionDoc),
      };
      MockCalibracionModel.findById.mockResolvedValue(immutableDoc);

      await expect(
        service.update('60d0fe4f5311236168a109bb', { observaciones: 'Cambio no autorizado' } as any, 'user_123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe rechazar eliminación (delete) de certificado sellado/inmutable con ForbiddenException', async () => {
      const immutableDoc = {
        ...mockCalibracionDoc,
        bloqueadoInmutable: true,
        toObject: vi.fn().mockReturnValue(mockCalibracionDoc),
      };
      MockCalibracionModel.findById.mockResolvedValue(immutableDoc);

      await expect(service.delete('60d0fe4f5311236168a109bb', 'user_admin_123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Generación de PDF con QR dinámico (HU-04 Criterio 2)', () => {
    it('debe generar un buffer PDF válido con identificador de certificado y QR', async () => {
      const queryPopulateMock = {
        populate: vi.fn().mockReturnThis(),
      };
      queryPopulateMock.populate.mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          ...mockCalibracionDoc,
          instrumento: mockInstrumentoDoc,
          tecnico: { nombre: 'Ing. Calibrador' },
        }),
      });
      MockCalibracionModel.findById.mockReturnValue(queryPopulateMock);

      const pdfBuffer = await service.generatePdf('60d0fe4f5311236168a109bb');
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.toString('utf-8')).toContain('%PDF-1.4');
      expect(pdfBuffer.toString('utf-8')).toContain('CERT-2026-001');
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
