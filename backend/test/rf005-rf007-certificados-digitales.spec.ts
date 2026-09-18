import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CalibracionesService } from '../src/modules/calibraciones/calibraciones.service.js';
import {
  ResultadoCalibracion,
  EstadoInstrumento,
  TipoAccionAuditoria,
  EntidadAfectada,
  EstadoCertificado,
  TipoCertificado,
} from '../src/schemas/index.js';

describe('🔴 RF005 & RF007 — Certificados Digitales y Calibraciones Metrológicas', () => {
  let calibracionesService: CalibracionesService;
  let mockCalibracionModel: any;
  let mockInstrumentoModel: any;
  let mockInstrumentosService: any;
  let mockAuditService: any;

  const mockInstrumentoDoc = {
    _id: '60d0fe4f5311236168a109aa',
    serial: 'BASC-001',
    marca: 'Torrey',
    modelo: 'L-EQ',
    estado: EstadoInstrumento.POR_VENCER,
    fechaUltimaCalibracion: new Date('2025-01-01'),
    fechaProximaCalibracion: new Date('2026-01-01'),
    save: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    mockInstrumentoDoc.save = vi.fn().mockResolvedValue(true);

    mockInstrumentoModel = {
      findById: vi.fn().mockResolvedValue({ ...mockInstrumentoDoc }),
    };

    mockInstrumentosService = {
      calcularEstado: vi.fn().mockReturnValue(EstadoInstrumento.VIGENTE),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    mockCalibracionModel = class {
      _id = '60d0fe4f5311236168a109bb';
      numeroCertificado = 'CERT-2026-001';
      resultado = ResultadoCalibracion.CONFORME;
      save = vi.fn().mockResolvedValue(this);
      toObject = vi.fn().mockReturnValue({
        _id: '60d0fe4f5311236168a109bb',
        numeroCertificado: 'CERT-2026-001',
        resultado: ResultadoCalibracion.CONFORME,
        fechaCalibracion: new Date('2026-01-01'),
        fechaProximaCalibracion: new Date('2027-01-01'),
      });
      constructor(dto: any) {
        Object.assign(this, dto);
      }
      static findOne = vi.fn();
      static findById = vi.fn();
      static find = vi.fn();
      static countDocuments = vi.fn();
    };

    calibracionesService = new CalibracionesService(
      mockCalibracionModel as any,
      mockInstrumentoModel as any,
      mockInstrumentosService as any,
      mockAuditService as any,
    );
  });

  describe('Emisión de Certificados / Calibración Conforme (Positivo)', () => {
    it('TC-RF007-01: Generar calibración conforme y actualizar estado del instrumento a Vigente', async () => {
      mockCalibracionModel.findOne = vi.fn().mockResolvedValue(null);
      mockCalibracionModel.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            _id: '60d0fe4f5311236168a109bb',
            numeroCertificado: 'CERT-2026-001',
            resultado: ResultadoCalibracion.CONFORME,
            fechaCalibracion: new Date('2026-01-01'),
            fechaProximaCalibracion: new Date('2027-01-01'),
            laboratorioAcreditado: 'ONAC-LAB-01',
            instrumento: { serial: 'BASC-001' },
            tecnico: { nombre: 'Ing. Calibrador' },
          }),
        }),
      });

      const createDto = {
        instrumentoId: '60d0fe4f5311236168a109aa',
        laboratorioAcreditado: 'ONAC-LAB-01',
        numeroCertificado: 'CERT-2026-001',
        fechaCalibracion: '2026-01-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-01-01T00:00:00.000Z',
        resultado: ResultadoCalibracion.CONFORME,
        codigoPrecintoSIMEL: 'PREC-2026-99',
        patronesUtilizados: [
          {
            codigoPatron: 'PAT-01',
            descripcion: 'Pesa patrón 10kg M1',
            certificadoTrazabilidad: 'CERT-PAT-001',
            fechaVencimientoPatron: '2027-06-01T00:00:00.000Z',
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
      };

      const result = await calibracionesService.create(createDto as any, 'tech_123');
      expect(result.numeroCertificado).toBe('CERT-2026-001');
      expect(result.resultado).toBe(ResultadoCalibracion.CONFORME);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: TipoAccionAuditoria.CALIBRATE,
          entityAffected: EntidadAfectada.CALIBRACION,
        }),
      );
    });

    it('TC-RF007-02: Calibración No Conforme debe marcar el instrumento como VENCIDO para bloquear operación', async () => {
      mockCalibracionModel.findOne = vi.fn().mockResolvedValue(null);
      const mockInst = { ...mockInstrumentoDoc, estado: EstadoInstrumento.VIGENTE, save: vi.fn() };
      mockInstrumentoModel.findById = vi.fn().mockResolvedValue(mockInst);
      mockCalibracionModel.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            _id: '60d0fe4f5311236168a109cc',
            numeroCertificado: 'CERT-FALLIDO-001',
            resultado: ResultadoCalibracion.NO_CONFORME,
            instrumento: { serial: 'BASC-001' },
          }),
        }),
      });

      const createDto = {
        instrumentoId: '60d0fe4f5311236168a109aa',
        laboratorioAcreditado: 'ONAC-LAB-01',
        numeroCertificado: 'CERT-FALLIDO-001',
        fechaCalibracion: '2026-01-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-01-01T00:00:00.000Z',
        resultado: ResultadoCalibracion.NO_CONFORME,
      };

      await calibracionesService.create(createDto as any, 'tech_123');
      expect(mockInst.estado).toBe(EstadoInstrumento.VENCIDO);
      expect(mockInst.save).toHaveBeenCalled();
    });
  });

  describe('Reglas de Negocio y Control de Errores (Negativo)', () => {
    it('TC-RF007-03: Rechazar calibración si el instrumento no existe (404)', async () => {
      mockInstrumentoModel.findById = vi.fn().mockResolvedValue(null);

      const createDto = {
        instrumentoId: 'ID_FANTASMA',
        laboratorioAcreditado: 'ONAC-LAB-01',
        numeroCertificado: 'CERT-ERR',
        fechaCalibracion: '2026-01-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-01-01T00:00:00.000Z',
        resultado: ResultadoCalibracion.CONFORME,
      };

      await expect(calibracionesService.create(createDto as any, 'tech_123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('TC-RF007-04: Rechazar si el número de certificado ya existe (409 Conflict)', async () => {
      mockCalibracionModel.findOne = vi.fn().mockResolvedValue({ numeroCertificado: 'CERT-DUPLICADO' });

      const createDto = {
        instrumentoId: '60d0fe4f5311236168a109aa',
        laboratorioAcreditado: 'ONAC-LAB-01',
        numeroCertificado: 'CERT-DUPLICADO',
        fechaCalibracion: '2026-01-01T00:00:00.000Z',
        fechaProximaCalibracion: '2027-01-01T00:00:00.000Z',
        resultado: ResultadoCalibracion.CONFORME,
      };

      await expect(calibracionesService.create(createDto as any, 'tech_123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('TC-RF007-05: Rechazar si la fecha próxima de calibración es anterior o igual a la de calibración', async () => {
      const createDto = {
        instrumentoId: '60d0fe4f5311236168a109aa',
        laboratorioAcreditado: 'ONAC-LAB-01',
        numeroCertificado: 'CERT-DATE-ERR',
        fechaCalibracion: '2026-06-01T00:00:00.000Z',
        fechaProximaCalibracion: '2026-01-01T00:00:00.000Z', // Anterior
        resultado: ResultadoCalibracion.CONFORME,
      };

      await expect(calibracionesService.create(createDto as any, 'tech_123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Histórico y Trazabilidad de Certificados por Instrumento', () => {
    it('TC-RF007-06: Consultar histórico completo de calibraciones y certificados de un instrumento', async () => {
      const mockHistorial = [
        {
          _id: 'cal_1',
          numeroCertificado: 'CERT-2026-001',
          fechaCalibracion: new Date('2026-01-01'),
          resultado: ResultadoCalibracion.CONFORME,
          instrumento: { serial: 'BASC-001' },
          tecnico: { nombre: 'Ing. Juan' },
        },
        {
          _id: 'cal_0',
          numeroCertificado: 'CERT-2025-001',
          fechaCalibracion: new Date('2025-01-01'),
          resultado: ResultadoCalibracion.CONFORME,
          instrumento: { serial: 'BASC-001' },
          tecnico: { nombre: 'Ing. Pedro' },
        },
      ];

      mockCalibracionModel.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockHistorial),
        }),
      });

      const result = await calibracionesService.findByInstrumento('60d0fe4f5311236168a109aa');
      expect(result).toHaveLength(2);
      expect(result[0].numeroCertificado).toBe('CERT-2026-001');
      expect(result[1].numeroCertificado).toBe('CERT-2025-001');
    });
  });
});
